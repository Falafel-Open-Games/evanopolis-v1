# 0028 - Salida Toast Copy

Date: 2026-09-13

## Status

- Done.

## Next Work

Make the `SALIDA` toast copy distinguish passing through start from landing
exactly on start.

## Decision

- Keep using the authoritative `amount_eva` from `start_bonus_collected`.
- Use `exact_landing` to choose distinct message text.
- Add a direct Godot test for the exact landing event shape.

## Expected Outcome

- Passing `SALIDA` clearly shows the +2 EVA reward.
- Landing exactly on `SALIDA` clearly shows the +3 EVA reward.
- Existing Godot checks remain green.

## Result

- Passing `SALIDA` now says the player passed `SALIDA` and collected +2 EVA.
- Landing exactly on `SALIDA` now says the player landed on `SALIDA` and
  collected +3 EVA.
- Added Godot coverage for both toast messages.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
