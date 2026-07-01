# Evanopolis V1 Web Wrapper

This is the static browser shell for client-facing WIP reviews.

## Purpose

The wrapper is intentionally simple for now:

- serve from GitHub Pages or any static file host
- provide a stable URL for design review
- embed the offline Godot Web export when available
- avoid wallet, payment, multiplayer, and server concerns in this phase

## Local Preview

From the repo root:

```bash
just serve-web-wrapper
```

Then open:

```text
http://127.0.0.1:4173/apps/web-wrapper/
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

The wrapper iframe points there by default. Until that file exists, the page
shows a static review placeholder instead.
