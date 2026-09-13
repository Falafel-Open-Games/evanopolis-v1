# 0030 - Rent Formula Audit

Date: 2026-09-13

## Status

- Done.

## Next Work

Audit server rent calculations against the raw rules spec and fix the first
confirmed mismatch.

## Decision

- Treat the current development rent table formula as the authoritative base
  rent table when it matches the spec.
- Add focused coverage for city monopoly rent doubling at level 5.
- Keep special-property rent bonuses for the later special-property effects
  roadmap item.

## Expected Outcome

- Terrain development rent tables remain covered by tests.
- Owning all four terrain in a city at level 5 doubles rent for that city.
- Existing rent payment and development tests remain green.

## Result

- Confirmed the base development rent table already follows the raw spec formula.
- Added the missing full-city level-5 monopoly rent multiplier on the server.
- Mirrored the multiplier in Godot board tile and portfolio rent displays.
- Added server and Godot coverage for the doubled rent behavior.

## Verification

- `just game-server-test`
- `just game-server-test-integration`
- `just godot-test`
- `just godot-server-client-check`
