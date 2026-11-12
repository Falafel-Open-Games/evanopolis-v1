# Paid Seat Reservation Protocol

Status: approved V1 design; implementation pending in Evanopolis and
`tabletop-auth`.

## Goal

Prevent a wallet from submitting an on-chain admission payment after every
seat in a paid room has already been allocated.

The reservation is an off-chain capacity guard. It does not replace payment
verification, does not grant game admission by itself, and does not add a
wallet signature or blockchain request.

## Authorities

- Rooms API owns immutable room terms: room id, ticket amount, player capacity,
  creation time, and expiration time.
- `tabletop-auth` owns durable seat reservations and verified payment records
  in PostgreSQL.
- The configured blockchain and payment contract remain the source of truth
  for whether payment occurred.
- The game server admits a paid player only after `tabletop-auth` confirms a
  verified payment for that wallet, room, and amount.
- The browser coordinates the flow but is never trusted for capacity, price,
  reservation ownership, or payment status.

## V1 Policy

- A paid room expires 24 hours after creation.
- A wallet reserves one seat for 15 minutes immediately before submitting the
  payment transaction.
- One wallet may hold at most one reservation or paid seat in a room.
- Active reservations and verified paid seats both consume room capacity.
- An abandoned unverified reservation stops consuming capacity after expiry.
- A verified payment converts its matching reservation into a permanent paid
  seat for the lifetime of the room.
- Repeated reservation requests by the same wallet are idempotent and return
  the existing active reservation.
- A reservation never admits a player without verified payment.

## Player Flow

1. The player opens the invite and signs in with the wallet as today.
2. The wrapper checks for an existing verified admission as today.
3. Immediately before `play`, the wrapper calls the auth service reservation
   endpoint with the room id and ticket amount.
4. `tabletop-auth` loads trusted room metadata from Rooms API.
5. In one PostgreSQL transaction, `tabletop-auth` serializes allocation for the
   room, expires abandoned reservations, and either returns a reservation or
   rejects the request with `room_full`/`room_expired`.
6. Only after reservation succeeds does the wrapper submit the existing
   on-chain `play` transaction.
7. The wrapper submits the transaction hash to payment verification, including
   the reservation id.
8. `tabletop-auth` verifies the existing blockchain payment proof and, in the
   same durable workflow, marks the reservation paid.
9. The existing admission check and game-server join proceed normally.

There is no new wallet confirmation, contract call, or blockchain read before
payment. The only new user-visible state should be a short
`Reserving your seat...` message.

## Reservation Request

Suggested auth endpoint:

```http
POST /payments/reservations
Authorization: Bearer <wallet-session-jwt>
Content-Type: application/json

{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": "500000000000000000"
}
```

Successful response:

```json
{
  "reservationId": "4ba6b5f4-24d1-471f-9df1-90adcdb38c41",
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "player": "0x20752daFA6AbB5AF33b5073Fa2A37cD37B552985",
  "amount": "500000000000000000",
  "status": "reserved",
  "expiresAt": "2026-11-12T18:00:00.000Z"
}
```

The service must ignore client-supplied capacity or room expiration. It obtains
those fields from Rooms API.

## Payment Verification Change

New payments include the reservation id:

```json
{
  "txHash": "0x...",
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": "500000000000000000",
  "reservationId": "4ba6b5f4-24d1-471f-9df1-90adcdb38c41"
}
```

Verification must reject a reservation belonging to another wallet, room, or
amount. A successful verification marks it `paid`. Retrying the same verified
transaction and reservation is idempotent.

Payment recovery uses the same reservation binding. Existing verified payments
from before this protocol remain admissible during migration, but every newly
initiated payment must begin with a reservation.

## Failure And Recovery Rules

- `room_full`: do not open the wallet or submit a transaction.
- `room_expired`: do not open the wallet or submit a transaction.
- auth/Rooms API unavailable: fail closed before payment and offer retry.
- wallet rejects the transaction: keep the short reservation until it expires;
  a retry by the same wallet reuses it.
- transaction submitted but verification is pending: preserve the transaction
  hash and reservation id locally and retry verification as today.
- browser closes after submission: recovery restores the saved hash when
  available; lost-hash recovery remains supported and binds the recovered
  payment to the wallet, room, amount, and reservation.
- verification succeeds but the response is lost: the durable payment and paid
  reservation make a retry idempotent.

## Atomicity And Capacity Invariant

For each room:

```text
active unexpired reservations + paid reservations <= player_count
```

Reservation allocation must lock or serialize by room inside PostgreSQL. A
read-then-insert sequence without a transaction is not sufficient because two
wallets could claim the last seat concurrently.

## Room Metadata

Rooms API adds `expires_at` to created and public room records. Consumers must
reject new reservations after this timestamp. Existing gameplay and reconnect
for already paid seats may continue until product policy explicitly ends the
match; room expiration controls new payment, not an active match shutdown.

## Deployment Order

1. Deploy Rooms API with `expires_at` while keeping existing clients compatible.
2. Deploy `tabletop-auth` reservation storage and endpoints.
3. Deploy the wrapper that requires a reservation before `play`.
4. After all three are active, enforce reservation id as mandatory for newly
   initiated payment verification.

This order prevents an older wrapper from calling an endpoint that is not yet
available and prevents the backend from rejecting payments initiated by the
currently deployed wrapper during rollout.

## Required Tests

- two wallets racing for the final seat produce one reservation and one
  `room_full` response;
- an expired reservation releases capacity;
- the same wallet receives the same active reservation id;
- a wallet cannot use another wallet's reservation;
- room id, ticket amount, and expiration come from Rooms API;
- room expiration rejects reservation before the wallet transaction;
- verified payment converts the reservation to `paid` idempotently;
- payment mismatch leaves the reservation unverified;
- admission and reconnect still require verified payment;
- wrapper never calls `eth_sendTransaction` when reservation fails.
