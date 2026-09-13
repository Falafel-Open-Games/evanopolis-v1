# 0016 - Portfolio Panel Mockup

Date: 2026-09-13

## Status

- Done.

## Next Work

Create the first Godot Portfolio panel draft using current snapshot and
definition data, without sending development order commands yet.

## Decision

- Keep this as a client/UI mockup slice.
- Enable the existing `PORTFOLIO` button.
- Show owned terrain, delivered development, in-transit orders, current rent,
  and next order cost/kind.
- Keep ordering disabled/read-only until a later integration slice.

## Why

- A visible panel will let us evaluate layout and information hierarchy before
  wiring real commands.
- Keeping this non-commanding reduces risk while the UI surface is still being
  shaped.

## Expected Outcome

- The local player can open and close a dedicated Portfolio panel.
- The panel has an empty state when the player owns no terrain.
- The panel lists owned terrain with useful development/order details when the
  player owns property.
- Godot tests/checks remain green.

## Result

- Added a read-only Portfolio panel scene and script.
- Enabled the existing `PORTFOLIO` HUD button as an open/close toggle.
- Shows local owned terrain, delivered development level, current rent,
  in-transit order count, balance, and the next development cost/kind.
- Kept `ORDER SOON` disabled so this slice stays mockup-only.
- Added a server-client panel test covering owned terrain display.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
