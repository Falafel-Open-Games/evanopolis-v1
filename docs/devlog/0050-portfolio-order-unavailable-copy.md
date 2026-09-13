# 0050 - Portfolio Order Unavailable Copy

Date: 2026-09-13

## Status

- Done.

## Next Work

Make the portfolio read-only footer copy accurate for maxed properties as well
as unaffordable orders.

## Decision

- Use the generic copy `No development orders available`.
- Avoid implying that EVA affordability is always the blocker.

## Expected Outcome

- Maxed terrain states and unaffordable terrain states both read correctly.

## Implementation Notes

- Changed the portfolio read-only footer to `No development orders available`.
- Updated the client panel test expectation.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
