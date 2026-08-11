# Game Server Backlog

This backlog tracks known improvements for the TypeScript game server that are
useful but not required for the current playable-demo slice.

## Transport Hardening

### Unjoined socket timeout

Status: desired later improvement

Anonymous WebSocket connections are allowed before `join_match` so the debug
page can show transport connection separately from match/session identity.

For public deployments, add a timeout for sockets that connect but do not send
a valid `join_match` within a short window, such as 15 to 30 seconds.

Expected behavior:
- socket opens
- server starts an unjoined timeout
- valid `join_match` clears the timeout
- if the timeout expires first, server closes the socket

Rationale:
- keeps anonymous WebSocket support simple for local/debug use
- avoids letting idle unjoined sockets accumulate indefinitely
- does not require wallet auth, accounts, or production identity work

### Heartbeat and dead-connection cleanup

Status: desired later improvement

Add server-side heartbeat checks for connected WebSocket clients.

Expected behavior:
- server periodically sends ping frames or heartbeat messages
- responsive clients keep their session connected
- clients that stop responding are closed
- closed player/spectator sessions are reflected in snapshots

Rationale:
- detects broken mobile/browser/network connections faster than passive close
- keeps player connection status accurate
- prevents stale sockets from lingering behind proxies

### Message size limit

Status: desired later improvement

Reject or close connections that send messages larger than the protocol needs.

Expected behavior:
- define a small maximum inbound message size for the free-play protocol
- reject oversized messages before JSON parsing when possible
- close abusive sockets with a clear close reason

Rationale:
- protects the server from accidental or malicious large payloads
- keeps protocol expectations explicit

### Per-socket message rate limit

Status: desired later improvement

Add a simple rate limit for inbound WebSocket messages.

Expected behavior:
- track message count per connection over a short time window
- reject or close clients that exceed the limit
- keep normal turn-based usage unaffected

Rationale:
- prevents one client from spamming commands or invalid JSON
- useful before public review links are shared widely

### Origin checks

Status: desired later improvement

Restrict browser-originated WebSocket connections when the staging/public
surface is known.

Expected behavior:
- allow localhost during development
- allow the GitHub Pages review origin in staging
- reject unexpected browser origins when enabled

Rationale:
- keeps the public staging server from being casually embedded or driven from
  unrelated web pages
- should remain configurable so local tools and tests are not blocked

### Structured transport logs

Status: desired later improvement

Add concise structured logs for connection lifecycle, joins, rejections,
takeovers, disconnects, and accepted commands.

Expected behavior:
- log `connection_id`, `match_id`, `client_id`, `player_id`, command type, and
  rejection reason where applicable
- avoid logging large full snapshots by default
- keep logs readable in Fly and container output

Rationale:
- makes staging issues diagnosable without attaching a debugger
- helps distinguish core transport failures from game-rule rejections

### Runtime schema validation

Status: desired later improvement

Replace manual message parsing checks with explicit runtime schemas once the
protocol stabilizes.

Expected behavior:
- validate inbound command envelopes and payloads
- validate server message shapes in tests
- keep validation errors stable and client-readable

Rationale:
- reduces ad hoc validation code
- gives the Godot client and debug page a clearer protocol contract

## Testing Improvements

### Additional protocol and client-facing tests

Status: desired later improvement

Add focused tests for protocol behavior that is useful but not required for the
current early-demo checkpoint.

Candidate tests:
- WebSocket upgrade to a non-`/match` path is rejected or closed cleanly
- `request_end_turn` over WebSocket broadcasts the next active player and
  expected available actions
- unknown gameplay command sent over WebSocket returns `unknown_command`
- debug page scenario flows are covered by lightweight browser automation
- staged deployment smoke checks cover both `/health` and a minimal WebSocket
  connect/join flow
- future semantic `match_event` messages are emitted in the expected order once
  that protocol feature exists

Rationale:
- current unit and integration coverage protects the main early multiplayer
  invariants
- these tests become more valuable as the protocol stabilizes and the Godot
  client starts depending on more exact message sequencing
- browser/debug-page tests should wait until the debug UI stops changing rapidly

## State And Deployment Hardening

### Semantic match events

Status: initial implementation landed

Broadcast server-authored semantic events alongside authoritative snapshots.

Expected behavior:
- accepted commands can emit events such as `dice_rolled`, `pawn_moved`, and
  `turn_ended`
- events include the match revision they produced and enough payload for client
  logs, animations, and replay/debug tooling
- snapshots remain the source of truth for reconnects and state resync
- clients may render directly from snapshots, but do not need to infer every
  user-facing game event by diffing snapshots

Rationale:
- the current debug timeline mostly sees repeated `match_snapshot` messages
- semantic events make online demos easier to explain
- game clients need event-level information for animations and user feedback
- keeping snapshots plus events separates authoritative state from presentation
  history

Follow-up candidates:
- add more event types as Evanopolis rules become richer
- persist events for replay/debug tooling once persistence exists
- decide whether join/disconnect lifecycle events should use the same
  `match_event` stream or remain transport/session messages

### Persistence or sticky routing before multiple Machines

Status: required before scaling beyond one Fly Machine

The current staging server stores matches in memory. Running multiple Machines
would split match state unless traffic is sticky to one Machine or state is
externalized.

Expected behavior before horizontal scale:
- choose one of:
  - persistent shared match state
  - durable event log plus recovery
  - sticky match routing
- document the operational model
- update Fly deployment settings only after that model exists

Rationale:
- current `--ha=false` single-Machine staging is intentional
- multiple Machines would make clients in the same match see different state

### Snapshot or event persistence

Status: desired later improvement

Persist enough state to recover matches across deploys or process restarts.

Expected behavior:
- store latest match snapshot or append accepted events
- recover in-memory match registry at startup when persistence is enabled
- keep persistence optional for local tests

Rationale:
- current in-memory matches are fine for early demos
- restart safety becomes important once real review matches last longer

### Graceful shutdown

Status: desired later improvement

Handle process shutdown so connected clients receive a clear server-closing
signal before the process exits when possible.

Expected behavior:
- stop accepting new sockets
- notify connected clients
- close sockets cleanly
- flush any future persisted state

Rationale:
- improves deploy behavior
- reduces confusing client-side disconnects during staging updates
