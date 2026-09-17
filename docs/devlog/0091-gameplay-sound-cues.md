# 0091 - Gameplay Sound Cues

Date: 2026-09-18

## Context

The server-connected game had silent dice, pawn movement, card resolution, and
common controls. We auditioned candidate clips in the Web client and kept the
ones selected during the demo preparation session.

## Result

- Play Kenney Casino Audio `dice-throw-1` when a dice roll is presented, and
  stop it if that presentation is cancelled.
- Emit one pawn contact signal per completed hop and play Universal UI Soundpack
  `Minimalist7` on contact. Cancelled movement emits no contact signal.
- Play Kenney Interface Sounds `bong_001` for accepted non-roll commands such as
  purchasing property and ending a turn.
- Play `glass_006` only when the rent table, Players popup, or Portfolio opens.
  Closing a panel is silent, so switching panels cannot layer a closing sound
  over the next opening.
- Play Kenney Casino Audio `card-place-2` once when a pending card panel first
  becomes visible to a player or spectator. Applying a card uses Universal UI
  Soundpack `African4` for a positive EVA delta and `Retro11` for a negative
  delta instead of the normal button sound.
- Export only the selected audio files with the Godot Web build.
- Defer portfolio row selection until its input signal completes. Rebuilding
  the list synchronously freed the clicked row while Godot was using it.

## Audio sources

- Kenney Casino Audio by Kenney Vleugels, CC0; see the included `License.txt`.
- Kenney Interface Sounds by Kenney.
- Universal UI Soundpack by Nathan Gibson, CC BY 4.0; see the included
  `readme.txt` for attribution and license details.

## Verification

- `just godot-test` covers pawn contact timing and the portfolio row input
  regression alongside the existing card and panel tests.
- `just godot-server-client-check`
- `just godot-web-export`
