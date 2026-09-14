# 0068 - Wrapper Invite Mode

Date: 2026-09-14

## Goal

Make invite links feel like a join flow instead of showing room creation as the
main action after public room lookup succeeds.

## Changes

- Added an explicit invite/join mode to `apps/web-wrapper/room-entry.html`.
- Room-entry URLs with `game_id` now:
  - look up the room through Rooms API
  - show public room metadata
  - show the creator display name as the room host
  - hide the create-room form
  - show a join panel that requires wallet login before continuing
- The current join action stops at a clear payment-gate placeholder, since EVA
  approval/payment verification is the next production slice.
- Added a "Create Another Room" path to return to create mode and remove the
  invite id from the URL.
- Updated wrapper local-run docs.

## Validation

- `node --check apps/web-wrapper/room-entry.js`
