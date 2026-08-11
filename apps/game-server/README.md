# Evanopolis Game Server

This app is the first TypeScript implementation of the Evanopolis V1
server-authoritative match loop.

## Stack

- Node.js 24+
- TypeScript, strict mode
- Node's built-in test runner
- Plain JSON over WebSocket for match commands and snapshots

The first slice avoids application frameworks. The WebSocket transport is a
thin adapter around the tested match/session core.

## Architecture

The app follows the boundary in
[`docs/architecture/minimal_multiplayer_core.md`](../../docs/architecture/minimal_multiplayer_core.md).

Current source layout:

```text
src/
  multiplayer-core/
    match-registry.ts
    match-session.ts
    types.ts
  evanopolis-rules/
    board-v1.ts
    evanopolis-rules-adapter.ts
test/
  multiplayer-core/
  evanopolis-rules/
  transport/
```

`multiplayer-core` owns reusable turn-based infrastructure:
- match lookup and lazy creation
- player and spectator seats
- reconnect token behavior
- match revision checks
- command envelope validation
- dispatch into a rules adapter

`evanopolis-rules` owns game-specific behavior:
- the 36-space board vocabulary
- player positions
- active player turn state
- `request_roll`
- `request_end_turn`
- public snapshot shape for clients

`src/server.ts` exposes:
- `GET /health`
- `WS /match`

Session invariant:
- one `client_id` has at most one active WebSocket per match
- a later `join_match` with the same `client_id` takes over the seat
- the older socket receives `session_replaced` and is closed

The core should not learn Evanopolis concepts such as dice, tiles, EVA,
properties, rent, cards, or jail.

## Local Setup

From this directory:

```bash
npm install
npm test
```

Useful commands:

```bash
npm run typecheck
npm run build
npm test
npm run test:integration
npm run serve
```

`npm run serve` starts the initial HTTP/WebSocket process on
`127.0.0.1:8788`. Available endpoints:

```text
GET /health
WS /match
```

Set `PORT` to override the local port.

## Contribution Notes

Keep new behavior covered at the core/rules boundary before adding transport.

Good early tests:
- join and reconnect behavior
- player vs spectator command permissions
- stale revision rejection
- active-player validation
- snapshot fields required by Godot

Test ownership:
- `test/multiplayer-core/`: reusable match/session behavior, preferably with
  fake rules adapters.
- `test/evanopolis-rules/`: Evanopolis-specific board, turn, action, and
  snapshot-contract behavior.
- `test/transport/`: HTTP/WebSocket protocol behavior and broadcast semantics.

Avoid adding wallet, room, payment, property, rent, card, or persistence logic
to the reusable core. Those concerns either belong in the Evanopolis rules
adapter or in a later service boundary.

## Next Steps

The next practical milestones are:

1. Expand the static server debug page as the protocol evolves.
2. Add a Godot `WebSocketPeer` adapter that sends command envelopes and applies
   `match_snapshot` messages to the presentation controller.
