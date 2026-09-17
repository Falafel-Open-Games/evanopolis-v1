# 0088 - Toast History Replay

Date: 2026-09-17

## Context

Important public events were announced through short toasts, which were easy
to miss during play. A full event list would occupy too much board space.

## Result

- Keep the most recent 40 public match events in the live server session and
  include them in snapshots, so a browser refresh restores the replay source.
- Add a compact history control at the lower left, below the toast: previous,
  next, and latest. Its counter shows the current position. The control
  icons are vector textures, independent of the UI font's glyph coverage.
- Use smaller toast text and grow wrapped toasts upward so the gap above the
  history controls stays fixed.
- Replay eligible events through the existing toast wording. This includes
  card results, purchases, rent, start bonuses, jail changes, and eliminations.
  A player can replay events they caused even when their original notification
  was omitted because the action panel already showed the result.
- Keep this as an in-memory match history. A server restart also resets the
  match itself.

## Verification

- `just game-server-test` checks bounded history and reconnect snapshots.
- `just game-server-test-integration`
- `just godot-test` checks previous/next replay, including a local purchase.
- `just godot-server-client-check`
- `just godot-web-export`
