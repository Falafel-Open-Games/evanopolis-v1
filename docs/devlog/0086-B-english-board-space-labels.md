# 0086-B - English Board-Space Labels

Date: 2026-09-17

## Scope

Show `START`, `JAIL`, `DESTINY`, and `LUCK` on the 3D board for the September 18 demo.
Keep board-space IDs and game rules unchanged.

## Result

- Updated the six visible labels in the shared board scene: one start, one jail,
  two destiny, and two luck spaces.
- The visual review and server-connected scenes both inherit this board scene.
- Removed the trailing newline from the jail label.

## Verification

- Checked the five `Label3D` values and both scene inheritance paths.
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`; inspected the generated pack for `START`,
  `DESTINY`, `LUCK`, and `JAIL`.
- Rendered the visual review scene and inspected the full-board capture for
  layout regressions. The captured wide view is too small to judge letter-level
  readability.
