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

## State And Deployment Hardening

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
