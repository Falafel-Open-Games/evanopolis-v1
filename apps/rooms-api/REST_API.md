# Rooms API REST Contract

The Rooms API owns room metadata for the production paid-entry flow. It does
not own live gameplay, payment verification, or winner/result authority.

## Authentication

`POST /v0/rooms` requires:

```text
Authorization: Bearer <jwt>
```

The token is verified by calling:

```text
AUTH_BASE_URL + AUTH_VERIFY_PATH
```

`AUTH_VERIFY_PATH` defaults to `/whoami`.

Public invite lookup does not require auth.

## `GET /healthz`

Returns process health.

Response:

```json
{
  "ok": true
}
```

## `POST /v0/rooms`

Creates durable room metadata.

Request:

```json
{
  "creator_display_name": "Falafel Host",
  "entry_fee_tier": "average",
  "player_count": 3
}
```

Fields:

- `creator_display_name`: 1 to 32 characters after trimming.
- `entry_fee_tier`: one of `cheap`, `average`, `deluxe`.
- `player_count`: one of `2`, `3`, `4`.
- optional `experimental.turn_duration_seconds`: positive integer.

The server derives:

- `game_id`
- `created_by` from JWT `sub`
- `entry_fee_amount`
- `created_at`

Entry fee amounts:

| Tier | Raw Amount | Display |
| --- | ---: | ---: |
| `cheap` | `100000000000000000` | `0.1 EVA` |
| `average` | `500000000000000000` | `0.5 EVA` |
| `deluxe` | `1000000000000000000` | `1 EVA` |

Success response:

```json
{
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_by": "0x20752daFA6AbB5AF33b5073Fa2A37cD37B552985",
  "creator_display_name": "Falafel Host",
  "entry_fee_tier": "average",
  "entry_fee_amount": "500000000000000000",
  "player_count": 3,
  "created_at": "2026-09-14T12:00:00.000Z"
}
```

Errors:

- `400 bad_request`
- `401 missing_token`
- `401 unauthorized`
- `413 body_too_large`
- `502 auth_service_unavailable`
- `502 invalid_auth_response`

## `GET /v0/rooms/:game_id`

Public invite lookup.

Success response:

```json
{
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "creator_display_name": "Falafel Host",
  "entry_fee_tier": "average",
  "entry_fee_amount": "500000000000000000",
  "player_count": 3,
  "created_at": "2026-09-14T12:00:00.000Z"
}
```

`created_by` is intentionally omitted so invite pages do not expose the
creator wallet address.

Errors:

- `404 room_not_found`

## Local Dev Logs

Set:

```bash
ROOMS_API_VERBOSE_LOGS=1
```

This prints compact room create/lookup logs while keeping `/healthz` quiet.
Logs never include JWTs.
