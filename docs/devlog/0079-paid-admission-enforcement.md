# 0079 - Paid Admission Enforcement

Date: 2026-09-17

## Goal

Complete the first production paid-room join path by enforcing admission through
`tabletop-auth` before the game-server assigns a player seat.

## Changes

- Added a game-server admission client for
  `POST /payments/admission/check`.
- Added `EVANOPOLIS_AUTH_API_URL` as the game-server-side auth/payment service
  configuration point.
- Updated paid-room joins to:
  - hydrate trusted room metadata from Rooms API
  - send the wallet JWT and canonical ticket amount to `tabletop-auth`
  - create/join the live match only when admission succeeds
  - reject denied or unavailable admission with stable reason codes
- Added transport integration coverage for:
  - missing auth API configuration
  - successful paid admission entering a match
  - denied paid admission

## Notes

- Free-play joins remain unchanged.
- The game-server still does not inspect payment proofs or chain data directly;
  it delegates that decision to `tabletop-auth`.
- Paid-room match sizing now comes from trusted room metadata, not browser query
  parameters.

## Validation

- `npm test --prefix apps/game-server`
- `npm run test:integration --prefix apps/game-server`
