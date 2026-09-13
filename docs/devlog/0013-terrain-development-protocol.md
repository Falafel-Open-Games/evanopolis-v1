# 0013 - Terrain Development Protocol

Date: 2026-09-13

## Status

- Done.

## Next Work

Implement the server-side protocol for paid development orders and automatic
pre-roll delivery.

## Decision

- Keep this slice server-only.
- Add authoritative `terrain_developments` and `development_orders` snapshot
  fields.
- Add `request_order_development` as an anytime/pre-roll portfolio command.
- Debit EVA immediately when an order is accepted.
- Deliver paid valid orders automatically when a player becomes active at the
  start of their turn.
- Use delivered development level for future rent calculations.

## Why

- This creates the rules/protocol foundation before building the Godot
  portfolio UI.
- Server tests can validate the important timing rules without UI noise.

## Expected Outcome

- Players can order development for owned terrain outside their own post-roll
  phase.
- Orders are paid immediately and remain in transit until delivery.
- Delivered orders update terrain development and rent.
- Invalid ownership-at-delivery orders are refunded and removed.
- Tests cover ordering, delivery, timing, and rent behavior.

## Result

- Added `terrain_developments` and `development_orders` to authoritative match
  state and snapshots.
- Added `request_order_development`.
- Orders debit EVA immediately and remain in transit until delivered.
- Orders are allowed off-turn and during the owner's own pre-roll phase, but not
  during the owner's post-roll resolution phase.
- Paid orders automatically deliver when the owner becomes the active player.
- Delivered development updates future rent calculations.
- Invalid ownership-at-delivery orders are refunded and cancelled.
- Updated protocol docs and server tests.
