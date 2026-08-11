# Minimal Multiplayer Core

This note defines the first implementation boundary for a small reusable
turn-based multiplayer core and the Evanopolis-specific rules adapter that will
use it.

The immediate goal is still a playable Evanopolis demo. Reuse for future
turn-based games is a useful side effect, not a reason to add abstractions
before the first slice needs them.

## Goal

Build the smallest server-authoritative loop that can support:
- match creation by id
- player seating and spectators
- reconnect-friendly client identity
- command validation against a match revision
- snapshot broadcast after accepted state changes
- Evanopolis V1 movement from server-owned dice rolls

The first playable demo should prove this flow:

1. A browser client joins a match.
2. The first 3 clients become players.
3. Later clients become spectators.
4. The active player requests a dice roll.
5. The server rolls, moves the pawn, and advances match revision.
6. All clients receive a fresh snapshot.
7. Godot renders pawn positions and dice from that snapshot.

## Non-Goals

Do not implement these in the first core slice:
- wallet login
- paid entry
- rooms, invitations, or matchmaking
- referrals, jackpot, or prize distribution
- durable persistence
- anti-abuse controls
- property purchase
- rent or money transfers
- terrain development
- cards, jail, or jackpot spins
- production identity customization

These features can be layered in later without changing the basic core/rules
boundary.

## Core Responsibilities

The multiplayer core owns infrastructure that is common to turn-based games:
- in-memory match registry
- match id lookup and lazy match creation
- client session tracking
- player seat assignment
- spectator assignment
- reconnect token mapping for local review sessions
- match lifecycle phase
- monotonic match revision
- generic command envelope validation
- stale command rejection through `seen_revision`
- command dispatch into the active rules adapter
- snapshot broadcast to connected players and spectators
- command rejection messages

The core should know that a match has players, spectators, revisions,
snapshots, and commands. It should not know what an Evanopolis board, tile,
dice roll, property, or EVA balance means.

## Rules Adapter Responsibilities

The rules adapter owns game-specific behavior. For Evanopolis V1, that adapter
owns:
- initial game state
- board size and board-space vocabulary
- player positions
- active player selection
- dice outcomes
- movement rules
- available action names
- command-specific validation
- public static definition shape
- public snapshot shape

The first Evanopolis adapter should only support:
- `request_roll`
- `request_end_turn`

Property purchase, rent, terrain development, cards, and jail should be added
as later adapter commands after their rules are sufficiently settled.

## Command Envelope

All client commands should use one generic outer shape:

```json
{
  "type": "request_roll",
  "match_id": "demo",
  "client_id": "browser-token",
  "player_id": "player_1",
  "seen_revision": 12,
  "payload": {}
}
```

The core validates the envelope fields that are independent of game rules:
- match exists or can be created
- client is known or can join
- player id matches the seated client when a player command is required
- spectator clients cannot send player-only commands
- `seen_revision` is current enough for the command policy

The rules adapter validates the command type and payload.

## Definition And Snapshot Policy

Definitions carry static ruleset data. Snapshots are the dynamic recovery path.
A client must be able to rebuild the current dynamic render state from the
latest `match_snapshot` plus the latest `match_definition` without replaying
older events.
See [`game_server_protocol.md`](game_server_protocol.md) for the stable
protocol rules around definitions, revisions, snapshots, semantic events, and
missed messages.

A first Evanopolis definition should include:
- `match_id`
- `ruleset_id`
- `spaces`

A first Evanopolis snapshot should include dynamic state:
- `match_id`
- `revision`
- `phase`
- `local_player_id`, when serialized per client
- `active_player_id`
- `players`
- `spectators`
- `dice`
- `available_actions`

Events can be added for animation and logs, but the snapshot remains the source
of truth for sync and reconnect.

## Reconnect Policy

For the free-play demo, reconnect identity can be a random browser token stored
in local storage.

The token is not authentication. It only lets a local or review browser recover
the same player seat after refresh.

Reconnect behavior:
- a known token regains its previous player seat when possible
- unknown tokens receive the next open player seat
- unknown tokens become spectators when seats are full
- every successful reconnect receives the latest definition and snapshot
- only one WebSocket may be active for a given `client_id` in a match
- if the same `client_id` joins from a newer socket, the newer socket takes
  over and the older socket is closed with `session_replaced`

Production authentication can replace this identity layer later without
changing the rules adapter.

## Guardrails

Keep these boundaries explicit:
- no Evanopolis-specific rules in the generic core
- no WebSocket or HTTP assumptions in the rules adapter
- no wallet, payment, or room logic in the match engine
- no hidden client authority over dice, movement, money, or ownership
- no unresolved product rules implemented as silent defaults

When a rule is needed but not yet specified, mark it with one of:
- `CLIENT_DECISION_REQUIRED`
- `TEMPORARY_V1_ASSUMPTION`
- `NOT_IMPLEMENTED`

## Suggested First File Shape

The exact language and framework can change, but the first code should preserve
this separation:

```text
apps/game-server/src/
  multiplayer-core/
    command_envelope.*
    match_registry.*
    match_session.*
    snapshot_broadcaster.*
  evanopolis-rules/
    board_v1.*
    evanopolis_match_state.*
    evanopolis_rules_adapter.*
```

Tests should start at the core/rules boundary:
- first 3 clients become players
- fourth client becomes spectator
- known client token reconnects to the same seat
- non-active player cannot roll
- active player can roll once
- accepted roll increments revision and changes position
- stale command is rejected
- snapshot contains enough state for Godot to render pawns and dice
