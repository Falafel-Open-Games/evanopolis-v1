# 0024 - Toast Repeat Animation Fix

Date: 2026-09-13

## Status

- Done.

## Next Work

Fix repeated toast triggers so every toast enters from below consistently.

## Decision

- Animate fixed bottom-panel offsets instead of deriving positions from the
  toast's current animated position.
- Apply the same fix to Visual Review and the live server-client overlay.

## Why

- Triggering the Visual Review `N` shortcut repeatedly could leave the toast
  stuck near the bottom because the next animation used the current position as
  its new target.

## Expected Outcome

- Every `N` press restarts the same slide-in animation from below.
- Runtime event toasts use the same stable animation behavior.

---

## Result

- Toast animation now uses fixed visible and hidden bottom offsets.
- Repeated Visual Review `N` triggers restart the same slide-in animation from
  below.
- Applied the same stable offset animation to the live server-client toast.
- Re-exported the Godot web build.

## Verification

- `godot --headless --path godot --scene res://game/game-main.tscn --quit-after 2 --log-file /tmp/evanopolis-godot-review.log`
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
