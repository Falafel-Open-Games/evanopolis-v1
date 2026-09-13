# 0029 - Salida Toast Sequencing

Date: 2026-09-13

## Status

- Done.

## Next Work

Delay automatic `SALIDA` reward toast messages until the pawn movement
presentation has completed.

## Decision

- Add a presentation-queue signal for events after their visual presentation is
  complete.
- Show `start_bonus_collected` toast from that signal instead of immediately
  when the server event arrives.
- Keep click-driven toast events immediate for now.

## Expected Outcome

- `SALIDA` reward copy appears after the pawn has visually passed or landed on
  `SALIDA`.
- Card and property observer toast behavior remains unchanged.
- Existing Godot checks remain green.

## Result

- Added `event_presented` to the server event presentation queue.
- `start_bonus_collected` toast now fires after that event reaches the
  post-presentation hook instead of immediately on receipt.
- Card and property toasts still fire immediately because those are
  player-confirmed actions after movement has already settled.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
