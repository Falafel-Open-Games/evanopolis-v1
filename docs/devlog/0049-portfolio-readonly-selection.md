# 0049 - Portfolio Readonly Selection

Date: 2026-09-13

## Status

- Done.

## Next Work

Keep regular terrain rows selectable in the portfolio even when no development
order can currently be sent.

## Decision

- Terrain rows remain selectable/deselectable for inspection.
- Special-property rows and section headers remain passive.
- The order button only appears when `request_order_development` is available.
- When owned rows exist but ordering is unavailable, show a small explanatory
  footer message.

## Expected Outcome

- The portfolio remains responsive in read-only development states.
- Players get a compact hint that there is no currently affordable/available
  development order.

## Implementation Notes

- Terrain rows can now be selected/deselected independently from
  `request_order_development` availability.
- The order button remains hidden unless ordering is currently available.
- Added a compact footer hint for read-only order states.
- Kept special-property rows and section headers passive.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
