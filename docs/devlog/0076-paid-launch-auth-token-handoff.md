# 0076 - Paid Launch Auth Token Handoff

Date: 2026-09-17

## Goal

Carry the wallet auth token from the browser paid-launch payload into the Godot
client join message without putting the token in the iframe URL.

## Changes

- Godot reads `paid_launch_key` from the launch URL.
- In Web exports, Godot resolves that key against browser session storage.
- The paid launch payload can override:
  - `mode`
  - `server_url`
  - `match_id`
  - `player_count`
  - `auth_token`
- `GameServerClient.join_match` includes `auth_token` when present.
- Paid-room joins without `auth_token` now reject with `missing_auth_token`.
- Paid-room joins with an auth token still fail closed with
  `production_admission_required` until server-side admission checks exist.

## Notes

- The token remains out of the visible page and URL query string.
- This is still not paid admission; it prepares the authenticated paid-room join
  envelope that the next backend slice will validate.

## Validation

- `npm test --prefix apps/game-server`
- `npm run test:integration --prefix apps/game-server`
- `godot --headless --path godot --script res://test/game_server_config_test.gd --log-file /tmp/evanopolis-godot-config-test.log`
