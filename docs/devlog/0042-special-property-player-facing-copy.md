# 0042 - Special Property Player-Facing Copy

Date: 2026-09-13

## Status

- Done.

## Next Work

Make special-property details read like final in-game copy and reduce the
expanded panel width.

## Decision

- Remove implementation/debug language from special-property rule text.
- Present only the effect description to players.
- Reduce expanded panel width so it does not sit flush against the viewport edge.

## Expected Outcome

- Special-property descriptions feel like product copy, not developer notes.
- Expanded property panels keep a small margin on the left side.

## Result

- Special-property effect text no longer mentions spec/current-build caveats.
- Expanded property panels are narrower, leaving more margin at the viewport
  edge.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
