# 0062 - Prison Skip Turn

Date: 2026-09-13

## Status

- Done.

## Next Work

Implement a small provisional `CARCEL` behavior for the demo.

## Scope

- Mark players jailed when they land on `CARCEL`.
- Let jailed players skip their next turn with a `SERVE SENTENCE` action.
- Show observer toasts for jail entry and sentence serving.
- Document that this rule requires client validation.

## Expected Outcome

- Landing on jail has a visible, understandable consequence for tomorrow's demo.
- The implementation remains clearly provisional until the client confirms jail rules.

## Implementation Notes

- Added server `jailed_player_ids` and `has_rolled_current_turn` snapshot state.
- Added `player_jailed` and `jail_sentence_served` events.
- The active jailed player exposes `request_end_turn` instead of `request_roll`.
- The client labels jail-entry end turn as `ACCEPT JAIL TIME` and the skipped turn as `SERVE SENTENCE`.
- Jail-entry toasts wait for the movement presentation before appearing.
- Added a `player_eliminated` toast so game-over is visible to all clients.

## Verification

- `npm run test --prefix apps/game-server`
- `just game-server-test-integration`
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
