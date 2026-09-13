# 0037 - Special Property English Board Labels

Date: 2026-09-13

## Status

- Done.

## Next Work

Make the 3D board special-property labels match the English labels used by the
server-driven purchase panel.

## Decision

- Default visible Godot board special-property labels to English for now.
- Defer full localization/string swapping to a later localization slice.

## Expected Outcome

- The board and special-property purchase panel show matching English names.
- `Importadora 2` on the board becomes `Importer 2`.

## Result

- Updated Godot special-property board labels to English defaults.
- Added a Godot regression assertion for the English board-label defaults.
- Rebuilt the Godot Web export so the browser wrapper picks up the label
  change.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
