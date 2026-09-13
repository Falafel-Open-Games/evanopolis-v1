# 0020 - Remove Stale Portfolio Tooltip

Date: 2026-09-13

## Status

- Done.

## Next Work

Remove the obsolete Portfolio button tooltip that still says the panel is
planned next.

## Decision

- Remove the tooltip entirely for now.

## Why

- The Portfolio panel already exists and works, so the tooltip is misleading.
- The button label is clear enough without extra helper text.

## Expected Outcome

- Hovering the Portfolio button no longer shows stale planning copy.
- Existing HUD and portfolio behavior stays unchanged.

---

## Result

- Removed the obsolete `Portfolio panel is planned next.` tooltip from the
  Portfolio button scene.
- Re-exported the Godot web build so the browser wrapper picks up the scene
  change.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
