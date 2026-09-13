# 0014 - Development Order Refactor

Date: 2026-09-13

## Status

- Done.

## Next Work

Extract terrain development order helpers out of the main Evanopolis rules
adapter to improve readability without changing behavior.

## Decision

- Keep this as a behavior-preserving server refactor.
- Move pure development-order helpers into a focused rules module.
- Keep command validation, state transitions, and emitted events equivalent to
  slice 0013.

## Why

- `evanopolis-rules-adapter.ts` is now large and owns too many concepts.
- Development ordering will be touched again by the portfolio UI integration, so
  isolating this logic now should reduce risk.

## Expected Outcome

- The adapter delegates development-level/order calculations to a dedicated
  module.
- Existing server and Godot compatibility tests remain green.

## Result

- Added `development-orders.ts` for development order types and pure helpers.
- Moved next-order calculation, order delivery, development-level lookup, rent
  lookup, and board-space lookup out of the main rules adapter.
- Kept the rules adapter responsible for command validation and state
  transitions.
- Reduced `evanopolis-rules-adapter.ts` from roughly 1530 lines to roughly
  1385 lines.
- Re-ran server and Godot compatibility checks successfully.
