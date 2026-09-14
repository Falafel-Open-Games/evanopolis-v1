# 0057 - Special Property Board Ownership

Date: 2026-09-13

## Status

- Done.

## Next Work

Show special property ownership directly on the board tiles.

## Scope

- Reuse the existing player colors used by terrain ownership.
- Keep special properties visually distinct from terrain.
- Add test coverage that ownership state changes the special tile face.

## Expected Outcome

- After a special property is purchased, its board tile has an obvious owner
  color marker instead of remaining visually identical to an available tile.

## Implementation Notes

- Reused the existing hidden special tile square mesh as an owner color marker.
- Extended the board tile face layer to cache and update special property tile
  faces.
- The snapshot presentation pass now applies special property ownership colors.
- The refresh path tolerates special property definitions whose tile face is not
  currently mapped in `BoardSpaces`.
- Added a follow-up roadmap note for the pre-existing Importer 1 logical
  index/tile-face mapping mismatch.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
