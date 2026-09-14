# 0069 - Manual Payment Verification

Date: 2026-09-14

## Goal

Add the first payment-gate integration point without yet building the wallet
transaction UI for EVA approval and payment submission.

## Changes

- Added a payment verification panel to loaded room summaries.
- The wrapper now accepts a manually supplied payment transaction hash.
- Verification calls `tabletop-auth`:
  - `POST /payments/verify`
  - `Authorization: Bearer <jwt>`
  - request body: `txHash`, `gameId`, and raw room ticket `amount`
- Payment verification status is shown in the room-entry page.
- Submitted transaction hashes and verified responses are stored locally per
  wallet and room for reload continuity.
- Added user-facing error messages for common verification failures:
  - payment not found
  - payment not confirmed
  - payment mismatch
  - verification endpoint not enabled

## Notes

- This is not the full EVA payment UI yet.
- Approval, play transaction submission, tx capture from the wallet, and payment
  recovery remain upcoming payment-gate slices.

## Validation

- `node --check apps/web-wrapper/room-entry.js`
