# 0084 - Open PR Integration

Date: 2026-09-17

## Status

- Done.

## Context

After the paid match staging work, a parallel documentation/polish pass had
opened several small PRs against `main`. This slice incorporates those open PR
payloads into the current main line while preserving the newer paid-flow work.

## Scope

- Import the post-demo feedback document and link it from the client demo notes.
- Keep `apps/web-wrapper/game/.gitkeep` tracked so fresh checkouts preserve the
  Godot web export destination.
- Update terrain development rent labels from raw rig increments to player-facing
  lot/rig labels across server snapshots, specs, and Godot UI tests.
- Add the player balance roster popup to the Godot status bar.

## Result

- The opened PR content is now represented in `main`.
- Older PR build-version edits were intentionally skipped; the final wrapper
  review version was regenerated from the current `jj` change.
- The imported terrain-label devlog entry was renumbered to avoid colliding with
  the newer production-entry devlog sequence.

## Verification

- `npm test` in `apps/game-server`
- `just godot-test`
