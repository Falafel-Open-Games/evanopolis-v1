# 0072 - Payment Recovery

Date: 2026-09-14

## Goal

Let the production-shaped wrapper recover an already-submitted room ticket
payment when the browser loses, clears, or never captures the transaction hash.

## Changes

- Added a `Recover Payment` action to the room-entry payment panel.
- The wrapper now calls `tabletop-auth`:
  - `POST /payments/recover`
- Recovery submits the authenticated wallet JWT, room `game_id`, raw ticket
  amount, and a 24-hour lookback window.
- A unique recovered payment fills the transaction hash field, stores the
  verified response locally per wallet and room, and marks the payment as
  verified in the UI.
- Ambiguous recovery responses stay conservative: if the auth service finds
  multiple candidates, the wrapper asks the user to paste one candidate hash and
  use the normal verification path.
- Updated the production entry docs, web-wrapper README, inventory, and delivery
  roadmap to reflect that payment verification and recovery are now wired.

## Notes

- Recovery is still server-verified through `tabletop-auth`; local wrapper state
  is only continuity UX and is not a production trust boundary.
- Local validation on a free-tier Alchemy RPC provider recovered a payment but
  took tens of seconds because the auth service had to scan logs in very small
  chunks. Production deployments should use a paid/provider plan that supports
  practical `eth_getLogs` ranges for the desired recovery window.
- Launch/admission remains blocked until the game server can enforce verified
  room admission at join time.

## Validation

- `node --check apps/web-wrapper/room-entry.js`
- vendored ethers smoke check for `play(...)` ABI selector and game-id hash
