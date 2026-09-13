# 0046 - Portfolio Special Properties

Date: 2026-09-13

## Status

- Done.

## Next Work

Show owned special properties in the portfolio panel without making them
development targets.

## Decision

- Keep terrain rows first and selectable only when development orders are
  available.
- Append owned special-property rows after terrains.
- Special-property rows are passive: visible for status, never selectable for
  development orders.

## Expected Outcome

- The portfolio represents all owned assets.
- Development ordering remains terrain-only.
- Special properties are easy to review without creating invalid actions.

## Implementation Notes

- Added owned special-property rows after the terrain rows in the portfolio
  presenter.
- Marked special-property rows as passive/non-selectable in the portfolio UI.
- Changed the empty state copy to cover all owned property types.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
