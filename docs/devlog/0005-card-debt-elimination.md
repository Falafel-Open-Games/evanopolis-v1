# 0005 - Card Debt Elimination

Date: 2026-09-13

## Status

- Done.
- Negative card payments that exceed the active player's balance now require
  `request_accept_game_over`.
- Normal card resolution rejects unaffordable payments instead of creating a
  negative balance.

## Next Work

Handle negative card `eva_delta` effects consistently with rent debt.

## Decision

- If a pending card asks the active player to pay more EVA than they have, the
  player cannot resolve the card normally.
- Available action becomes `request_accept_game_over`.
- Accepting game over eliminates the player with reason
  `insufficient_card_eva`.
- The player's balance becomes `0`.
- Their owned terrain remains in the match but transfers to no player yet only
  if a bank/property liquidation rule is later approved.

## Why

- This keeps card debt from producing negative balances.
- It follows the existing rent-debt pattern: insufficient funds require an
  explicit player acknowledgement before elimination.
- Bank debt does not have a creditor player, so asset liquidation remains a
  client-approval topic.

## Expected Outcome

- card payments larger than balance do not apply immediately
- snapshots expose `request_accept_game_over` for unaffordable card debt
- accepting game over marks the player as `game_over`
- tests cover the unaffordable card path
