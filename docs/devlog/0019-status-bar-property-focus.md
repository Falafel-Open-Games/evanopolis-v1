# 0019 - Status Bar Property Focus

Date: 2026-09-13

## Status

- Done.

## Next Work

Reduce status bar obstruction while the property decision panel is visible.

## Decision

- Keep the status bar mounted so player context does not disappear.
- Fade it heavily while the property panel is visible.
- Restore full opacity when the property panel is hidden.

## Why

- Close camera focus can put developed containers and miners behind the status
  bar.
- The property panel already carries the current action, so the top bar can be
  visually de-emphasized in that moment.

## Expected Outcome

- Developed props remain visible during property rent/buy/end-turn decisions.
- Normal top-bar readability returns outside property-panel moments.
- Godot panel tests cover the opacity state.

---

## Result

- The server-client HUD now fades the player status bar to `16%` opacity while
  the property decision panel is visible.
- The status bar returns to full opacity when the property panel is no longer
  visible.
- Added Godot coverage for both fade and restore states.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
