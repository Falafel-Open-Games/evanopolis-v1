# Game Server Fly.io Deploy

This directory contains the first Fly.io deployment scaffold for
`apps/game-server`.

The app is a long-running Node process built from
[`deploy/docker/game-server/Dockerfile`](../../docker/game-server/Dockerfile).

## Local Docker Build

From the repo root:

```bash
docker build -f deploy/docker/game-server/Dockerfile -t evanopolis-v1-game-server .
docker run --rm -p 8788:8788 evanopolis-v1-game-server
```

Then smoke-check:

```bash
deploy/fly/game-server/smoke-check.sh http://127.0.0.1:8788
```

## Fly Setup

The checked-in `fly.toml` is configured for the staging app:

```text
evanopolis-v1-game-server-staging
```

Create the Fly app once:

```bash
fly apps create evanopolis-v1-game-server-staging
```

Deploy from the repo root:

```bash
just game-server-fly-deploy
```

That recipe passes `--ha=false` intentionally. The match registry is currently
in memory, so staging must run as a single Machine until persistence or sticky
routing exists.

If Fly ever creates extra Machines for this app, scale it back to one:

```bash
flyctl scale count 1 -a evanopolis-v1-game-server-staging
```

Smoke-check the deployed app:

```bash
just game-server-smoke-staging
```

## Notes

- `HOST=0.0.0.0` is required in container/Fly environments.
- `PORT=8788` matches the current local server default and Fly internal port.
- The staging machine stays warm with `min_machines_running = 1` because match
  state is currently in memory.
- The WebSocket route is `wss://evanopolis-v1-game-server-staging.fly.dev/match`.
- Fly credentials are not stored in this repo. Use `flyctl auth login` locally,
  or a Fly token in GitHub Actions later.

## GitHub Actions

Pushes to `main` run [`.github/workflows/game-server.yml`](../../../.github/workflows/game-server.yml).

The workflow:
- runs the game-server test suite
- builds and pushes `ghcr.io/falafel-open-games/evanopolis-v1-game-server`
- deploys this staging Fly app
- smoke-checks `GET /health`

Required repository secret:

```text
FLY_API_TOKEN
```

Create it locally with:

```bash
flyctl tokens create deploy -a evanopolis-v1-game-server-staging
```

Then add it to the GitHub repository secrets.
