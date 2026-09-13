# 0044 - Workshop Description Copy

Date: 2026-09-13

## Status

- Done.

## Next Work

Adjust the Workshop special-property description to match the received
city-local rule more closely.

## Decision

- Change only the Workshop description for now.
- Use concise player-facing copy that avoids implementation caveats.
- Keep broader Workshop/Cooling interpretation notes in docs as pending client
  approval instead of changing the source rule.

## Expected Outcome

- The Workshop panel reads naturally and matches its board location.
- The current UI remains clear while the exact rule interpretation stays tracked
  for client approval.

## Result

- Workshop description now says `Terrains in this city collect +10% rent.`
- Added a focused Godot test for the Workshop rule copy.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
