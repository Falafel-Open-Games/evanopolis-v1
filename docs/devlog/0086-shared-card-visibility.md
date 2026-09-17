# 0086 - Shared Card Visibility

Date: 2026-09-17

## Status

- Done.

## Context

The post-demo feedback asked for cards drawn on `Destino` to be visible to all
players. The game server already broadcasts `card_drawn` and `card_resolved`
events and includes the pending card in every public snapshot. The Godot card
presenter showed the panel only to the active player.

## Scope

- Show the full pending card to other players in a compact panel without an
  action button.
- Keep the acting player's apply/game-over command path unchanged.
- Close the observer card panel when the card resolves; keep the existing
  observer toast for the result.
- Confirm that observer snapshots include the pending card without exposing
  resolution commands.

## Result

Connected observers see the card during the acting player's decision. When it
resolves, the panel closes and the existing result toast appears. Reviewable
match history remains a separate follow-up slice.

## Verification

- `just game-server-test`
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
