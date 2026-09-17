# 0087 - Refresh Camera Hydration

Date: 2026-09-17

## Status

- Done.

## Context

Refreshing an observing client during another player's card decision left the
camera at the initial wide board view, while a client that had watched the pawn
move showed the close post-landing view. The initial snapshot camera path only
selected the close view when the local player owned the turn. It also focused
the active pawn before a roll only on forced resync, not on first hydration.

## Scope

- Derive the post-landing camera state from the shared turn snapshot, so all
  clients use the same zoom and active-pawn focus after a roll.
- Focus the active pawn on first hydration before a roll while retaining the
  wide zoom.
- Add regression coverage for observer refresh in both states.

## Result

An observer joining or refreshing during a post-roll decision receives the
close camera view focused on the active pawn. Before the roll, the camera
remains wide but points at that pawn.

## Verification

- Reproduced the camera mismatch with a failing Godot regression test.
- `just godot-test` passes after the fix.
- `just godot-server-client-check`
- `just godot-web-export`
