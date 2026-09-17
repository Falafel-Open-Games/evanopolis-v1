# Staging Paid Flow Deployment

This runbook tracks the staging services needed for the production-like
create-room, invite, payment, and paid-join flow.

## Services

| Service | Target | Notes |
| --- | --- | --- |
| Web wrapper | GitHub Pages | Built by `.github/workflows/pages.yml`. |
| `tabletop-auth` | `https://tabletop-auth.fly.dev` | Owns wallet JWTs, payment verification, and paid admission checks. |
| Rooms API | `https://evanopolis-v1-rooms-api-staging.fly.dev` | Owns room metadata and invite lookup. |
| Game server | `https://evanopolis-v1-game-server-staging.fly.dev` | Owns live gameplay and calls Rooms API plus `tabletop-auth` for paid joins. |

When served outside localhost, the wrapper defaults to these staging service
URLs. Localhost still defaults to `127.0.0.1` ports for development.

## One-Time Fly Setup

Rooms API:

```bash
fly apps create evanopolis-v1-rooms-api-staging
fly volumes create rooms_data --region gru --size 1 -a evanopolis-v1-rooms-api-staging
```

Game server:

```bash
fly apps create evanopolis-v1-game-server-staging
```

`tabletop-auth` already has its own Fly config in `../tabletop-auth`.

## GitHub Secrets And Variables

`evanopolis-v1` requires:

```text
FLY_API_TOKEN
```

`tabletop-auth` requires the secrets and variables documented in its deploy
workflow, including:

```text
FLY_API_TOKEN
JWT_PRIVATE_KEY_PEM
JWT_PUBLIC_KEY_PEM
JWT_KEY_ID
NONCE_STORE_URL
DATABASE_URL
EVM_RPC_URL
PAYMENT_MIN_CONFIRMATIONS
PAYMENT_ADAPTER_ADDRESS
ALLOWED_ORIGINS
```

`ALLOWED_ORIGINS` must include the GitHub Pages wrapper origin and any local
origins used for staging validation:

```text
https://falafel-open-games.github.io
https://www.falafel.com.br
https://falafel.com.br
http://127.0.0.1:4173
http://localhost:4173
```

For `tabletop-auth`, `ALLOWED_ORIGINS` is read from the GitHub Actions
**Variable** `ALLOWED_ORIGINS`, not the GitHub secret of the same name. Keep the
variable current; remove the unused secret if it causes confusion.

## Deployment Order

1. Deploy `tabletop-auth`.
2. Deploy Rooms API.
3. Deploy game server.
4. Deploy GitHub Pages wrapper.

This order keeps downstream health and admission checks pointing at services
that already exist.

## Smoke Checks

```bash
just rooms-api-smoke-staging
just game-server-smoke-staging
```

For `tabletop-auth`, check:

```bash
curl -fsS https://tabletop-auth.fly.dev/health
```

## Browser Validation

1. Open the wrapper staging URL.
2. Connect wallet.
3. Create a paid room.
4. Pay and verify the ticket for player one.
5. Open invite in another tab or browser session.
6. Pay and verify the ticket for player two.
7. Launch both paid clients.
8. Confirm both admitted players enter the same live match.

Validated on 2026-09-17 from `https://www.falafel.com.br/evanopolis-v1/` with a
two-player paid room.
