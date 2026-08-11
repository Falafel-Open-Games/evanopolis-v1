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

## Server Development

The game server starts as a tested core library before WebSocket transport is
added.

```bash
just game-server-install
just game-server-test
just game-server-serve
```

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
- [`docs/architecture/minimal_multiplayer_core.md`](docs/architecture/minimal_multiplayer_core.md)
- [`docs/architecture/game_server_protocol.md`](docs/architecture/game_server_protocol.md)
- [`docs/architecture/free_play_match_server.md`](docs/architecture/free_play_match_server.md)
- [`docs/architecture/gameplay_client_architecture.md`](docs/architecture/gameplay_client_architecture.md)
- [`docs/backlog/game_server_backlog.md`](docs/backlog/game_server_backlog.md)

Deployment notes:
- [`deploy/fly/game-server/README.md`](deploy/fly/game-server/README.md)

On pushes to `main`, GitHub Actions:
- tests the TypeScript game server
- publishes `ghcr.io/falafel-open-games/evanopolis-v1-game-server`
- deploys the staging Fly app when the `FLY_API_TOKEN` repository secret is set

## Godot Development

Open the project in `godot/`.

The current Godot scene work is still presentation/debug focused. Server-driven
integration should use a separate scene once the WebSocket transport exists, so
the visual review scene can remain stable while the playable demo loop comes
online.

## Web Wrapper Preview

```bash
just serve-web-wrapper
```

Then open:

```text
http://127.0.0.1:4173/apps/web-wrapper/
```
