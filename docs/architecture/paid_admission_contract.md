# Paid Admission Contract

This document defines the v1 production contract for admitting paid players into
an Evanopolis match.

The core rule is simple: the browser wrapper can guide the player through login
and payment, but the game server makes the final admission decision. A player is
allowed into a paid room only when the game server has confirmed all of these
facts from trusted services:

- the wallet auth token is valid
- the wallet identity in that token is known
- the room exists in Rooms API
- the room's ticket amount is known from room metadata
- `tabletop-auth` confirms that the wallet has verified payment eligibility for
  that room and amount

## Services

### `apps/web-wrapper`

The wrapper owns the browser entry flow:

- wallet login through `tabletop-auth`
- room creation and invite lookup through Rooms API
- EVA balance and allowance checks
- EVA approval and ticket payment
- payment verification and recovery through `tabletop-auth`
- paid-room launch handoff after payment is verified

The wrapper may remember transaction hashes and recent verification responses
for UX continuity. Those values are not trusted for game admission.

### `../tabletop-auth`

`tabletop-auth` owns wallet identity and payment verification:

- verifies wallet signatures
- issues the normal wallet auth JWT
- verifies or recovers room-ticket payments
- persists verified payment records
- exposes a server-side paid-admission check for the game server

For v1, the wallet auth JWT proves identity. Paid admission is checked by the
game server through `tabletop-auth` at join time.

### `apps/rooms-api`

Rooms API owns room metadata:

- `game_id`
- `player_count`
- `entry_fee_tier`
- `entry_fee_amount`
- host display metadata
- creation timestamp and future room policy fields

Rooms API does not verify payments, decide live admission, run gameplay, or own
match state.

### `apps/game-server`

The game server owns live match admission and gameplay:

- validates paid-room join messages
- admits only seated players in the v1 production paid-room flow
- validates the wallet auth token through the auth service
- binds the connection to the authenticated wallet identity
- fetches trusted room metadata from Rooms API
- asks `tabletop-auth` whether the wallet is eligible for the room ticket
- creates or reuses the live match from trusted room metadata
- assigns seats, handles reconnects, and rejects invalid joins

The existing free-play launcher remains separate for development and validation.

## Spectators

Production v1 does not include spectator admission.

Free-play development flows may keep spectator behavior for testing and review,
but paid-room production admission is limited to seated players who pass wallet
auth, room lookup, payment eligibility, and game-server seat assignment.

A future spectator mode should be designed as a separate read-only admission
flow, not as a bypass of paid player admission.

## Trust Rules

The game server must not trust:

- wrapper local storage
- client-supplied payment status
- a raw transaction hash from the browser
- room settings supplied by the first joining client
- client-supplied ticket amount or player count

The trusted sources are:

- `tabletop-auth` for wallet identity and paid-admission decisions
- Rooms API for room metadata
- the game server itself for live seat and match state

## Paid Entry Flow

1. The creator connects a wallet in the wrapper and receives a wallet auth JWT
   from `tabletop-auth`.
2. The creator creates a room through Rooms API.
3. The wrapper receives the room metadata and invite link.
4. The creator pays the room ticket on-chain.
5. The wrapper asks `tabletop-auth` to verify or recover the payment.
6. Invited players follow the invite link and repeat wallet login plus ticket
   payment for the same room.
7. After payment verification, the wrapper launches the graphical client with
   room metadata and wallet auth context.
8. The client connects to the game server and requests to join the paid room.
9. The game server validates identity, room metadata, and paid admission before
   assigning a paid player seat.

## Admission Check

The exact endpoint can be finalized in `../tabletop-auth`, but the game server
needs a server-side check with this meaning:

```http
POST /payments/admission/check
Authorization: Bearer <service-or-player-jwt>
Content-Type: application/json
```

Request:

```json
{
  "player": "0x20752daFA6AbB5AF33b5073Fa2A37cD37B552985",
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": "100000000000000000"
}
```

Success:

```json
{
  "admitted": true,
  "player": "0x20752daFA6AbB5AF33b5073Fa2A37cD37B552985",
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": "100000000000000000",
  "txHash": "0x...",
  "logIndex": 0,
  "blockNumber": 308886252
}
```

Failure should return a stable reason, such as:

- `payment_not_found`
- `payment_mismatch`
- `payment_not_confirmed`
- `payment_reused`
- `admission_denied`

The response must be based on verified payment records, not on client-supplied
claims.

## Launch Payload

The paid-room launch payload should be distinct from the free-play URL query
path.

Suggested payload:

```json
{
  "protocol": "evanopolis-launch",
  "version": 1,
  "mode": "paid_room",
  "gameServerUrl": "wss://...",
  "room": {
    "gameId": "550e8400-e29b-41d4-a716-446655440000",
    "playerCount": 3
  },
  "wallet": {
    "address": "0x20752daFA6AbB5AF33b5073Fa2A37cD37B552985"
  },
  "authToken": "<wallet-session-jwt>"
}
```

The graphical client should treat this payload as connection input only. It does
not decide whether payment is valid.

## Join Message

Production joins should not include client-supplied `player_count`,
`room_buy_in_eva`, or payment status.

Suggested WebSocket message:

```json
{
  "type": "join_match",
  "mode": "paid_room",
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "browser-or-device-session-id",
  "auth_token": "<wallet-session-jwt>"
}
```

Server validation order:

1. Validate the message shape.
2. Validate the wallet auth token with `tabletop-auth`.
3. Bind the connection to the wallet identity returned by the auth service.
4. Fetch room metadata from Rooms API if the match is not already live.
5. Ask `tabletop-auth` whether the wallet has paid admission for the room id
   and room ticket amount.
6. Create or reuse the live match from trusted room metadata.
7. Assign or reconnect the seat for that wallet under game-server policy.

## Reconnect Policy

Reconnect should not require duplicate payment.

Initial v1 policy:

- if the same wallet rejoins the same live room and `tabletop-auth` still
  confirms admission, allow reconnect or seat restoration
- if the wallet auth JWT expired, the wrapper should re-authenticate the wallet
  before reconnecting
- if the server process restarted and lost admitted-seat memory, it can repeat
  the same auth and paid-admission checks

Durable admitted-seat persistence is a later hardening task.

## Rejection Reasons

The game server should reject paid-room joins with stable reason codes:

- `missing_auth_token`
- `invalid_auth_token`
- `room_not_found`
- `admission_room_mismatch`
- `admission_amount_mismatch`
- `payment_not_found`
- `payment_not_confirmed`
- `payment_reused`
- `room_full`
- `duplicate_wallet_not_allowed`
- `production_admission_required`

The wrapper should display these as admission failures, not gameplay errors.

## Implementation Slices

1. Add the paid-admission check contract to `tabletop-auth`.
2. Add wrapper launch state for paid rooms while keeping free-play launch
   separate.
3. Add game-server parsing for paid-room join messages.
4. Add game-server room hydration from Rooms API.
5. Add game-server admission verification through `tabletop-auth`.
6. Bind wallets to seats and cover reconnect and wrong-wallet cases.

## Open Questions

- What exact endpoint and auth mode should the game server use for the
  paid-admission check?
- Should `tabletop-auth` mark payment records consumed at first admission, or
  should the game server own seat-level idempotency?
- What is the exact duplicate-wallet policy for a room?
- Should creator payment happen immediately on room creation or only before
  first launch?
- Which admission state must survive game-server restarts for launch?
