# 0041 - Special Property Details Polish

Date: 2026-09-13

## Status

- Done.

## Next Work

Improve special-property rule drawer readability and fix long special-property
tile labels.

## Decision

- Add a text-details mode to the property decision panel for special properties.
- Keep terrain details as the compact rent table.
- Increase rule text contrast and size for special-property descriptions.
- Shorten long board tile labels where needed so they fit the physical tile.

## Expected Outcome

- Special-property rule text reads like primary content, not a footnote.
- Expanded special-property panels remain clear and balanced.
- Long special-property labels avoid clipping on board tiles.

## Result

- Special-property details use a dedicated text mode with a Rule heading.
- Rule copy is larger and higher contrast than the terrain-table footnote.
- Long board labels now use the shorter Workshop name to avoid tile clipping.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
