# 0101-b - Mobile background audio lifecycle

Status: validated on Brave mobile after replacing unreliable Godot application
notifications with direct Page Visibility integration.

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
- On web exports, subscribe directly to `document.visibilitychange` through
  `JavaScriptBridge` and use `document.hidden` as the authoritative background
  signal. This was added after physical testing showed that Brave did not
  deliver the expected Godot application notifications.

## Validation

The Godot client test exercises focus loss, focus return, direct hidden/visible
page state, and preservation of the muted preference. A first Brave test showed
that application notifications alone did not stop the music on app switch or
screen lock. After adding the direct Page Visibility path and regenerating the
web export, physical testing confirmed that the loop pauses when switching apps
or locking the screen and behaves correctly when returning to the game.
