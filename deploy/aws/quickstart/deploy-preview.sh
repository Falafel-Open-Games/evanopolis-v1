#!/usr/bin/env bash

set -euo pipefail

usage() {
    echo "usage: $0 <web-archive> <web-manifest> <checksums> <source-revision>" >&2
}

if [[ $# -ne 4 ]]; then
    usage
    exit 2
fi

cd "$(dirname "$0")"

archive_path="$1"
manifest_path="$2"
checksums_path="$3"
source_revision="$4"

if [[ ! "${source_revision}" =~ ^[0-9a-f]{40}$ ]]; then
    echo "source revision must be a lowercase 40-character commit ID" >&2
    exit 2
fi

for required_path in "${archive_path}" "${manifest_path}" "${checksums_path}" .env compose.yaml Caddyfile; do
    if [[ ! -f "${required_path}" ]]; then
        echo "Missing required deployment input: ${required_path}" >&2
        exit 1
    fi
done
if [[ ! -d web ]]; then
    echo "Active web directory is missing; run the initial quick-start before continuous deployment." >&2
    exit 1
fi

if grep -q "CHANGE_ME" .env; then
    echo "Replace every CHANGE_ME value in .env before deploying." >&2
    exit 1
fi

exec 9>.deploy-preview.lock
if ! flock -n 9; then
    echo "Another preview deployment is already running." >&2
    exit 1
fi

archive_path="$(realpath "${archive_path}")"
manifest_path="$(realpath "${manifest_path}")"
checksums_path="$(realpath "${checksums_path}")"
artifact_dir="$(dirname "${archive_path}")"

if [[ "$(dirname "${manifest_path}")" != "${artifact_dir}" || "$(dirname "${checksums_path}")" != "${artifact_dir}" ]]; then
    echo "Archive, manifest, and checksums must be in the same directory." >&2
    exit 1
fi

(
    cd "${artifact_dir}"
    sha256sum -c "$(basename "${checksums_path}")"
)

manifest_source="$(sed -nE 's/^[[:space:]]*"source_revision":[[:space:]]*"([0-9a-f]{40})",?$/\1/p' "${manifest_path}")"
build_version="$(sed -nE 's/^[[:space:]]*"build_version":[[:space:]]*"([A-Za-z0-9_.-]+)",?$/\1/p' "${manifest_path}")"
manifest_archive="$(sed -nE 's/^[[:space:]]*"archive":[[:space:]]*"([A-Za-z0-9_.-]+)",?$/\1/p' "${manifest_path}")"

if [[ "${manifest_source}" != "${source_revision}" ]]; then
    echo "Manifest source revision does not match requested deployment revision." >&2
    exit 1
fi
if [[ "${manifest_archive}" != "$(basename "${archive_path}")" ]]; then
    echo "Manifest archive name does not match the supplied archive." >&2
    exit 1
fi
if [[ -z "${build_version}" ]]; then
    echo "Manifest does not contain a valid build version." >&2
    exit 1
fi

rooms_image="ghcr.io/falafel-open-games/evanopolis-v1-rooms-api:sha-${source_revision}"
game_image="ghcr.io/falafel-open-games/evanopolis-v1-game-server:sha-${source_revision}"

set -a
source .env
set +a

for required_variable in WEB_DOMAIN AUTH_DOMAIN ROOMS_DOMAIN GAME_DOMAIN; do
    if [[ -z "${!required_variable:-}" ]]; then
        echo "${required_variable} must be set in .env" >&2
        exit 1
    fi
done

if [[ ! -f jwt-private.pem || ! -f jwt-public.pem ]]; then
    echo "JWT key files are missing; run the initial quick-start before continuous deployment." >&2
    exit 1
fi

JWT_PRIVATE_KEY_PEM="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt-private.pem)"
JWT_PUBLIC_KEY_PEM="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt-public.pem)"
export JWT_PRIVATE_KEY_PEM JWT_PUBLIC_KEY_PEM

release_short="${source_revision:0:12}"
stage_dir="web-preview-${release_short}-staging"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="web-backup-${timestamp}"
env_backup=".env.backup-${timestamp}"
activated=0

cleanup_stage() {
    if [[ -d "${stage_dir}" ]]; then
        rm -rf -- "${stage_dir}"
    fi
}

rollback() {
    exit_code=$?
    trap - ERR
    if [[ "${activated}" == "1" ]]; then
        echo "Deployment failed after activation; restoring ${backup_dir}." >&2
        cp "${env_backup}" .env
        unset ROOMS_IMAGE GAME_IMAGE EVANOPOLIS_BUILD_VERSION
        set -a
        source .env
        set +a
        if [[ -d "${backup_dir}" ]]; then
            if [[ -d web ]]; then
                failed_dir="web-failed-${timestamp}"
                mv web "${failed_dir}"
            fi
            mv "${backup_dir}" web
        fi
        docker compose up -d --no-deps --force-recreate auth rooms game caddy || true
    fi
    cleanup_stage
    exit "${exit_code}"
}
trap rollback ERR

cleanup_stage
mkdir "${stage_dir}"
tar -xzf "${archive_path}" -C "${stage_dir}" --strip-components=1

test -f "${stage_dir}/room-entry.html"
test -f "${stage_dir}/free-entry.html"
test -f "${stage_dir}/game/index.html"

find "${stage_dir}" -type f \( -name '*.js' -o -name '*.html' \) -print0 | xargs -0 sed -i \
    -e "s#https://evanopolis-v1-rooms-api-staging.fly.dev#https://${ROOMS_DOMAIN}#g" \
    -e "s#https://tabletop-auth.fly.dev#https://${AUTH_DOMAIN}#g" \
    -e "s#https://tabletop-demo-auth.falafel.com.br#https://${AUTH_DOMAIN}#g" \
    -e "s#wss://evanopolis-v1-game-server-staging.fly.dev/match#wss://${GAME_DOMAIN}/match#g"

if grep -R -E 'evanopolis-v1-(rooms-api|game-server)-staging\.fly\.dev|tabletop-(demo-)?auth\.(fly\.dev|falafel\.com\.br)' \
    "${stage_dir}" --include='*.js' --include='*.html'; then
    echo "A staging service URL remains in the prepared web bundle." >&2
    exit 1
fi

export ROOMS_IMAGE="${rooms_image}"
export GAME_IMAGE="${game_image}"
export EVANOPOLIS_BUILD_VERSION="${build_version}"
docker compose pull auth rooms game

cp .env "${env_backup}"
for variable_name in ROOMS_IMAGE GAME_IMAGE EVANOPOLIS_BUILD_VERSION; do
    sed -i "/^${variable_name}=/d" .env
done
printf '\nROOMS_IMAGE=%s\nGAME_IMAGE=%s\nEVANOPOLIS_BUILD_VERSION=%s\n' \
    "${ROOMS_IMAGE}" "${GAME_IMAGE}" "${EVANOPOLIS_BUILD_VERSION}" >> .env

activated=1
mv web "${backup_dir}"
mv "${stage_dir}" web

docker compose up -d --no-deps --force-recreate auth
docker compose up -d --no-deps --force-recreate rooms
docker compose up -d --no-deps --force-recreate game
docker compose up -d --no-deps --force-recreate caddy

for attempt in $(seq 1 30); do
    if curl -fsS "https://${ROOMS_DOMAIN}/healthz" >/dev/null \
        && curl -fsS "https://${GAME_DOMAIN}/health" >/dev/null \
        && curl -fsS "https://${AUTH_DOMAIN}/health" >/dev/null; then
        break
    fi
    if [[ "${attempt}" == "30" ]]; then
        echo "Service health checks did not pass within 150 seconds." >&2
        false
    fi
    sleep 5
done

root_html="$(curl -fsS "https://${WEB_DOMAIN}/")"
free_html="$(curl -fsS "https://${WEB_DOMAIN}/free-entry.html")"
game_health="$(curl -fsS "https://${GAME_DOMAIN}/health")"

grep -Fq "Version ${build_version}" <<<"${root_html}"
grep -Fq "Version ${build_version}" <<<"${free_html}"
grep -Fq "\"version\":\"${build_version}\"" <<<"${game_health}"

activated=0
trap - ERR
rm -f -- "${env_backup}"

# Keep enough local history for quick operator rollback without allowing preview
# artifacts to consume the instance disk indefinitely.
mapfile -t old_backups < <(find . -maxdepth 1 -type d -name 'web-backup-*' -printf '%T@ %p\n' | sort -nr | tail -n +6 | cut -d ' ' -f 2-)
if [[ ${#old_backups[@]} -gt 0 ]]; then
    rm -rf -- "${old_backups[@]}"
fi
find incoming -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf -- {} +

echo "Deployed ${source_revision} (${build_version}) to https://${WEB_DOMAIN}/"
echo "Rollback web directory retained at ${backup_dir}"
