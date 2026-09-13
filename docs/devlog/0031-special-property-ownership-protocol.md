# 0031 - Special Property Ownership Protocol

Date: 2026-09-13

## Status

- Done.

## Next Work

Add the server-side ownership protocol for special properties so they can be
purchased as stable assets before their modifier effects are implemented.

## Decision

- Special properties are purchasable, non-developable assets.
- They do not charge direct rent in this slice.
- Ownership is tracked separately from terrain ownership.
- Client UI for special property purchases is deferred to a later slice.

## Expected Outcome

- Match snapshots expose special property ownership.
- The active player can buy an unowned special property after landing on it.
- Available actions expose the new purchase command only when it is legal.
- Protocol docs and server tests cover the new command and event.

## Result

- Added `special_property_ownership` to authoritative state and public
  snapshots.
- Added `request_purchase_special_property` and `special_property_purchased`.
- Special properties are purchasable only after landing, only while unowned,
  and only when the player can afford the price.
- Special-property ownership transfers with other assets during rent
  bankruptcy.
- Documented that special properties remain non-developable and do not charge
  direct rent in this slice.

## Verification

- `just game-server-test`
- `just game-server-test-integration`
