#!/usr/bin/env sh
set -eu

base_url="${1:-http://127.0.0.1:8788}"

response="$(curl -fsS "$base_url/health")"

case "$response" in
  *\"ok\":true*\"service\":\"evanopolis-game-server\"*)
    printf '%s\n' "$response"
    ;;
  *)
    printf 'Unexpected health response: %s\n' "$response" >&2
    exit 1
    ;;
esac
