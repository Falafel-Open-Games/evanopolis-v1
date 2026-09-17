# 0087-B - Room Entry Payment Copy

Date: 2026-09-17

## Issue

On a loaded invite, the Room panel already showed payment controls, but the
Join Room panel offered a `Show Payment Step` button. Clicking it focused the
transaction hash field. The page header also called the paid entry screen a
production skeleton. After wallet admission checks were added, the shortcut
became unnecessary: paid wallets see the launch action, while unpaid wallets
see payment controls.

## Result

- Describe the page as paid room entry.
- Tell invitees that connecting their wallet checks for an existing ticket.
- Direct paid wallets to the client launch action and unpaid wallets to the
  Room payment controls.
- Remove the redundant transaction-hash shortcut from the invite panel.

## Verification

- On the original PR branch, Chromium checks covered create and loaded-invite
  states and recoverable room-creation errors.
- After integration, `node --check apps/web-wrapper/room-entry.js` passed.
- The wrapper launcher tests passed (3 tests).
- `just sync-review-version` ran after resolving generated-file conflicts.
