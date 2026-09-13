# 0027 - Property Purchase Observer Toast

Date: 2026-09-13

## Status

- Done.

## Next Work

Show a toast to other clients when a player buys a terrain.

## Decision

- Trigger from the existing `property_purchased` match event.
- Show the toast only to observers and other players, not to the purchasing
  player.
- Resolve the terrain name from the client-side match definition.

## Expected Outcome

- Waiting players and spectators get immediate feedback when ownership changes.
- The buying player keeps the existing property panel/action feedback.
- Existing Godot checks remain green.

## Result

- `property_purchased` events now show observer-only toast messages.
- The toast resolves the terrain label from the match definition.
- The purchasing player does not receive a duplicate toast.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
