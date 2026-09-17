# 0087-B - Room Entry Payment Copy

Date: 2026-09-17

## Issue

On a loaded invite, the Room panel already showed payment controls, but the
Join Room panel offered a `Show Payment Step` button. Clicking it focused the
transaction hash field. The page header also called the paid entry screen a
production skeleton.

## Result

- Describe the page as paid room entry.
- Tell invitees to connect a wallet and use the visible Room payment controls.
- Label the transaction-hash shortcut `Verify Existing Payment` to match its
  behavior.

## Verification

- Chromium check of the create state: form and empty Room state render.
- Chromium check of a loaded invite with a mocked room lookup: payment controls
  are visible, the shortcut copy matches its action, and the layout fits at
  1440 × 900.
- Chromium error checks: attempting room creation or the invite shortcut before
  connecting a wallet shows a recoverable inline error in the entry panel.
- `just sync-review-version`
