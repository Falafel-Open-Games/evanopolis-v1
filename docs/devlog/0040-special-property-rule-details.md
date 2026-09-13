# 0040 - Special Property Rule Details

Date: 2026-09-13

## Status

- Done.

## Next Work

Show explanatory rule text for special properties in the property decision panel.

## Decision

- Reuse the property decision panel's expandable drawer.
- Keep terrain drawer content as the rent/development table.
- Use the same drawer as a text area for special properties.
- Base copy on the raw rules spec, while marking unimplemented effects as
  informational in the current build.

## Expected Outcome

- Players can inspect what a special property is supposed to do when they land
  on it.
- Special properties still display no rent in the main panel.
- No new panel type is introduced.

## Result

- Special properties now show the property decision panel details button.
- Expanding a special property shows wrapped rule text instead of the terrain
  development table.
- Rule text is derived from the raw spec and includes a current-build caveat for
  effects that are not automated yet.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
