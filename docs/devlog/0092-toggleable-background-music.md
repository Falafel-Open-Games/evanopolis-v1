# 0092 - Toggleable Background Music

Date: 2026-09-18

## Result

- Loop `Sketchbook 2025-11-26.ogg` at a low background level in the
  server-connected game. The music starts enabled.
- Add a quaver icon at the bottom right of the game view. It pauses and resumes
  music without restarting the track, and its tooltip and tint show the state.
  The replay controls stay at the bottom left.
- Export only the selected track and icon with the Godot Web client.

## Assets

- Music: `Sketchbook 2025-11-26.ogg` from Abstraction's Music Loop Bundle,
  CC0. The bundle's `_LICENSE.txt` is included for provenance.
- Icon: `Media_Musical_Note_Quaver.png` from the supplied 1-bit Pixel Icons
  set.

## Verification

- `just godot-test` checks the loop setting, icon, and toggle states.
- `just godot-web-export`
