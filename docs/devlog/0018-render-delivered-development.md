# 0018 - Render Delivered Development

Date: 2026-09-13

## Status

- Done.

## Next Work

Reflect authoritative delivered terrain development on the Godot board.

## Decision

- Use `terrain_developments` from the server snapshot as the source of truth.
- Show a container for delivered level `1+`.
- Show miner props from `machine_lot_count` for delivered levels `2` through
  `5`.
- Keep delivery animation out of this slice; first make snapshot rendering
  correct and testable.
- Update owned tile face rent labels to use the developed rent row.

## Why

- The portfolio/order loop is playable, but board state does not yet show what
  was delivered.
- Static authoritative rendering is the foundation for a later delivery
  animation/polish slice.

## Expected Outcome

- Delivered containers/miners appear on board spaces after snapshot refresh.
- Removing or transferring development clears/updates the displayed props.
- Owned tile rent labels reflect delivered development level.
- Server rent behavior remains covered by existing rules tests.
- Godot tests/checks remain green.

---

## Result

- The Godot client now refreshes the `ContainerLayer` from authoritative
  `terrain_developments` on every snapshot presentation refresh.
- Delivered level `1+` shows a container on the developed tile.
- Delivered machine lots show the matching miner prop count from
  `machine_lot_count`.
- Owned property tile faces now display rent from the delivered development
  level instead of the base rent.
- Added a Godot server-client test fixture that verifies a level 3 terrain shows
  a container with two miners and displays `5 EVA` rent on the tile face.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
