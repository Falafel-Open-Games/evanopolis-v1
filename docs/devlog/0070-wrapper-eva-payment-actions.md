# 0070 - Wrapper EVA Payment Actions

Date: 2026-09-14

## Goal

Turn the manual payment verification panel into a complete local happy-path
payment action surface by letting the wrapper submit the required testnet EVA
transactions.

## Changes

- Vendored the browser UMD build of `ethers` for static wrapper ABI encoding
  and Keccak hashing.
- Added payment contract defaults for Arbitrum Sepolia:
  - EVA token
  - PaymentHandler spender
  - PaymentOnlyGameAdapter
- Added payment readiness controls:
  - check EVA balance
  - check allowance for PaymentHandler
- Added wallet transaction actions:
  - approve EVA for the room ticket amount
  - pay the room ticket through `PaymentOnlyGameAdapter.play(...)`
- The wrapper derives the chain game id as:
  - `keccak256("evanopolis:v1:" + game_id)`
- Payment transaction hashes are captured, stored locally per wallet and room,
  placed into the verification field, and submitted to `/payments/verify`.
- Added a guard so `Pay Ticket` checks allowance before attempting `play(...)`
  and gives a clear approval-needed message instead of surfacing a generic
  wallet JSON-RPC error.

## Notes

- Payment recovery is still pending.
- Launch/admission remains separate until the game server can enforce verified
  room admission.

## Validation

- `node --check apps/web-wrapper/room-entry.js`
- vendored ethers smoke check for `play(...)` ABI selector and game-id hash
