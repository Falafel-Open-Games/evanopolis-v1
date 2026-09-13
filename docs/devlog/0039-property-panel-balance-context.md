# 0039 - Property Panel Balance Context

Date: 2026-09-13

## Status

- Done.

## Next Work

Replace the floating status bar compact mode with decision-local balance
context.

## Decision

- Hide the floating player status bar while the property decision panel is
  visible.
- Add the local player's EVA balance to the property decision panel.
- Keep the panel-owned action buttons as the place where the player resolves the
  property/special-property decision.

## Expected Outcome

- Property and special-property choices still show the player's balance.
- The top-right board area remains clear for containers/miners while zoomed in.
- The normal status bar returns after the decision panel closes.

## Result

- Property and special-property panels now include a local balance line.
- The floating player status bar is hidden while the property decision panel is
  visible.
- The status bar returns as soon as the decision panel is no longer visible.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
