# 0021 - Salida Pass Reward

Date: 2026-09-13

## Status

- Done.

## Next Work

Implement the spec-defined EVA reward for passing or landing exactly on
`SALIDA`.

## Decision

- Award `+2 EVA` when movement crosses `SALIDA`.
- Award `+3 EVA` total when movement lands exactly on `SALIDA`.
- Emit a `start_bonus_collected` event that also records the spec-defined
  `1` free jackpot roll.
- Do not persist jackpot/free-roll state in this slice; jackpot is still a
  separate roadmap item.

## Why

- `SALIDA` rewards are explicitly defined in the raw rules spec and are core
  Monopoly-like economy behavior.
- The EVA award affects immediate affordability and rent payment, so it belongs
  in the authoritative server movement path.

## Expected Outcome

- Server roll resolution credits the active player before landing actions.
- Crossing, exact landing, and non-crossing movement are covered by tests.
- The delivery roadmap is updated after the slice result is known.

---

## Result

- Server roll resolution now awards `+2 EVA` when a move crosses `SALIDA`.
- Exact landing on `SALIDA` awards `+3 EVA` total.
- Added `start_bonus_collected` events with the EVA amount, movement positions,
  exact-landing flag, and the spec-defined `1` jackpot free roll.
- Jackpot/free-roll persistence remains deferred to the dedicated Jackpot
  roadmap item.
- Updated the Evanopolis schema doc and delivery roadmap.

## Verification

- `just game-server-test`
- `just game-server-test-integration`
