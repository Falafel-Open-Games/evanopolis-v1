# 0075 - Paid Room Join Fails Closed

Date: 2026-09-16

## Goal

Make the paid-room launch handoff reach an explicit game-server boundary instead
of silently joining through the free-play path.

## Changes

- Added `mode` parsing to the game-server join configuration.
- Kept missing mode and `mode=free_play` on the existing development path.
- Reject `mode=paid_room` joins with `production_admission_required` until the
  auth/payment admission check is implemented.
- Reject unknown join modes with `invalid_join_mode`.
- Pass `mode` through the Godot server-client launch config and into
  `join_match`.
- Show server rejection reasons in the Godot overlay even when the full debug
  overlay is disabled.
- Added focused WebSocket tests for paid-room fail-closed behavior and invalid
  join mode.
- Added Godot config coverage for `mode=paid_room`.

## Notes

- This is intentionally not paid admission yet. It prevents the new paid launch
  skeleton from entering matches through the free-play join contract.
- Free-play spectators remain available only on the development/free-play path.

## Validation

- `npm test --prefix apps/game-server`
- `npm run test:integration --prefix apps/game-server`
- `node --check apps/web-wrapper/room-entry.js`
- `godot --headless --path godot --script res://test/game_server_config_test.gd --log-file /tmp/evanopolis-godot-config-test.log`
