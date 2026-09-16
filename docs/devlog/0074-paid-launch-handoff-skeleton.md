# 0074 - Paid Launch Handoff Skeleton

Date: 2026-09-16

## Goal

Start the wrapper-side production launch handoff without changing the free-play
launcher or pretending paid admission is enforced by the game server yet.

## Changes

- Added a separate paid launch panel to `apps/web-wrapper/room-entry.html`.
- Enabled `Open Paid Client` only when:
  - a room is loaded
  - the wallet auth session is usable
  - payment has been verified or recovered for that wallet and room
- Store the paid launch payload in browser session storage instead of rendering
  the wallet JWT visibly on the page.
- Navigate to the existing server client with `mode=paid_room` and a
  `paid_launch_key` query parameter.
- Show paid launch mode and payload presence in the server-client launch config
  panel for manual validation.
- Documented the wrapper handoff skeleton in `apps/web-wrapper/README.md`.

## Notes

- The free-play launch link remains available for development validation.
- The paid launch payload is only a handoff artifact. The game server still
  needs paid-room join parsing and server-side admission checks before this is a
  production-enforced flow.
- Spectator behavior remains outside production v1 scope.

## Validation

- Static wrapper change; manual browser validation is expected with
  `just serve-web-wrapper`, Rooms API, and `tabletop-auth`.
