# Production Entry Flow

Date: 2026-09-14

This document is the production handoff overview for the paid Evanopolis entry
flow in this reboot repo. It describes the public surfaces owned here and the
integration boundaries with the private `tabletop-auth` service.

## System Overview

The production entry path is split across five responsibilities:

- `apps/web-wrapper`: browser entrypoint for wallet login, room creation,
  invite lookup, EVA approval/payment, payment verification, and launch
  handoff.
- `apps/rooms-api`: public room metadata service for authenticated room
  creation and public invite lookup.
- `../tabletop-auth`: private auth/payment verifier owned outside this repo.
  It handles SIWE/JWT and testnet payment proof verification.
- `apps/game-server`: authoritative gameplay server. It is still using the
  free-play join path today; production admission enforcement is upcoming.
- Arbitrum Sepolia contracts: EVA token, PaymentHandler, and
  PaymentOnlyGameAdapter.

## Trust Boundaries

- The wrapper is a UX coordinator. It must not be trusted for identity,
  payment, room settings, or admission.
- Rooms API owns room metadata only. It does not verify payments, run gameplay,
  or decide who may enter a live match.
- `tabletop-auth` is the trust boundary for wallet identity and payment proof
  verification.
- The game server must eventually hydrate production matches from trusted room
  metadata and enforce verified admission server-side.
- Blockchain transactions are not accepted as user claims. They are submitted
  to `tabletop-auth`, which verifies receipt/log fields against the configured
  chain, contract, wallet, room id, and ticket amount.

## Current User Flow

### Creator

1. Opens `apps/web-wrapper/room-entry.html`.
2. Connects browser wallet on chain `421614` (Arbitrum Sepolia).
3. Signs SIWE challenge through `tabletop-auth`.
4. Receives a short-lived JWT held in wrapper memory.
5. Creates a room through Rooms API:
   - display name
   - player count
   - entry fee tier
6. Receives room metadata and invite link.
7. Checks EVA balance and PaymentHandler allowance.
8. Approves EVA when allowance is insufficient.
9. Pays the room ticket through `PaymentOnlyGameAdapter.play(...)`.
10. Wrapper captures the transaction hash and asks `tabletop-auth` to verify it.

### Invited Player

1. Opens invite link with `game_id`.
2. Wrapper fetches public room metadata from Rooms API.
3. Wrapper switches into join mode.
4. Player connects wallet and signs in through `tabletop-auth`.
5. Player pays and verifies the room ticket the same way as the creator.

### Upcoming Launch/Admission

After payment verification, the wrapper should build a launch payload for the
graphical client. The target paid-admission handoff is documented in
[`paid_admission_contract.md`](paid_admission_contract.md). The game server must
still be updated to enforce that only authenticated, verified, eligible wallets
can enter the room.

## API Surfaces

### Rooms API

Owned in this repo. See:

- `apps/rooms-api/REST_API.md`
- `apps/rooms-api/README.md`
- `docs/architecture/paid_admission_contract.md`

Endpoints:

- `GET /healthz`
- `POST /v0/rooms`
- `GET /v0/rooms/:game_id`

### Auth And Payment API

Owned by `../tabletop-auth`. This repo only consumes the contract. Source of
truth remains in that private sibling repo:

- `../tabletop-auth/docs/auth-login-design.md`
- `../tabletop-auth/docs/api.md`
- `../tabletop-auth/docs/payment-auth-overview.md`
- `../tabletop-auth/docs/payment-rpc-runbook.md`

Wrapper calls:

- `POST /auth/challenge`
- `POST /auth/verify`
- `GET /whoami` indirectly through Rooms API token verification
- `POST /payments/verify`
- `POST /payments/recover`

## Contract Configuration

Current Arbitrum Sepolia defaults:

- Chain id: `421614`
- EVA token: `0x422d3188537b3226c9a3cd47647d363fc5e0d727`
- PaymentHandler: `0x666711a0e1b300d3ba0e5d9579974ebaf28fecdb`
- PaymentOnlyGameAdapter: `0x6863896de06241853470205f2df5d6a76f491fe1`

The wrapper uses:

- `approve(PaymentHandler, entry_fee_amount)` on the EVA token.
- `play(entry_fee_amount, potentialReferrer, chainGameId)` on
  PaymentOnlyGameAdapter.

