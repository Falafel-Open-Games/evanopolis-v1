# 0017 - Portfolio Order Development

Date: 2026-09-13

## Status

- Done.

## Next Work

Connect the Portfolio panel to the existing `request_order_development`
protocol so a player can select a terrain and place a paid development order
from the client.

## Decision

- Keep this as the first narrow client integration slice.
- Require selecting one terrain row before enabling the footer order action.
- Send `request_order_development` with `payload.space_id`.
- Keep the server authoritative for validation, cost, balance changes, and
  pending order creation.

## Why

- The server protocol and tests already exist, so this can produce visible
  gameplay progress quickly.
- Explicit selection prevents mystery orders while keeping the first ordering
  UI compact.
- Once ordering works end to end, per-row buttons or richer detail states can
  be refined with real play feedback.

## Expected Outcome

- The Portfolio panel keeps the order button disabled until the player selects
  one terrain row.
- Selecting a terrain row updates the order button for that terrain.
- Pressing the button sends `request_order_development` for the selected
  terrain.
- The panel refreshes from the authoritative snapshot after the server accepts
  or rejects the command.
- Godot tests/checks remain green.

## Result

- Added payload support to the Godot player command builder.
- Connected the Portfolio footer button to `request_order_development`.
- Portfolio rows are selectable and show a clear selected border.
- The button starts as `SELECT TERRAIN`, then shows the selected terrain's next
  order kind/cost, and remains disabled when ordering is unavailable.
- Portfolio now expands under the status bar instead of acting as a separate
  panel, with the HUD `PORTFOLIO` button as the only toggle.
- Rows are sorted by board index so same-neighborhood owned terrain stays
  grouped in board order.
- When ordering is unavailable, the portfolio becomes read-only: rows do not
  select and the footer button is hidden.
- In-transit order text and order button labels spell out container/lot counts,
  with prices only shown in button parentheses.
- Tracked the last command payload in the client view model for focused tests.
- Extended the server-client panel test to verify selection is required before
  the order command and `payload.space_id`.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
