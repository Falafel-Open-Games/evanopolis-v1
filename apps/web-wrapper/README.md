# Evanopolis V1 Web Wrapper

This is the static browser shell for client-facing WIP reviews.

## Purpose

The wrapper is intentionally simple for now:

- serve from GitHub Pages or any static file host
- provide a stable URL for design review
- embed the offline Godot Web export when available
- keep launch configuration in the HTML shell instead of turning Godot into a
  lobby UI

## Local Preview

From the repo root:

```bash
just serve-web-wrapper
```

Then open:

```text
http://127.0.0.1:4173/apps/web-wrapper/
```

The server protocol debug page is available at:

```text
http://127.0.0.1:4173/apps/web-wrapper/server-debug.html
```

The server-connected Godot client page is available at:

```text
http://127.0.0.1:4173/apps/web-wrapper/server-client.html
```

Use the page's `New Match` button to generate a fresh `match_id`, update the
browser URL, and reload the Godot iframe into a new match while keeping the same
client id.

Use `New Client` to open another tab with the same `match_id` and a new
`client_id`. This is the fastest local/manual path for filling a 3-player match
from one browser.

Run the game server separately and connect the page to:

```text
ws://127.0.0.1:8788/match
```

When served from GitHub Pages, the debug page defaults to the staging server:

```text
wss://evanopolis-v1-game-server-staging.fly.dev/match
```

## GitHub Pages

The GitHub Actions Pages workflow publishes this directory as the site root.
After the workflow deploys, the review URL is:

```text
https://falafel-open-games.github.io/evanopolis-v1/
```

## Godot Export Slot

When the Godot Web export exists, place it at:

```text
apps/web-wrapper/game/index.html
```

The wrapper iframe points there by default. Until that file exists, each page
shows a static review placeholder instead.

Prefer the repo command when refreshing the local export:

```bash
just godot-web-export
```

The command runs Godot's Web export into `apps/web-wrapper/game/`. Manual
exports from the Godot editor should target the same `game/index.html` path.

The Godot export uses `res://game/bootstrap-main.tscn` as its main scene. The
same export can launch either:

- `scene=review`
- `scene=server-client`

The server-connected Godot page passes launch config through query params to
the exported Godot iframe:

```text
game/index.html?scene=server-client&server_url=...&match_id=demo&client_id=browser-a&language=en
```

Godot consumes that config and owns only the game-client behavior: connecting,
joining, rendering server state, and sending gameplay intents.

The wrapper also listens for a small `evanopolis-godot-launch` diagnostic
message from the iframe. This is only instrumentation: it shows whether the
Godot bootstrap could read the iframe URL, query string, and selected scene.
