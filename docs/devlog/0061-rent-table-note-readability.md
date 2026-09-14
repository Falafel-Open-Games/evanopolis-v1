# 0061 - Rent Table Note Readability

Date: 2026-09-13

## Status

- Done.

## Next Work

Make rent table notes readable after adding bonus explanations.

## Scope

- Increase table-mode details note size.
- Shorten bonus and build-cost copy.
- Keep special property rule text unchanged.

## Expected Outcome

- Bonus explanations are readable without expanding the panel or squinting.
- Notes fit the current property decision panel layout better.

## Implementation Notes

- Raised table-mode details note text from 9px to 11px.
- Shortened bonus copy from `Rent table includes...` to `Bonus: ...`.
- Raised table header and row text to 12px.
- Reduced the terrain-table note minimum height so expanded terrain panels do not keep excess bottom padding.
- Shortened development cost copy to `Container 2 EVA · lot +1 EVA`.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
