# 0023 - Visual Review Toast Shortcut

Date: 2026-09-13

## Status

- Done.

## Next Work

Add a Visual Review shortcut for repeatedly previewing toast notifications.

## Decision

- Add `N` as a review-only shortcut.
- Cycle through Tier 1 toast examples, starting with the `SALIDA` reward toast.
- Keep this out of the live server-client command flow.

## Why

- Toast placement, size, color, and timing need fast visual iteration.
- Requiring a full match wraparound to preview the toast makes polish slow.

## Expected Outcome

- Visual Review can trigger sample toasts repeatedly.
- The review page documents the shortcut.
- The browser export includes the shortcut.

---

## Result

- Added `N` as a Visual Review-only shortcut that cycles sample Tier 1 toast
  messages, starting with the `SALIDA` reward toast.
- Added the same toast styling to the Visual Review overlay for fast tuning.
- Updated the Visual Review debug key list.
- Re-exported the Godot web build.

## Verification

- `godot --headless --path godot --scene res://game/game-main.tscn --quit-after 2 --log-file /tmp/evanopolis-godot-review.log`
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
