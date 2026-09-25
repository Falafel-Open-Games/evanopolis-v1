# Evanopolis V1

Evanopolis V1 is a Godot board-game client plus a new TypeScript
server-authoritative match loop.

## Apps

- `godot/`: Godot client, board presentation, dice, pawns, and visual review
  scenes.
- `apps/web-wrapper/`: static browser shell for client-facing WIP reviews.
- `apps/game-server/`: TypeScript match server core, currently focused on
  reusable turn-based multiplayer infrastructure and the first Evanopolis rules
  adapter.
- `apps/rooms-api/`: TypeScript room metadata service for production room
  creation and invite lookup.

## Server Development

The game server starts as a tested core library before WebSocket transport is
added.

```bash
just game-server-install
just game-server-test
just game-server-serve
```

For local paid-room testing, copy `.env.example` to `.env` or keep the checked-in
local defaults on this machine. `just game-server-serve` loads `.env`
automatically when present.

Equivalent commands from `apps/game-server/`:

```bash
npm install
npm test
npm run serve
```

The server debug page is available from the static wrapper:

```text
http://127.0.0.1:4173/apps/web-wrapper/server-debug.html
```

After GitHub Pages publishes `apps/web-wrapper/` as the site root, the online
debug page is:

```text
https://falafel-open-games.github.io/evanopolis-v1/server-debug.html
```

Use it with the local server URL:

```text
ws://127.0.0.1:8788/match
```

When the debug page is served from GitHub Pages, it defaults to:

```text
wss://evanopolis-v1-game-server-staging.fly.dev/match
```

Architecture notes:
- [`docs/architecture/production_entry_flow.md`](docs/architecture/production_entry_flow.md)
- [`docs/architecture/minimal_multiplayer_core.md`](docs/architecture/minimal_multiplayer_core.md)
- [`docs/architecture/game_server_protocol.md`](docs/architecture/game_server_protocol.md)
- [`docs/architecture/free_play_match_server.md`](docs/architecture/free_play_match_server.md)
- [`docs/architecture/production_entry_flow_inventory.md`](docs/architecture/production_entry_flow_inventory.md)
- [`docs/architecture/gameplay_client_architecture.md`](docs/architecture/gameplay_client_architecture.md)
- [`docs/architecture/suerte_destino_card_plan.md`](docs/architecture/suerte_destino_card_plan.md)
- [`docs/spec/evanopolis_v1_schema.md`](docs/spec/evanopolis_v1_schema.md)
- [`docs/backlog/game_server_backlog.md`](docs/backlog/game_server_backlog.md)
- [`docs/devlog.md`](docs/devlog.md)

Asset credits and licenses: [`docs/CREDITS.md`](docs/CREDITS.md)

Deployment notes:
- [`deploy/fly/game-server/README.md`](deploy/fly/game-server/README.md)
- [`deploy/fly/rooms-api/README.md`](deploy/fly/rooms-api/README.md)
- [`docs/deployment/staging-paid-flow.md`](docs/deployment/staging-paid-flow.md)
- [`docs/delivery/operator-handoff.md`](docs/delivery/operator-handoff.md)
- [`docs/delivery/release-manifest.template.yaml`](docs/delivery/release-manifest.template.yaml)

On pushes to `main`, GitHub Actions:
- tests the TypeScript game server
- publishes `ghcr.io/falafel-open-games/evanopolis-v1-game-server`
- deploys the staging Fly app when the `FLY_API_TOKEN` repository secret is set
- tests, publishes, and deploys the Rooms API staging app

## Rooms API Development

The Rooms API is the first production-entry service restored from the previous
pay-to-play architecture. It owns room definitions for create-room and invite
lookup flows; it does not own live gameplay state.

```bash
just rooms-api-install
just rooms-api-test
```

Run it locally against a sibling or deployed auth service:

```bash
just rooms-api-serve
```

Useful endpoints:

```text
GET  /healthz
POST /v0/rooms
GET  /v0/rooms/:game_id
```

REST contract:
- [`apps/rooms-api/REST_API.md`](apps/rooms-api/REST_API.md)

## Godot Development

Open the project in `godot/`.

The visual review scene remains `res://game/game-main.tscn`. The first
server-connected client slice lives next to it at
`res://game/server-client-main.tscn`.

The Web export starts from `res://game/bootstrap-main.tscn`, which lets the
HTML shell choose `scene=review` or `scene=server-client` without duplicating
the Godot export.

Run a headless script check for the server-connected scene with:

```bash
just godot-server-client-check
```

## Web Wrapper Preview

Detailed local wrapper instructions live in
[`apps/web-wrapper/README.md`](apps/web-wrapper/README.md).

```bash
just serve-web-wrapper
```

Then open:

```text
http://127.0.0.1:4173/apps/web-wrapper/
```

The server-connected Godot page is:

```text
http://127.0.0.1:4173/apps/web-wrapper/server-client.html
```

The production-shaped room entry skeleton is:

```text
http://127.0.0.1:4173/apps/web-wrapper/room-entry.html
```

It expects `../tabletop-auth` to provide wallet SIWE/JWT auth at
`http://127.0.0.1:3000` and `apps/rooms-api` to provide room metadata at
`http://127.0.0.1:3001`.
