# 0059 - Unified Board Ownership Markers

Date: 2026-09-13

## Status

- Done.

## Next Work

Make terrain and special property board ownership use a consistent visual
language.

## Scope

- Keep terrain tiles showing owner-colored rent values.
- Change special property tiles to show an owner-colored value label instead of
  a large owner-colored slab.
- Keep available special properties showing their price in black.

## Expected Outcome

- Owned terrain and owned special property tiles both communicate ownership via
  the value line.
- Special property ownership remains visible without visually overpowering
  terrain ownership.

## Implementation Notes

- Special property tiles now keep the slab marker hidden when owned.
- Available special property tiles show their price in black.
- Owned special property tiles show `OWNED` in the owning player's color.
- Updated the board ownership test to assert the value label state instead of
  the old slab marker.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
