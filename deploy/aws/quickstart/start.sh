#!/usr/bin/env bash

# Evanopolis RC.2 AWS quick-start.
#
# Run this script from the cloned repository after copying .env.example to .env
# and replacing every CHANGE_ME value. It prepares the web client and starts the
# complete stack defined in compose.yaml.

# Exit on the first failed command, reject unset variables, and make pipeline
# failures visible instead of continuing with a partial deployment.
set -euo pipefail

# Always resolve relative paths from this script's directory. This makes the
# script behave the same whether it is invoked here or from another directory.
cd "$(dirname "$0")"

# Refuse to start without operator configuration.
if [[ ! -f .env ]]; then
    echo "Missing .env. Run: cp .env.example .env" >&2
    exit 1
fi

if grep -q "CHANGE_ME" .env; then
    echo "Replace every CHANGE_ME value in .env before starting." >&2
    exit 1
fi

# Export every value loaded from .env so Docker Compose can substitute it into
# compose.yaml.
set -a
source .env
set +a

# Create the Ed25519 key pair used by tabletop-auth to sign and verify JWTs.
# Existing keys are deliberately kept on later runs so active sessions do not
# become invalid just because the containers were restarted.
if [[ ! -f jwt-private.pem ]]; then
    openssl genpkey -algorithm Ed25519 -out jwt-private.pem
    openssl pkey -in jwt-private.pem -pubout -out jwt-public.pem
    chmod 600 jwt-private.pem jwt-public.pem
fi

# Docker Compose passes secrets as environment variables. Convert each PEM to
# the one-line, \n-escaped representation expected by tabletop-auth, without
# printing either key to the terminal.
JWT_PRIVATE_KEY_PEM="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt-private.pem)"
JWT_PUBLIC_KEY_PEM="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt-public.pem)"
export JWT_PRIVATE_KEY_PEM JWT_PUBLIC_KEY_PEM

# The operator downloads this archive locally and copies it to the server with
# SCP. The server never needs GitHub credentials.
archive="evanopolis-v1-web-v1.0.0-rc.2.tar.gz"

# Prepare the browser client only on the first run. To rebuild it after changing
# domains, remove ./web and rerun this script.
if [[ ! -f web/room-entry.html ]]; then
    if [[ ! -f "${archive}" ]]; then
        echo "Missing ${archive}. Download it locally and copy it here with SCP." >&2
        exit 1
    fi

    # Remove the archive's versioned top-level directory while extracting into
    # the folder mounted by Caddy.
    mkdir -p web
    tar -xzf "${archive}" -C web --strip-components=1

    # RC.2 contains the staging service URLs. Replace them with this deployment's
    # public HTTPS/WSS domains before Caddy serves the files. -print0/xargs -0
    # keeps this safe if a future release contains filenames with spaces.
    find web -type f \( -name '*.js' -o -name '*.html' \) -print0 | xargs -0 sed -i \
        -e "s#https://evanopolis-v1-rooms-api-staging.fly.dev#https://${ROOMS_DOMAIN}#g" \
        -e "s#https://tabletop-auth.fly.dev#https://${AUTH_DOMAIN}#g" \
        -e "s#wss://evanopolis-v1-game-server-staging.fly.dev/match#wss://${GAME_DOMAIN}/match#g"
fi

# The private auth image must already have been copied and loaded with
# `docker load`. All other images are public and can be pulled anonymously.
auth_image="ghcr.io/falafel-open-games/tabletop-auth:sha-b977c5c0ec261b47cfbd77c8396170b0e2f00733"
if ! docker image inspect "${auth_image}" >/dev/null 2>&1; then
    echo "Missing private tabletop-auth image. Copy its archive here and run:" >&2
    echo "  gzip -dc tabletop-auth-rc2.tar.gz | docker load" >&2
    exit 1
fi

# Pull public images, then start without contacting the private registry. Named
# volumes preserve PostgreSQL, Redis, room, and Caddy data across restarts.
docker compose pull postgres redis rooms game caddy
docker compose up -d --pull never

# Give the operator the two commands needed for the immediate smoke check.
echo
echo "Evanopolis is starting. Open https://${WEB_DOMAIN} in about one minute."
echo "Run 'docker compose ps' and 'docker compose logs -f' to inspect it."
