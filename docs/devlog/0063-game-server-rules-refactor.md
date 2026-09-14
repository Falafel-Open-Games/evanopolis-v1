# 0063 - Game Server Rules Refactor

Date: 2026-09-14

## Status

- Done.

## Next Work

Make the Evanopolis game-server rules layer easier to navigate, test, and extend now that the feature set is stable.

## Scope

- Split the large Evanopolis rules adapter into clearer concern modules.
- Keep the multiplayer-core protocol contract unchanged.
- Preserve existing gameplay behavior while improving rule boundaries.
- Add file-level responsibility comments for future maintenance.

## Expected Outcome

- The rules adapter reads as command orchestration instead of a catch-all rules file.
- Card, dice, economy, turn-state, player ledger, and state contract logic can be studied independently.
- Future rule changes have obvious homes and lower risk of accidental cross-concern edits.

## Implementation Notes

- Extracted shared protocol and match-state shapes into `evanopolis-state.ts`.
- Moved card definitions, deterministic deck setup, and draw handling into `cards.ts`.
- Moved deterministic dice rolling into `dice.ts`.
- Moved rent, special-property bonuses, importer commissions, and ownership transfers into `economy.ts`.
- Moved EVA balance, payment, card effect, refund, and elimination mutations into `player-ledger.ts`.
- Moved available-action derivation, jail helpers, active-player navigation, and salida rewards into `turn-state.ts`.
- Added shared deterministic random, rounding, and invariant helpers in `rule-utils.ts`.
- Added `spaceAt` to `board-v1.ts` so board lookup lives with board data.
- Left `evanopolis-rules-adapter.ts` responsible for command validation, command dispatch, public definitions, and snapshots.

## Verification

- `npm run test:all --prefix apps/game-server`
