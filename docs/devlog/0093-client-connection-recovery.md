# 0093 - Client Connection Recovery

Date: 2026-09-22

## Result

- Replace the raw `socket_not_open` rejection with automatic reconnect attempts
  using short, capped backoff delays.
- Disable game actions while the connection is unavailable so stale buttons do
  not send commands to a closed socket.
- Stop automatic retries when the same seat is opened elsewhere and offer a
  deliberate **Resume Here** action. This prevents two tabs from repeatedly
  taking the seat from each other.
- Ask the paid-game wrapper to reopen its wallet signature flow when the join
  token has expired.
- Detect a lower server revision after reconnect and explain that the active
  match could not be recovered after a server restart.

## Operational Limit

Active matches still live in server memory. Reconnection restores a client only
while the server still has that match; persistence remains a delivery decision.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `node --test apps/web-wrapper/test/server-client-launcher.test.mjs`
- `just godot-web-export`
