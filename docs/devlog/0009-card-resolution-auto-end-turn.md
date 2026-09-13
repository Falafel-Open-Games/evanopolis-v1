# 0009 - Card Resolution Auto End Turn

Date: 2026-09-13

## Status

- Superseded by [0010 - Card Panel End Turn Followup](0010-card-panel-end-turn-followup.md).

## Next Work

Make affordable `Suerte` and `Destino` card acknowledgement end the player's
turn in the same server command.

## Decision

- Keep `request_resolve_card` as the single active-player card acknowledgement
  command.
- For affordable V1 `eva_delta` cards, resolving the card also advances to the
  next active player.
- Emit both `card_resolved` and `turn_ended` events from that command.
- Keep unaffordable card debt on `request_accept_game_over`.

## Why

- Today's cards are simple and have no optional follow-up decisions.
- Requiring `APPLY CARD` and then `END TURN` slows the game without adding
  player agency.
- A single command keeps the UI and protocol easier to demonstrate tomorrow.

## Expected Outcome

- After pressing `APPLY CARD`, the next active player can roll.
- The active player does not need a second end-turn click after card effects.
- Server rules, protocol docs, and tests reflect the behavior.

## Result

- Implemented and tested, then intentionally reversed after manual play.
- Reason: the rest of the game already uses a two-step decision rhythm
  (`BUY`/`PAY RENT`, then `END TURN`).
- Follow-up direction: keep the two-step protocol, but keep players in the same
  card panel and replace `APPLY CARD` with `END TURN`.
