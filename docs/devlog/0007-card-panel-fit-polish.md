# 0007 - Card Panel Fit Polish

Date: 2026-09-13

## Status

- Done.

## Next Work

Polish the card panel game-over presentation after visual review.

## Decision

- Keep the panel layout from the first mockup.
- Make danger-state effect text slightly smaller than normal EVA deltas.
- Give the action column enough width for `ACCEPT GAME OVER`.
- Keep the same sample toggle flow on `X`.

## Why

- The normal card effects read well.
- The insufficient-balance case has longer copy and needs its own sizing.
- The mockup should remain easy to compare in the review scene.

## Expected Outcome

- `INSUFFICIENT EVA` fits with better hierarchy.
- `ACCEPT GAME OVER` fits inside the button.
- Godot headless checks pass.

## Result

- Reduced the danger-state effect label font size.
- Widened the action column and card panel bounds for the game-over button.
- Kept normal card effect sizing unchanged.
