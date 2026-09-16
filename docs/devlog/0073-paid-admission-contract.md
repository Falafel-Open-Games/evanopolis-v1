# 0073 - Paid Admission Contract

Date: 2026-09-16

## Goal

Plan the next production slice after payment verification/recovery: turning a
verified payment into a server-enforced admission boundary.

## Changes

- Added `docs/architecture/paid_admission_contract.md`.
- Defined the v1 production plan: use the normal `tabletop-auth` wallet JWT for
  identity, then let the game server call `tabletop-auth` at join time for paid
  admission.
- Documented:
  - service responsibilities
  - trust boundaries
  - paid entry flow
  - suggested admission-check request/response shape
  - wrapper launch payload
  - production `join_match` message
  - game-server validation order
  - spectator mode out of scope for production v1
  - reconnect policy
  - stable rejection reasons
  - implementation slices

## Notes

- The documented target is intentionally limited to the v1 delivery path:
  normal wallet auth JWT plus join-time auth/payment service checks.
- The reboot should not trust wrapper local storage, raw transaction hashes, or
  first-join room settings for production admission.
- Free-play launch remains useful and should stay separate.
- Spectator behavior may remain useful in development, but production v1 is
  scoped to seated paid players only.

## Validation

- Documentation-only slice.
