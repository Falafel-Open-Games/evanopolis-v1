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

