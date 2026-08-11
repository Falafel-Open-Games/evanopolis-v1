# Game Server Protocol

This document describes the stable multiplayer protocol contract for the game
server. Game-specific snapshot and event payloads, such as Evanopolis board
fields, may change more often. The envelope, revision, identity, reconnect, and
authority rules described here should remain comparatively stable.

## Transport

Clients connect with WebSocket JSON messages at:

```text
/match
```

The HTTP health endpoint is:

```text
/health
```

Its response includes the repo build identifier used by the wrapper pages:

```json
{"ok":true,"service":"evanopolis-game-server","version":"rmpvmvvq"}
```

All WebSocket messages are JSON objects. Invalid JSON, arrays, `null`, and
other non-object values are rejected.

## Identity

The protocol separates transport identity from game-session identity.

- `connection_id`: server-assigned id for one WebSocket connection
- `match_id`: identifies the match state
- `client_id`: identifies the reconnectable client seat within a match
- `player_id`: identifies a game player seat, when the client is a player
- `spectator_id`: identifies a spectator seat, when the client is a spectator

One WebSocket connection is bound to one `(match_id, client_id)` after
`join_match`.

The current free-play debug flow uses browser-generated `client_id` values. A
future account layer may choose how those client ids are issued, but the
transport/core protocol still treats `client_id` as the reconnectable session
token for one match.

## Connection Lifecycle

After a WebSocket connection opens, the server sends:

```json
{
  "type": "connection_ready",
  "connection_id": "conn_1"
}
```

This means the transport is open. It does not mean the client has joined a
match.

To join a match, the client sends:

```json
{
  "type": "join_match",
  "match_id": "demo",
  "client_id": "browser-1234",
  "player_count": 2
}
```

`player_count` is optional. If present on the first successful join for a
match, it fixes the match size. Supported values are `2`, `3`, and `4`. If it
is omitted, the server uses the default free-play size of `3`.

Once a match exists, reconnects and later joins may omit `player_count` or
repeat the existing value. A different value is rejected with
`player_count_mismatch`.

The server replies:

```json
{
  "type": "join_accepted",
  "role": "player",
  "player_id": "player_1",
  "spectator_id": null
}
```

or:

```json
{
  "type": "join_accepted",
  "role": "spectator",
  "player_id": null,
  "spectator_id": "spectator_1"
}
```

For every accepted join or reconnect, the server sends the joining socket the
static `match_definition`, followed by an authoritative `match_snapshot`
broadcast to connected clients in the match.

Clients do not need to make a separate definition request before they can render
the match. This is intentional: a reconnecting client may have kept its
`client_id` but lost all in-memory static metadata. A later protocol version may
add definition ids or cache negotiation, but the default contract is
self-contained join recovery.

Example definition envelope:

```json
{
  "type": "match_definition",
  "definition": {
    "match_id": "demo",
    "ruleset_id": "evanopolis_v1",
    "spaces": []
  }
}
```

The concrete `definition` object is owned by the active rules adapter. It should
contain static data that clients need to understand snapshots and events, such
as board spaces, localized labels, terrain groups, and fixed prices. It should
not contain frequently changing match state.

## Reconnect And Takeover

Reconnect is modeled as a new WebSocket connection sending `join_match` with a
known `(match_id, client_id)`.

If a previous socket for the same `(match_id, client_id)` is still active, the
new join takes over the session. The previous socket receives:

```json
{
  "type": "session_replaced",
  "reason": "client_id_joined_elsewhere"
}
```

Then the previous socket is closed.

Takeover is scoped to the full `(match_id, client_id)` pair. The same
`client_id` can be connected to a different `match_id` without replacing the
first socket.

## Command Envelope

After joining as a player, a client sends game commands with this envelope:

```json
{
  "type": "request_roll",
  "match_id": "demo",
  "client_id": "browser-1234",
  "player_id": "player_1",
  "seen_revision": 3,
  "payload": {}
}
```

Core fields:

- `type`: command type, interpreted by the game rules adapter
- `match_id`: must match the socket's bound match
- `client_id`: must match the socket's bound client
- `player_id`: must belong to the bound client
- `seen_revision`: match revision observed by the client
- `payload`: command-specific JSON object

