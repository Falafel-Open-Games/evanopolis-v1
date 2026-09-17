# 0089 - Special Purchase And Development Toasters

Date: 2026-09-17

## Context

The server already emitted `special_property_purchased` and
`development_order_delivered`, but the client did not turn them into toasts or
include them in the new replay controls.

## Result

- Special-property purchases use the same observer toast as terrain purchases.
  The buyer can still replay the event without seeing a duplicate live toast.
- A delivered container or machine lot produces a toast for every player after
  the turn handoff presentation, before the receiving player rolls.
- Both event types appear in the recent-event replay controls and return in
  snapshots after refresh.

## Verification

- `just godot-test` covers live messages, timing, and replay from a snapshot.
- `just godot-server-client-check`
- `just godot-web-export`
