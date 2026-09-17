#!/usr/bin/env sh
set -eu

base_url="${1:-https://evanopolis-v1-rooms-api-staging.fly.dev}"
health_url="${base_url%/}/healthz"

response="$(curl -fsS "$health_url")"

case "$response" in
  *'"ok":true'*)
    printf 'rooms-api smoke check passed: %s\n' "$health_url"
    ;;
  *)
    printf 'rooms-api smoke check failed: unexpected response from %s\n%s\n' "$health_url" "$response" >&2
    exit 1
    ;;
esac
