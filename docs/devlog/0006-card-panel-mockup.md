# 0006 - Card Panel Mockup

Date: 2026-09-13

## Status

- Done.

## Next Work

Create a first-draft Godot UI panel for `Suerte` and `Destino` card
presentation.

## Decision

- Use a dedicated card panel instead of reusing the property decision panel.
- Reuse the existing tile SVG icons so players visually connect board spaces
  to card categories.
- Keep the mockup scene self-contained with sample card data before wiring it
  to live server state.

## Why

- Card resolution is a different game moment than property purchase/rent.
- A separate panel avoids property-specific clutter like rent tables.
- A mockup-first scene lets us tweak visual design without touching gameplay
  flow yet.

## Expected Outcome

- a `card-resolution-panel.tscn` scene
- a `card_resolution_panel.gd` script with sample data helpers
- headless Godot checks pass

## Result

- Added a dedicated card resolution panel scene.
- Reused the existing Suerte and Destino tile SVG icons.
- Added a review-scene debug toggle on `X`:
  hidden -> Destino -> Suerte -> game-over -> hidden.
- Documented the new debug key in the web wrapper review page.
