# 0067 - Wrapper Wallet Auth Boundary

Date: 2026-09-14

## Goal

Replace the temporary room-entry bearer-token field with the real browser
wallet authentication boundary expected for production.

## Changes

- Added wallet login controls to `apps/web-wrapper/room-entry.html`.
- Added SIWE/JWT browser flow in `apps/web-wrapper/room-entry.js`:
  - connect injected wallet
  - switch or add the expected chain when needed
  - request `POST /auth/challenge`
  - sign the SIWE message with `personal_sign`
  - verify through `POST /auth/verify`
  - keep the JWT only in memory
- Room creation now uses the wallet-issued JWT for `Authorization`.
- Wallet account and chain changes invalidate the in-memory session and require
  re-authentication.
- Invite URLs preserve room, auth, and chain configuration.
- Added opt-in Rooms API dev request logs with `ROOMS_API_VERBOSE_LOGS=1`,
  enabled by the local `just rooms-api-serve` recipe.
- Fixed the room-entry empty placeholder so it hides after room metadata is
  rendered.
- Updated wrapper docs, roadmap, and production-entry inventory.

## Notes

- This slice does not add EVA approval/payment yet.
- The free-play server launcher remains available for quick gameplay
  validation.
- Local browser testing requires `../tabletop-auth` to allow the wrapper origin
  in `ALLOWED_ORIGINS`.

## Validation

- `node --check apps/web-wrapper/room-entry.js`
- `just rooms-api-test`
