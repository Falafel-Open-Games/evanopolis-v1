# 0002 - Provisional Card Deck Contract

Date: 2026-09-13

## Status

- Done.
- Added the provisional card deck contract and match `random_seed` fields.
- Extended by `0003`, which changed simple cards from automatic effects into
  player-acknowledged pending card resolutions.

## Next Work

Next work: turn today's placeholder card decisions into a small protocol/server
contract that can be tested without changing gameplay behavior yet.

## Provisional Decisions

Provisional implementation decisions:
- `Suerte` and `Destino` are separate decks.
- V1 uses 3 simple immediate-resolution cards in each deck.
- Tomorrow's playable placeholder cards only use direct EVA gains/losses
  between the active player and the bank.
- Decks are shuffled at match start.
- Matches expose/log a random seed so dice and card order can become
  reproducible.
- Drawn cards go to the bottom of their deck without reshuffling.

## Approval Watchlist

Client approval watchlist:
- final `Suerte` and `Destino` card text
- whether the two decks should remain separate
- exact card effects and EVA values
- whether final gameplay should include player-to-player payments,
  property-relative payments, movement, jail, jackpot, or keepable cards
- whether drawn cards should return to the bottom or use a discard pile

## Slice Goal

Slice goal:
- expose provisional card deck metadata in `match_definition`
- expose a match `random_seed` in definition and snapshot for future replay
  logging
- keep actual card draw/effect behavior unchanged until the next slice

## Expected Outcome

Expected outcome:
- server tests prove the new card/seed contract is present
- the playable game should behave exactly as before until card effects are
  implemented
