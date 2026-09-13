# 0008 - Card Panel Server Client Integration

Date: 2026-09-13

## Status

- Done.

## Next Work

Wire the card resolution panel into the live Godot server-client flow.

## Decision

- Show the card panel when the local active player has
  `pending_card_resolution`.
- Use `request_resolve_card` for affordable card effects.
- Use `request_accept_game_over` when the server exposes that action for
  unaffordable card debt.
- Derive provisional display text from the known placeholder card ids for now.

## Why

- The server already owns the card draw, effect, action gating, and game-over
  resolution.
- The playable build needs a clear acknowledgment UI for the current protocol.
- Client-side display copy can be replaced by server-provided card metadata in
  a future slice without changing the panel interaction.

## Expected Outcome

- Landing on `Suerte` or `Destino` in the server client shows the card panel.
- Pressing the panel button sends the correct server command.
- Property and status-bar actions do not compete with pending card resolution.
- Godot headless checks pass.

## Result

- Added `pending_card_resolution` access to the Godot client view model.
- Added the card panel to the live server-client overlay.
- Wired the panel action to `request_resolve_card` or
  `request_accept_game_over`, based on server-provided `available_actions`.
- Hid property/end-turn UI while card resolution is pending.
- Included card pending state in post-landing camera hydration.
- Added a focused Godot test for pending-card and unaffordable-card panel
  states.
- Added the card panel scene and script to the Web export allowlist after
  manual browser testing showed the `.pck` was missing the new resources.
- Added a post-export cache-bust step so the wrapper loads a versioned Godot
  `.pck` instead of reusing a stale browser-cached package.
