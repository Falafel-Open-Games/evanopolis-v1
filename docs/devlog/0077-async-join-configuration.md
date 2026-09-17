# 0077 - Async Join Configuration

Date: 2026-09-17

## Goal

Prepare the game-server join path for server-side paid-room dependencies such
as Rooms API hydration and `tabletop-auth` admission checks.

## Changes

- Allowed `parse_join_configuration` to return either a direct result or a
  Promise.
- Await async join configuration before creating or joining a match.
- Contain unexpected async join failures as `internal_server_error` rejections
  instead of letting message handling crash.
- Added WebSocket integration coverage for:
  - async join configuration success
  - async join configuration failure

## Notes

- Free-play behavior is unchanged.
- Paid-room joins still fail closed until room hydration and admission checks are
  wired into the async seam.

## Validation

- `npm test --prefix apps/game-server`
- `npm run test:integration --prefix apps/game-server`
