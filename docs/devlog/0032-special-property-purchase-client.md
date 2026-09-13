# 0032 - Special Property Purchase Client

Date: 2026-09-13

## Status

- Done.

## Next Work

Wire the Godot client to the new special-property ownership protocol so the
active player can buy special properties from the existing decision panel.

## Decision

- Reuse the property decision panel for special-property purchases.
- Hide the terrain development drawer for special properties.
- Treat special properties as owned assets in the status bar count.
- Do not add rent/effect UI yet; this slice only covers ownership and purchase.

## Expected Outcome

- Landing on an affordable unowned special property shows a buy panel.
- Pressing the panel primary action sends `request_purchase_special_property`.
- Owned special properties show an end-turn panel with no rent obligation.
- Existing terrain/card panels continue to behave normally.

## Result

- Reused the existing property decision panel for special-property purchase and
  owned states.
- Hid the development drawer for special properties.
- Added client-side lookup for `special_property_ownership`.
- Counted special properties in the status bar owned-property total.
- Added Godot tests for purchase command wiring, owned no-rent display, and
  owned count.

## Verification

- `just godot-test`
- `just godot-server-client-check`
