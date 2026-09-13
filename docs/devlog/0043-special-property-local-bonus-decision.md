# 0043 - Special Property Local Bonus Decision

Date: 2026-09-13

## Status

- Done.

## Next Work

Clarify the provisional V1 interpretation for Workshop and Cooling Plant rent
bonuses.

## Decision

- Treat Workshop and Cooling Plant as broad owner bonuses for V1:
  `+10%` rent on all terrains owned by the special-property owner.
- Record this as a local decision that needs client approval because the raw
  spec says the bonus applies to terrain in the city where the special property
  is located.
- Update player-facing copy to match the broader interpretation.

## Expected Outcome

- The special-property descriptions are easier to understand.
- The roadmap records the interpretation risk before server-side effects are
  implemented.

## Result

- Workshop and Cooling Plant are documented as provisional broad owner rent
  bonuses for V1.
- The delivery roadmap flags this decision for client approval.
- Player-facing copy now says the owner's terrains collect +10% rent.
- The normalized rules keep the raw city-local wording, with the broader V1
  interpretation recorded as a pending-approval addendum instead of replacing
  the source rule.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
