#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 3 || $# -gt 4 ]]; then
    echo "usage: $0 <release-version> <source-revision> <output-dir> [wrapper-dir]" >&2
    exit 2
fi

release_version="$1"
source_revision="$2"
output_dir="$3"
wrapper_dir="${4:-apps/web-wrapper}"

safe_version="$(printf '%s' "${release_version}" | tr -c 'A-Za-z0-9._-' '-')"
if [[ -z "${safe_version}" || "${safe_version}" == -* ]]; then
    echo "release version must contain a letter or number" >&2
    exit 2
fi
if [[ ! "${source_revision}" =~ ^[0-9a-fA-F]{40}$ ]]; then
    echo "source revision must be a full 40-character commit ID" >&2
    exit 2
fi

required_files=(
    "index.html"
    "room-entry.html"
    "game/index.html"
    "game/index.js"
    "game/index.wasm"
)
for relative_path in "${required_files[@]}"; do
    if [[ ! -f "${wrapper_dir}/${relative_path}" ]]; then
        echo "missing required web release file: ${wrapper_dir}/${relative_path}" >&2
        exit 1
    fi
done

versioned_pack="$(node -e '
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[1], "utf8");
const match = html.match(/const GODOT_CONFIG = (\{.*?\});/);
if (match === null) process.exit(1);
const mainPack = JSON.parse(match[1]).mainPack;
if (typeof mainPack !== "string" || !/^index-[A-Za-z0-9_.-]+\.pck$/.test(mainPack)) process.exit(1);
process.stdout.write(mainPack);
' "${wrapper_dir}/game/index.html")" || {
    echo "exported game/index.html does not reference a versioned Godot pack" >&2
    exit 1
}
if [[ ! -f "${wrapper_dir}/game/${versioned_pack}" ]]; then
    echo "missing versioned Godot pack: ${wrapper_dir}/game/${versioned_pack}" >&2
    exit 1
fi

mkdir -p "${output_dir}"

bundle_root="evanopolis-v1-web-${safe_version}"
archive_name="${bundle_root}.tar.gz"
archive_path="${output_dir}/${archive_name}"
manifest_path="${output_dir}/web-release-manifest.json"
checksums_path="${output_dir}/SHA256SUMS"

tar \
    --sort=name \
    --mtime='UTC 1970-01-01' \
    --owner=0 \
    --group=0 \
    --numeric-owner \
    --exclude='./README.md' \
    --exclude='./test' \
    --exclude='./game/.gitkeep' \
    --exclude='./game/index.pck' \
    --transform="s#^\.#${bundle_root}#" \
    -czf "${archive_path}" \
    -C "${wrapper_dir}" \
    .

archive_sha256="$(sha256sum "${archive_path}" | cut -d ' ' -f 1)"
build_version="$(tr -d '\r\n' < BUILD_VERSION)"

node -e '
const fs = require("node:fs");
const [output, releaseVersion, sourceRevision, buildVersion, archive, sha256] = process.argv.slice(1);
const manifest = {
  schema_version: 1,
  artifact: "evanopolis-v1-web",
  release_version: releaseVersion,
  source_revision: sourceRevision,
  build_version: buildVersion,
  archive,
  sha256,
  entrypoint: "index.html",
  godot_pack: process.argv[7],
  required_server: "static HTTPS host",
};
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
' "${manifest_path}" "${release_version}" "${source_revision}" "${build_version}" "${archive_name}" "${archive_sha256}" "${versioned_pack}"

(
    cd "${output_dir}"
    sha256sum "${archive_name}" "$(basename "${manifest_path}")" > "$(basename "${checksums_path}")"
)

echo "Packaged ${archive_path}"
echo "Wrote ${manifest_path}"
echo "Wrote ${checksums_path}"
