# 0010 - Card Panel End Turn Followup

Date: 2026-09-13

## Status

- Done.

## Next Work

Keep the card panel open after a card resolves, replacing `APPLY CARD` with
`END TURN`.

## Decision

- Preserve the existing two-step turn rhythm used by properties and rent.
- Revert the server-side auto-end-turn experiment from 0009.
- Use the card panel itself as the follow-up end-turn UI after
  `request_resolve_card`.
- Show this follow-up only for the local active player on `Suerte` or
  `Destino` with `request_end_turn`.

## Why

- Consistency is clearer than making cards a special one-click exception.
- The player should not need to move their attention from the card panel to the
  status bar after applying a card.

## Expected Outcome

- `APPLY CARD` resolves the card and leaves the turn active.
- The same card panel then shows an `END TURN` button.
- Server rules continue to expose `request_end_turn` after card resolution.
- Tests cover pending-card, game-over-card, and resolved-card follow-up states.

## Result

- Reverted the server auto-end-turn behavior from 0009.
- Card resolution again exposes `request_end_turn`.
- The Godot card panel now stays visible after card resolution on card spaces
  and replaces `APPLY CARD` with `END TURN`.
- Updated client tests to cover the card-panel end-turn follow-up.
