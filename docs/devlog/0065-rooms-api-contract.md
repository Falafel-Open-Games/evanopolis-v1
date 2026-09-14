# 0065 - Rooms API Contract

Date: 2026-09-14

## Status

- Done.

## Next Work

Start replacing the free-play first-join bootstrap with a production room
metadata surface.

## Scope

- Add a small `apps/rooms-api` TypeScript service.
- Implement `GET /healthz`.
- Implement authenticated `POST /v0/rooms`.
- Implement public `GET /v0/rooms/:game_id`.
- Add optional JSON-file room persistence.
- Add contract tests for creation, lookup, validation, auth boundary behavior,
  and persistence.

## Expected Outcome

- The wrapper can target a real room creation and invite lookup contract in the
  next slice.
- The game server has a future trusted room metadata source to hydrate matches
  from, instead of relying on client-supplied first-join settings.
- Local development can use in-memory rooms by default or `ROOMS_DATA_FILE` for
  simple durable room metadata.

## Implementation Notes

- Used Node's built-in HTTP server to keep the service dependency-light and
  aligned with this repo's current game-server style.
- Kept the previous v0 contract shape:
  - `creator_display_name`
  - `entry_fee_tier`
  - derived `entry_fee_amount`
  - `player_count`
  - optional `experimental.turn_duration_seconds`
- Verified bearer tokens through `AUTH_BASE_URL` + `AUTH_VERIFY_PATH`.
- Public room lookup omits `created_by` so invite pages do not expose the
  creator wallet address.
- Added `rooms-api-*` commands to the root `justfile`.

## Verification

- `npm test --prefix apps/rooms-api`
