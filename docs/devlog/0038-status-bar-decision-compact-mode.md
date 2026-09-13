# 0038 - Status Bar Decision Compact Mode

Date: 2026-09-13

## Status

- Superseded by [0039 - Property panel balance context](0039-property-panel-balance-context.md)
  after browser validation showed the compact floating status bar still covered
  too much of the zoomed board.

## Next Work

Keep the status bar readable during property/special-property decisions while
reducing how much it covers board props.

## Decision

- Stop fading the whole status bar during property focus.
- Hide disabled primary command buttons while a decision panel owns the current
  action.
- Keep player, balance, owned count, and portfolio visible.

## Expected Outcome

- Balance remains readable while deciding to buy/pass.
- The status bar takes less horizontal space when roll/end-turn is unavailable.
- Existing panel-owned command behavior remains unchanged.

## Result

- Decision panels keep the status bar fully opaque.
- While a property or card panel owns the action, disabled primary commands are
  hidden and the status bar shrinks to a compact width.
- The normal status bar layout returns when the decision panel closes.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
