# 0051 - Portfolio Order Button Fit

Date: 2026-09-13

## Status

- Done.

## Next Work

Give the portfolio order button enough breathing room for longer labels like
`ORDER CONTAINER (2 EVA)`.

## Decision

- Increase the button minimum width.
- Add horizontal theme padding so text does not sit against the border.

## Expected Outcome

- Portfolio order labels fit comfortably inside the button.

## Implementation Notes

- Increased the portfolio order button minimum width.
- Added left/right content margins on the button.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
