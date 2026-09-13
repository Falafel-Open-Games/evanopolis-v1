# 0026 - Card Effect Observer Toast

Date: 2026-09-13

## Status

- Done.

## Next Work

Show a small toast to non-active-turn clients when a luck/destiny card effect is
accepted and resolved.

## Decision

- Trigger from the existing `card_resolved` match event.
- Show the toast only to observers and other players, not to the player who is
  already seeing the card panel flow.
- Keep the message focused on the EVA delta for v1.

## Expected Outcome

- Other players see card EVA gains/losses without needing to inspect the debug
  stream.
- The resolving player keeps the current card panel feedback unchanged.
- Existing Godot checks remain green.

## Result

- `card_resolved` events now show observer-only toast messages for `eva_delta`
  effects.
- Positive effects read as gained EVA from `SUERTE`/`DESTINO`; negative effects
  read as paid EVA from that deck.
- The resolving player does not receive a duplicate toast because the card
  panel already provides their feedback.

## Verification

- `godot --headless --path godot --scene res://game/server-client-main.tscn --quit-after 2 --log-file /tmp/evanopolis-godot-server-client.log -- --no-auto-join`
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
