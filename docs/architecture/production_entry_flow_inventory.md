# Production Entry Flow Inventory

Date: 2026-09-14

This note inventories the production create-room, invite, wallet-auth, payment,
and launch flow that needs to return before delivery.

The current `evanopolis-v1` repo intentionally uses a free-play demo bootstrap
while gameplay is being validated. Production launch must restore the paid
entry architecture from the previous `../evanopolis-deliverable` work, with
`../tabletop-auth` remaining the private wallet auth and payment verification
service.

## Reference Sources

Use these as the source material for the port:

- `../evanopolis-deliverable/TODO.md`
- `../evanopolis-deliverable/apps/rooms-api/REST_API.md`
- `../evanopolis-deliverable/apps/rooms-api/README.md`
- `../evanopolis-deliverable/apps/game-server/docs/ROOMS_API_INTEGRATION.md`
- `../evanopolis-deliverable/apps/web-wrapper/docs/USER_FLOW.md`
- `../evanopolis-deliverable/apps/web-wrapper/docs/ENTRY_FLOW_PLAN.md`
- `../evanopolis-deliverable/apps/web-wrapper/docs/handoff.txt`
- `../tabletop-auth/docs/auth-login-design.md`
- `../tabletop-auth/docs/api.md`
- `../tabletop-auth/docs/payment-auth-overview.md`
- `../tabletop-auth/docs/payment-rpc-runbook.md`

## Existing Current Repo State

Present in `evanopolis-v1`:

- `apps/game-server`: free-play authoritative WebSocket server.
- `apps/web-wrapper`: static review shell and server-connected demo launcher.
- `apps/rooms-api`: v0 room metadata service with authenticated room creation,
  public invite lookup, and optional JSON-file persistence.
- Temporary first-join room options:
  - `player_count`
  - `room_buy_in_eva`
  - optional debug `random_seed`
- Schema docs already warn that first-join configuration is temporary and must
  move behind a stricter room creation flow before launch.

Missing from `evanopolis-v1`:

- wallet auth UI
- authenticated create-room flow
- invite-first join flow
- EVA token approval/payment UI
- payment verification/recovery integration
- server-side paid admission enforcement
- wrapper-owned launch payload for the production flow
- local/staging runbooks for the full pay-to-play path

## Responsibility Split To Restore

### `tabletop-auth`

Private dependency. Do not copy secrets or private implementation into this
repo.

Responsibilities:

- SIWE wallet login:
  - `POST /auth/challenge`
  - wallet signs message
  - `POST /auth/verify`
  - short-lived JWT returned
- JWT verification:
  - `GET /whoami`
  - `GET /keys`
- payment verification:
  - `POST /payments/verify`
  - `POST /payments/recover`
- chain/RPC verification against configured testnet contracts.
- binding payment proof to:
  - JWT wallet address
  - room/game id
  - raw ticket amount
  - configured chain id
  - configured payment adapter contract
  - confirmation policy

### Rooms API

Should be added or ported into this repo as a public production service.

Responsibilities:

- authenticated room creation
- public invite lookup
- durable room metadata
- eventual durable finished-match result lookup

Baseline v0 contract from the previous repo:

- `POST /v0/rooms`
  - auth: `Authorization: Bearer <jwt>`
  - request fields:
    - `creator_display_name`
    - `entry_fee_tier`
    - `player_count`
    - optional `experimental`
  - server derives:
    - `game_id`
    - `created_by` from JWT `sub`
    - `entry_fee_amount`
    - `created_at`
- `GET /v0/rooms/:game_id`
  - public room/invite lookup
  - returns room definition without exposing creator wallet

The rooms API does not own live gameplay status or payment enforcement.

### Web Wrapper

Should evolve from the current static demo shell into the production entrypoint.

Responsibilities:

- connect wallet
- enforce configured chain
- authenticate through `tabletop-auth`
- create rooms through rooms API
- generate invite links
- look up invite rooms
- preserve invite referrer hints when available
- check EVA allowance
- request token approval when needed
- submit payment transaction
- capture and persist `txHash` per wallet + room
- verify payment through `tabletop-auth`
- build launch payload after auth + room + payment are satisfied
- hand the payload to the graphical client

The wrapper does not own gameplay rules or live match authority.

