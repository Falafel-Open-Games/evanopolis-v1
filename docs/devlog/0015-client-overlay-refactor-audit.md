# 0015 - Client Overlay Refactor Audit

Date: 2026-09-13

## Status

- Done.

## Next Work

Audit and lightly refactor the Godot server client overlay code before adding
the Portfolio panel.

## Decision

- Keep this behavior-preserving.
- Focus on readability and modularity around overlay/panel command routing.
- Avoid broad visual changes or a full client rewrite.

## Why

- `server_client_main.gd` is already large.
- The Portfolio panel will add another overlay surface with commands and
  snapshot-derived UI state.
- A small cleanup now should reduce the risk of piling more logic into one
  script.

## Expected Outcome

- Identify the safest extraction target.
- Apply a narrow refactor if it improves the next Portfolio slice.
- Keep Godot tests and server-client smoke checks green.

## Result

- Chose the smallest useful extraction around overlay command routing.
- Renamed property decision panel callbacks to primary/secondary action terms,
  which better matches reusable panel semantics.
- Added shared helpers for hiding interaction panels and clearing their command
  state.
- Replaced repeated card/property panel hide-and-clear branches in overlay
  refresh logic.
- Kept behavior unchanged and Godot checks green.
