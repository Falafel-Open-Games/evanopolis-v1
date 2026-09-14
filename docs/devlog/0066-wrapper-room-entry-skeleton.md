# 0066 - Wrapper Room Entry Skeleton

Date: 2026-09-14

## Goal

Add the first production-shaped wrapper entry page without disrupting the
free-play server launcher that is still useful for development and validation.

## Changes

- Added `apps/web-wrapper/room-entry.html` as a separate create-room and invite
  lookup entrypoint.
- Added `apps/web-wrapper/room-entry.js` to call the Rooms API:
  - `POST /v0/rooms`
  - `GET /v0/rooms/:game_id`
- Added temporary bearer-token input for the current pre-wallet-auth slice.
- Rendered created or looked-up room metadata, including invite URL and ticket
  amount.
- Added a launch link into `server-client.html` using the room `game_id` as the
  match id, while leaving payment and admission enforcement for later slices.
- Linked the new room-entry page from the existing wrapper review pages.
- Updated wrapper docs and the production-entry roadmap/inventory.

## Notes

- The free-play launcher remains the direct manual testing surface.
- The room-entry page is intentionally production-shaped but not yet production
  complete: wallet SIWE, EVA approval/payment, payment verification, and
  server-side admission enforcement remain separate upcoming slices.

## Validation

- `node --check apps/web-wrapper/room-entry.js`
