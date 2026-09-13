# 0003 - Card Resolution Ack Flow

Date: 2026-09-13

## Status

- Done for the server/protocol slice.
- Added pending card resolution, `request_resolve_card`, and tests proving card
  effects wait for player acknowledgement.
- Godot card presentation is still pending as a follow-up slice.

## Next Work

Next work: make simple `Suerte` and `Destino` card effects pace like a board
game moment instead of applying invisibly during movement.

## Decision

Decision:
- Landing on `Suerte` or `Destino` draws a card and creates a pending card
  resolution.
- The card effect is not applied until the active player acknowledges it.
- While a card is pending, the only available action is
  `request_resolve_card`.
- Resolving the card applies its simple EVA delta, clears the pending card, and
  then allows normal end-turn flow.

## Why

Why:
- Even simple automatic effects should be readable and intentional.
- This matches the existing rhythm where players explicitly end the turn after
  landing outcomes.
- It gives the Godot client a clean card panel/action target for the next
  visual slice.

## Expected Outcome

Expected outcome:
- server tests prove card effects wait for player ack
- snapshots expose `pending_card_resolution`
- gameplay remains recoverable from snapshots