The chain game id is:

```text
keccak256("evanopolis:v1:" + game_id)
```

Rooms API stores readable UUID room ids. The contract receives the derived
`bytes32` id.

## Local Development Runbook

Use Chrome + MetaMask for the simplest localhost flow. Brave Wallet is stricter
about localhost SIWE origins; use the Cloudflared tunnel notes in
`../tabletop-auth/docs/tunnels.md` for Brave Wallet validation.

Terminal 1, from `../tabletop-auth`:

```bash
ALLOWED_ORIGINS=http://127.0.0.1:4173,http://localhost:4173 just dev
```

Terminal 2, from this repo:

```bash
just rooms-api-serve
```

Terminal 3, from this repo:

```bash
just serve-web-wrapper
```

Open:

```text
http://localhost:4173/apps/web-wrapper/room-entry.html
```

Suggested local test:

1. Connect MetaMask on Arbitrum Sepolia.
2. Create a room.
3. Open the invite link in another tab.
4. Confirm invite lookup shows host, ticket, tier, and player count.
5. Click `Check Balance`.
6. Click `Approve EVA` if allowance is too low.
7. Wait for approval confirmation and refreshed allowance.
8. Click `Pay Ticket`.
9. Confirm the transaction hash is captured and `/payments/verify` succeeds.
10. Clear the local transaction hash, click `Recover Payment`, and confirm
    `/payments/recover` can restore a unique recent payment for that wallet,
    room, and ticket amount.

Expected logs:

- Rooms API logs room create/lookup when `ROOMS_API_VERBOSE_LOGS=1`.
- `tabletop-auth` logs CORS preflight plus `POST /payments/verify` and
  `POST /payments/recover`.
- Blockchain approval and play transaction submission happen through the wallet
  and are not visible to Rooms API.

## Deployment Notes

Rooms API requires:

- `AUTH_BASE_URL`
- optional `AUTH_VERIFY_PATH` (default `/whoami`)
- `ALLOWED_ORIGINS`
- optional `ROOMS_DATA_FILE`
- optional `ROOMS_API_VERBOSE_LOGS`

Wrapper hosting must be included in:

- Rooms API `ALLOWED_ORIGINS`
- `tabletop-auth` `ALLOWED_ORIGINS`

`tabletop-auth` payment verification must be configured with its own private
environment. See `../tabletop-auth/docs/payment-rpc-runbook.md`.

For production paid admission, the auth service should use a paid or
production-grade EVM RPC provider through `EVM_RPC_URL`. Free-tier providers may
work for direct `/payments/verify` checks, but can make `/payments/recover`
slow or incomplete because recovery scans `GamePlayed` logs. The current local
v1 recovery path is intentionally provider-safe and may take tens of seconds on
free-tier RPC; production operators should choose a plan that supports wider
`eth_getLogs` ranges if they expect reliable self-service lost-hash recovery.

## Security And Risk Notes

- JWTs are kept in memory by the wrapper, not local storage.
- Payment transaction hashes and verified payment responses are stored locally
  per wallet and room for reload continuity.
- The wrapper vendors `ethers` for static ABI encoding and Keccak hashing. See
  `apps/web-wrapper/vendor/README.md`.
- Rooms API public lookup does not expose `created_by`.
- A successful payment verification is not yet enforced by the game server.
  Production launch must not rely on wrapper-only gating.
- Player-facing free play begins at `free-entry.html` and launches
  `free-client.html`, a minimal game-only shell. The configurable
  `server-client.html` surface remains for development and diagnostics and must
  stay separate from player entry.
- Paid room entry launches `paid-client.html`, a player-facing shell limited to
  the Godot iframe, loading feedback, and wallet-session recovery. Review
  navigation, launch configuration, diagnostics, and match controls remain on
  `server-client.html` and are not part of the paid player experience.

## Known Gaps Before Production

- Build wrapper launch payload only after auth, room, and verified payment.
- Update game server to hydrate trusted room metadata.
- Enforce verified admission server-side.
- Preserve reconnect for already-admitted wallets without duplicate payment.
- Define room expiration, capacity, creator-payment timing, and duplicate-wallet
  policy.
- Add staging deployment runbooks and automated end-to-end coverage.
