# 0047 - Portfolio Special Property Visuals

Date: 2026-09-13

## Status

- Done.

## Next Work

Make special-property rows in the portfolio visually distinct from regular
terrain rows.

## Decision

- Keep special properties in the same asset list, after terrains.
- Give special-property rows a warmer full-card background and stronger gold
  border so they read as passive assets, not development targets.
- Add a compact `SPECIAL` category label in the stats column.

## Expected Outcome

- Players can quickly distinguish terrain rows from passive special-property
  rows.
- Terrain selection and development ordering remain unchanged.

## Implementation Notes

- Added special-property row background and border colors to the portfolio
  presenter data.
- Updated the portfolio row renderer to honor per-row background and border
  colors.
- Changed the passive row footer from `Passive asset` to `SPECIAL`.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
