# 0090 - Batched Development Deliveries

Date: 2026-09-17

## Context

Several ordered developments can arrive when one player takes a turn. The
server emits one event per order, so consecutive live toasts replaced one
another and left only the last visible.

## Result

- Collect delivery events for the same turn revision and show one live summary
  after the turn handoff finishes. A single delivery keeps its specific toast.
- Group machine lots delivered to the same terrain in the same turn into one
  replay detail with a quantity. Containers remain separate details. For a
  mixed batch, append the summary after those details so the latest button
  replays the live announcement. A batch made only of lots for one terrain
  shows the grouped detail as its live toast.
- Keep the server's individual delivery events intact; grouping changes only
  the displayed toast history. The batch summary still counts every order.
- Count distinct terrains in the summary. If the bounded server history starts
  partway through an old batch, retain its visible details without inventing
  an inaccurate summary.
- Clear a pending live announcement on disconnect; reconnect restores the
  history from the server snapshot without replaying it automatically.

## Verification

- `just godot-test` covers single delivery timing, a five-delivery batch,
  grouping three machine lots on one terrain, replay order, and a truncated
  history boundary.
- `just godot-server-client-check`
- `just godot-web-export`