Spectators cannot send player commands.

## Revisions

`revision` is the monotonically increasing match-state revision.

Revisions advance on accepted state transitions, including:

- accepted new player joins
- accepted new spectator joins
- accepted game commands

Reconnects to an existing seat do not allocate a new seat. They restore the
seat's connected status and broadcast updated snapshots, but they do not
represent a new game-rule command.

For game commands, `seen_revision` must equal the current match revision. If it
does not, the command is rejected with:

```json
{
  "type": "command_rejected",
  "reason": "stale_revision"
}
```

This keeps turn-based commands deterministic and prevents clients from acting on
old state.

## Definitions, Snapshots, And Events

The protocol has three state-related message families:

- `match_definition`: static match/game metadata
- `match_snapshot`: authoritative current state
- `match_event`: semantic history/presentation context for a state transition

Definitions explain how to interpret the ruleset and static game board. They
are sent on every accepted join/reconnect and may be cached by clients for the
life of the match.

Snapshots are the source of truth for rendering dynamic durable state and
recovering after reconnects.

Events explain what happened. They are useful for logs, animation, user
feedback, and replay/debug tooling, but clients should not require every event
in order to recover current state.

For an accepted command, the server sends semantic events first, then the
snapshot for the same resulting revision.

Example event:

```json
{
  "type": "match_event",
  "match_id": "demo",
  "revision": 4,
  "event": {
    "type": "dice_rolled",
    "player_id": "player_1",
    "die_1": 2,
    "die_2": 5,
    "total": 7,
    "from_position": 0,
    "to_position": 7
  }
}
```

Example snapshot envelope:

```json
{
  "type": "match_snapshot",
  "snapshot": {
    "match_id": "demo",
    "revision": 4,
    "phase": "active"
  }
}
```

The concrete `snapshot` object is owned by the active rules adapter and may
change as the game rules evolve. Static metadata such as board labels and fixed
prices belongs in `match_definition`, not in every `match_snapshot`.

## Authority Rules

Clients should follow these rules:

- render durable game state from the latest `match_snapshot`
- read static game metadata from the latest `match_definition`
- use `match_event` for animation, explanation, logs, and replay/debug context
- never apply an older snapshot over a newer snapshot
- avoid animating an older event after a newer snapshot has already been applied
- do not reject a newer snapshot just because one or more event revisions were
  missed

The latest snapshot wins.

## Missed Messages

Missing `match_event` messages is recoverable. A later `match_snapshot` restores
current state.

Missing a snapshot is also recoverable once a newer snapshot arrives.

If a client sees a revision jump, it may record a debug warning such as
"missed events between revision 3 and 6", but it should still accept the newer
snapshot as authoritative.

## Rejections

Rejected commands are sent as:

```json
{
  "type": "command_rejected",
  "reason": "invalid_seen_revision"
}
```

Known reasons include:

- `invalid_json`
- `invalid_match_id`
- `invalid_client_id`
- `invalid_player_id`
- `invalid_command_type`
- `invalid_seen_revision`
- `invalid_payload`
- `client_not_joined`
- `session_command_mismatch`
- `stale_revision`
- `client_player_mismatch`
- `client_disconnected`
- game-specific rules reasons such as `match_not_active`, `not_active_player`,
  `turn_already_rolled`, `roll_required`, and `unknown_command`

The list will grow as core hardening and game rules grow. Clients should display
unknown reasons in debug tooling and handle them as rejected commands.

## Stable Versus Game-Specific Contract

Stable protocol concepts:

- WebSocket JSON envelopes
- `connection_ready`
- `join_match`
- `join_accepted`
- `session_replaced`
- `command_rejected`
- `match_definition`
- `match_event`
- `match_snapshot`
- `(match_id, client_id)` session binding
- `seen_revision` validation
- snapshot authority and event recovery rules

Game-specific concepts:

- command names such as `request_roll`
- command payload shapes
- event payload shapes such as `dice_rolled`
- definition fields such as board spaces and static prices
- snapshot fields such as dice, money, ownership, cards, or turn-specific
  actions
