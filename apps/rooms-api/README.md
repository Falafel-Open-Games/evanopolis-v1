# Evanopolis Rooms API

Small production room-definition service for the paid entry flow.

## Purpose

The Rooms API owns durable room metadata:

- authenticated room creation
- public invite lookup by `game_id`
- room settings consumed later by the game server

It does not own live gameplay state, payment verification, or winner
determination.

## Local Run

Install dependencies once:

```bash
npm install
```

Run tests:

```bash
npm test
```

Start locally:

```bash
ALLOWED_ORIGINS=http://127.0.0.1:4173,http://localhost:4173 \
AUTH_BASE_URL=http://127.0.0.1:3000 \
npm start
```

Optional JSON-file persistence:

```bash
AUTH_BASE_URL=http://127.0.0.1:3000 \
ALLOWED_ORIGINS=http://127.0.0.1:4173,http://localhost:4173 \
ROOMS_DATA_FILE="$HOME/.evanopolis/rooms.json" \
npm start
```

## Contract

- `GET /healthz`
- `POST /v0/rooms`
- `GET /v0/rooms/:game_id`

`POST /v0/rooms` requires `Authorization: Bearer <jwt>` and verifies the token
through `AUTH_BASE_URL` + `AUTH_VERIFY_PATH` (default `/whoami`).
