# 0025 - Toast Component Refactor

Date: 2026-09-13

## Status

- Done.

## Next Work

Extract the toast notification UI into a reusable Godot component.

## Decision

- Create a `ToastPresenter` script that owns panel creation, styling, timing,
  and animation.
- Instantiate it from both Visual Review and server-client scenes.
- Keep event-to-message formatting in the server-client scene for now.

## Why

- The toast behavior is now shared by review tooling and live gameplay.
- Duplicating animation logic makes it easier for the two scenes to drift.
- Treating the toast as a reliable module makes it ready for future event-feed
  expansion.

## Expected Outcome

- One reusable toast implementation drives all current toast UI.
- Repeated triggers remain stable.
- Existing tests/checks remain green.

## Result

- Added `ToastPresenter` as a reusable component for Visual Review and the
  server-client scene.
- Removed the toast border and increased toast text size after visual review.
- Raised the toast visible duration to 3 seconds.
- Included the presenter script in the Godot web export resource list.

## Verification

- `godot --headless --path godot --scene res://game/game-main.tscn --quit-after 2 --log-file /tmp/evanopolis-godot-review.log`
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
- `just game-server-test`
- `just game-server-test-integration`
