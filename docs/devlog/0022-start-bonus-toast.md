# 0022 - Start Bonus Toast

Date: 2026-09-13

## Status

- Done.

## Next Work

Show an ephemeral client notification when a player receives the automatic
`SALIDA` bonus.

## Decision

- Use a small non-blocking toast instead of a modal/panel decision.
- Drive it from the `start_bonus_collected` event.
- Include the player label, EVA amount, and jackpot free-roll note.

## Why

- Crossing or landing on `SALIDA` changes the player's balance automatically.
- Silent balance updates are easy for active players and spectators to miss.
- The same toast pattern can later be reused for other automatic events.

## Expected Outcome

- `start_bonus_collected` events display a short toast in Godot.
- The toast auto-hides and does not affect turn actions.
- Godot tests cover the toast text and visibility.

---

## Result

- Added a non-blocking toast panel to the Godot server-client overlay.
- `start_bonus_collected` now shows a toast with player label, EVA reward, and
  jackpot free-roll count.
- Added Godot coverage for toast visibility and text.
- Re-exported the Godot web build for browser testing.

## Verification

- `just game-server-test`
- `just game-server-test-integration`
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
