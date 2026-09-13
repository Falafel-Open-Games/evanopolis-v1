# 0055 - Toast Bottom Left Placement

Date: 2026-09-13

## Status

- Done.

## Next Work

Move gameplay toast notifications to the bottom-left side of the viewport.

## Decision

- Keep the toast near the bottom so it still reads like lightweight event
  history.
- Anchor it to the left side so it does not cover property, card, buy, or end
  turn buttons.
- Preserve the slide-up animation from below.

## Expected Outcome

- Toasts remain visible but stop competing with the main decision panels.

## Implementation Notes

- Re-anchored `ToastPresenter` to the bottom-left side of the viewport.
- Kept the slide-up animation from below.
- Updated the visual-review debug rent toast sample to match the richer rent
  message shape.
- Added a client test that asserts the toast remains bottom-left anchored.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
