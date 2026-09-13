# 0054 - Rent Paid Toast

Date: 2026-09-13

## Status

- Done.

## Next Work

Show a non-blocking toast when rent is paid.

## Decision

- Show the rent toast to observers, including the rent owner.
- Suppress it for the payer, who already initiated the rent action.
- Include payer, rent amount, owner, and property in the message.

## Expected Outcome

- Waiting players and spectators get immediate feedback when rent changes
  balances.

## Implementation Notes

- Added a `rent_paid` branch to the shared toast event router.
- The payer does not receive the toast because their rent payment panel already
  provides the immediate feedback.
- Other clients see a concise message naming the payer, amount, owner, and
  property.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
