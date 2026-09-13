# 0048 - Portfolio Special Property Separator

Date: 2026-09-13

## Status

- Done.

## Next Work

Add a labeled separator between terrain rows and special-property rows in the
portfolio panel.

## Decision

- Insert `SPECIAL PROPERTIES` only when the list contains both terrain rows and
  special-property rows.
- Render the separator as a passive label, not as a card and not as a
  selectable row.

## Expected Outcome

- The portfolio list reads as two clear groups.
- Special properties remain review-only assets in the portfolio.

## Implementation Notes

- Inserted a `SPECIAL PROPERTIES` section-header item before the first
  special-property row when terrain rows are also present.
- Updated the portfolio panel to render section headers as passive labels.
- Covered the terrain/header/special-property ordering in the Godot panel test.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
