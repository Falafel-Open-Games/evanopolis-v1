# 0045 - Special Property V1 Decisions

Date: 2026-09-13

## Status

- Done.

## Next Work

Record the provisional V1 behavior for all special properties before moving to
the next feature slice.

## Decision

- Preserve the received rules as source text.
- Record playable V1 interpretations as pending client approval addendums.
- Align current special-property descriptions with the provisional V1 behavior.

## Expected Outcome

- We have one coherent temporary ruleset for implementation.
- The client can review every special-property decision later.
- The in-game descriptions match the temporary behavior we intend to build.

## Result

- Added pending-approval V1 addendums for Importadora 1/2, Subestacion 1/2,
  Taller Propio, and Cooling Plant.
- Documented the development unlock gate and combo-only second-property effects
  as client review items.
- Updated Workshop copy back to the broad owner-bonus description for V1.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
