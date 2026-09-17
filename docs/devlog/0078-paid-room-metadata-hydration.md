# 0078 - Paid Room Metadata Hydration

Date: 2026-09-17

## Goal

Move paid-room joins one step closer to production by making the game-server
hydrate room metadata from the trusted Rooms API instead of relying on
client-supplied room settings.

## Changes

- Added a small paid-room lookup module for `GET /v0/rooms/:game_id`.
- Added `EVANOPOLIS_ROOMS_API_URL` as the game-server-side Rooms API
  configuration point.
- Updated `mode=paid_room` joins to:
  - require a configured Rooms API
  - fetch room metadata for the requested `match_id`
  - validate the public room response shape
  - reject missing or mismatched rooms with stable reason codes
  - still fail closed with `production_admission_required` until admission
    checks are wired to `tabletop-auth`
- Added transport integration coverage for configured, unconfigured, and missing
  room metadata cases.
- Updated operator docs and the delivery roadmap.

## Notes

- Free-play joins remain unchanged.
- The server does not trust browser-supplied room size for paid rooms anymore;
  the next slice can use the hydrated room metadata when calling
  `tabletop-auth` for admission.

## Validation

- `npm test --prefix apps/game-server`
- `npm run test:integration --prefix apps/game-server`
