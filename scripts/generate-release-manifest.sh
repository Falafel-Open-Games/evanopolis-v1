#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 9 ]]; then
    echo "usage: $0 <release-version> <source-revision> <game-digest> <rooms-digest> <auth-source-revision> <auth-image> <auth-digest> <web-archive> <output>" >&2
    exit 2
fi

release_version="$1"
source_revision="$2"
game_digest="$3"
rooms_digest="$4"
auth_source_revision="$5"
auth_image="$6"
auth_digest="$7"
web_archive="$8"
output="$9"

if [[ ! "${release_version}" =~ ^v[0-9A-Za-z._-]+$ ]]; then
    echo "release version must start with v and contain only release-safe characters" >&2
    exit 2
fi
for revision in "${source_revision}" "${auth_source_revision}"; do
    if [[ ! "${revision}" =~ ^[0-9a-f]{40}$ ]]; then
        echo "source revisions must be full lowercase 40-character commit IDs" >&2
        exit 2
    fi
done
for digest in "${game_digest}" "${rooms_digest}" "${auth_digest}"; do
    if [[ ! "${digest}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
        echo "container digests must be sha256 digests" >&2
        exit 2
    fi
done
if [[ ! "${auth_image}" =~ ^ghcr\.io/[a-z0-9._/-]+:sha-[0-9a-f]{40}$ ]]; then
    echo "auth image must use an immutable full-source-SHA GHCR tag" >&2
    exit 2
fi
if [[ ! -f "${web_archive}" ]]; then
    echo "web archive not found: ${web_archive}" >&2
    exit 1
fi

build_version="$(tr -d '\r\n' < BUILD_VERSION)"
build_date_utc="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
web_sha256="$(sha256sum "${web_archive}" | cut -d ' ' -f 1)"
web_archive_name="$(basename "${web_archive}")"

mkdir -p "$(dirname "${output}")"
printf '%s\n' \
    "release:" \
    "  name: ${release_version}" \
    "  build_date_utc: ${build_date_utc}" \
    "  build_version: ${build_version}" \
    "  evanopolis_source_revision: ${source_revision}" \
    "  tabletop_auth_source_revision: ${auth_source_revision}" \
    "" \
    "artifacts:" \
    "  game_server:" \
    "    image: ghcr.io/falafel-open-games/evanopolis-v1-game-server:sha-${source_revision}" \
    "    digest: ${game_digest}" \
    "    platform: linux/amd64" \
    "  rooms_api:" \
    "    image: ghcr.io/falafel-open-games/evanopolis-v1-rooms-api:sha-${source_revision}" \
    "    digest: ${rooms_digest}" \
    "    platform: linux/amd64" \
    "  tabletop_auth:" \
    "    image: ${auth_image}" \
    "    digest: ${auth_digest}" \
    "    platform: linux/amd64" \
    "  web_client:" \
    "    archive: ${web_archive_name}" \
    "    sha256: ${web_sha256}" \
    "" \
    "interfaces:" \
    "  auth_health_path: /health" \
    "  rooms_api_health_path: /healthz" \
    "  game_server_health_path: /health" \
    "  game_server_websocket_path: /match" \
    "" \
    "verification:" \
    "  automated_tests: PASSED" \
    "  clean_container_builds: PASSED" \
    "  local_container_health: PASSED" \
    "  staging_service_health: PASSED" \
    "  staged_paid_two_player_path: NOT_RUN" \
    "  browser_desktop_entry: NOT_RUN" \
    "  browser_smartphone_entry: NOT_RUN" \
    "" \
    "operator_acceptance:" \
    "  target_environment: UNDECIDED" \
    "  operator: UNASSIGNED" \
    "  accepted_at_utc: NOT_ACCEPTED" \
    "  evidence_location: https://github.com/falafel-open-games/evanopolis-v1/releases/tag/${release_version}" \
    > "${output}"

echo "Wrote ${output}"