### Game Server

Responsibilities:

- verify or trust authenticated player identity through the auth boundary.
- hydrate live matches from trusted room metadata, not from arbitrary first
  join settings.
- enforce paid admission at join time.
- reject unpaid, unverified, wrong-wallet, wrong-room, or wrong-amount joins.
- preserve reconnect for already admitted players without duplicate payment.
- remain authoritative for live gameplay, winner, and final match result.
- eventually write authoritative finished-match results back to rooms API.

The reusable multiplayer core should still stay free of wallet, payment, and
room-specific concepts; the integration belongs at the app/server boundary.

## Canonical User Flow

### Creator

1. Opens wrapper.
2. Connects browser wallet.
3. Wrapper ensures expected chain.
4. Signs SIWE challenge and receives JWT.
5. Creates room with:
   - max players
   - buy-in/admission policy
   - creator display name
6. Receives `game_id`.
7. Sees invite link.
8. Pays the EVA admission ticket for the room.
9. Payment is verified by `tabletop-auth`.
10. Wrapper launches graphical client with token, game id, game-server URL, and
    wallet/player identity.

### Invited Player

1. Opens invite link.
2. Wrapper reads `game_id` and optional referrer hint.
3. Wrapper fetches room metadata.
4. Player connects wallet and authenticates.
5. Player pays the required EVA admission ticket.
6. Payment is verified by `tabletop-auth`.
7. Wrapper launches graphical client into the same room.

### Server Admission

1. Client connects to game server.
2. Client presents auth/session context.
3. Game server resolves trusted room metadata.
4. Game server verifies player admission eligibility.
5. Only then does the player receive or recover a seat.

## Port Plan

### Slice 2: Rooms API Contract

- Done in devlog `0065`.
- Added `apps/rooms-api` with room creation, lookup, simple persistence, and
  contract tests.

### Slice 3: Wrapper Room Flow Skeleton

- Done in devlog `0066`.
- Added a separate `apps/web-wrapper/room-entry.html` page so the free-play
  server launcher remains available for development.
- Uses the Rooms API with a temporary bearer-token field until wallet auth is
  connected.
- Shows created or looked-up room settings, invite links, and a launch link
  into the current server-connected client using the room id as `match_id`.

### Slice 4: Wallet Auth Boundary

- Done in devlog `0067`.
- Added browser wallet/SIWE flow against `tabletop-auth` on the room-entry
  page.
- Keeps JWT in memory and uses it automatically for authenticated room
  creation.
- Handles wrong chain switching, account changes, chain changes, and token
  expiry visibly.

### Slice 5: Payment Gate

- Add allowance, approve, play, tx capture, verify, and recover flow.
- Bind verification to room `game_id` and `entry_fee_amount`.
- Preserve tx hash per wallet + room for reload recovery.

### Slice 6: Game Server Admission

- Hydrate match settings from room metadata.
- Replace production joins based on client-supplied settings with trusted room
  config.
- Enforce verified paid admission before seat assignment.
- Cover accepted, rejected, reconnect, and mismatch cases.

### Slice 7: Full Runbooks

- Document local two-player flow.
- Document staging flow.
- Include auth, create room, invite, payment, launch, gameplay, and reconnect.

## Open Decisions

- Whether to port the previous `rooms-api` implementation directly or rebuild a
  smaller v0 service in the current repo style.
- Whether production room creation uses `entry_fee_tier` presets or a direct
  configured buy-in/ticket amount.
- Exact local development mode for auth/payment:
  - real sibling `tabletop-auth`
  - hermetic fake verifier for tests
  - both
- Whether invite links must always carry `potential_referrer`, or whether room
  lookup should expose a referral-safe creator field.
- Room expiration policy for idle unpaid or never-started rooms.
- Duplicate wallet policy for the same room.
- Whether a creator must pay before invites are sent or only before launching.

## Guardrails

- Do not let production room configuration come from first `join_match`.
- Do not trust wrapper-side payment state by itself.
- Do not put private auth implementation or secrets in this repo.
- Do not move live gameplay authority into rooms API.
- Do not put wallet/payment concepts into reusable multiplayer core.
- Keep the free-play demo path available while it is useful, but label it as
  non-production.
