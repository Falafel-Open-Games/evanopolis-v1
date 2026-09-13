# 0012 - Portfolio Development Planning

Date: 2026-09-13

## Status

- Done.

## Next Work

Plan the portfolio button/panel and the protocol/server work for terrain
development with containers and mining machine lots.

## Decision

- Treat this as a planning slice because the feature crosses rules, protocol,
  server state, rent calculation, board rendering, and UI.
- Use
  [`docs/backlog/portfolio-development-plan.md`](../backlog/portfolio-development-plan.md)
  as the implementation roadmap.
- Keep the first implementation focused on terrain development only; defer
  Importadora gates, equipment commissions, special-property purchases, bank
  purchase splits, and jackpot accounting to later slices.
- Use an order-vs-delivery model: players can order development from the
  portfolio while waiting, paying immediately; paid orders are delivered and
  become rent-active at the start of their own turn before rolling.
- Allow ordering during another player's turn or during the owner's own
  pre-roll phase, but not during the owner's post-roll resolution/end-turn
  phase.
- Do not allow voluntary cancellation of paid development orders in V1.

## Why

- The feature is large enough that a direct implementation would be risky.
- The existing code already has a disabled Portfolio button and container
  renderer, so a staged plan can produce visible progress quickly without
  losing protocol clarity.

## Expected Outcome

- A written plan that defines temporary V1 decisions, client approval questions,
  protocol shape, server tasks, Godot tasks, and suggested implementation
  slices.

## Result

- Added the portfolio/development planning document.
- Proposed server snapshot/command/event shapes for `terrain_developments`,
  `development_orders`, `request_order_development`, and automatic pre-roll
  delivery.
- Proposed four follow-up slices: server protocol, panel mockup, integration,
  and polish/client-questions.
