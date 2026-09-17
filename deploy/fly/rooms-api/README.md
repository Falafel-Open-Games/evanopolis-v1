# Rooms API Fly.io Deploy

This directory contains the staging Fly.io deployment scaffold for
`apps/rooms-api`.

## Fly Setup

The checked-in `fly.toml` targets:

```text
evanopolis-v1-rooms-api-staging
```

Create the app and persistent volume once:

```bash
fly apps create evanopolis-v1-rooms-api-staging
fly volumes create rooms_data --region gru --size 1 -a evanopolis-v1-rooms-api-staging
```

The volume stores `/data/rooms.json`, which is sufficient for staging room
metadata. Production should revisit persistence and backup requirements.

Deploy from the repo root:

```bash
just rooms-api-fly-deploy
```

Smoke-check:

```bash
just rooms-api-smoke-staging
```

## Configuration

The staging config points room creation auth checks at:

```text
https://tabletop-auth.fly.dev/whoami
```

If the auth service gets a separate staging app, update `AUTH_BASE_URL` in
`fly.toml` and redeploy.

Required GitHub repository secret for automated deploy:

```text
FLY_API_TOKEN
```
