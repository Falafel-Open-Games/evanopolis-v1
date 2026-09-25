# 0101-b - Mobile background audio lifecycle

Status: implementation ready for physical-device validation.

## Problem

Background music continued playing after the player left the Brave browser on
mobile. The game created one looping `AudioStreamPlayer`, but only the visible
music toggle could pause it. No application focus or suspension lifecycle was
connected to the player.

Mobile browsers may keep a tab and its Web Audio context alive after their UI
is dismissed, so leaving the browser does not reliably destroy the game or stop
its audio.

## Change

- Track the player's music preference independently from application activity.
- Pause background music when Godot receives application focus-out or paused
  notifications.
- Re-evaluate playback on focus-in or resumed notifications.
- Never resume music after returning if the player had muted it explicitly.
- Leave gameplay connection and state untouched while the page is backgrounded.

## Validation

The Godot client test exercises focus loss, focus return, and preservation of
the muted preference. Physical validation remains necessary for Brave's exact
Android lifecycle notifications.
