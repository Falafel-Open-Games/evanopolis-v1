# 0060 - Rent Table Bonus Clarity

Date: 2026-09-13

## Status

- Done.

## Next Work

Make the property decision rent table clear when displayed rents already include
ownership bonuses.

## Scope

- Apply the relevant owner rent multiplier to the displayed rent table.
- Explain active rent bonuses in the details note.
- Keep no-bonus terrain notes simple.

## Expected Outcome

- Players can tell when table rents already include special property and
  monopoly modifiers.
- The rent table, tile value, and decision panel price all point at the same
  effective rent model.

## Implementation Notes

- Property decision tables now apply the relevant rent multiplier for the local
  player preview or the current owner context.
- Details notes now say when the rent table includes substation, workshop,
  cooling, or full-city monopoly bonuses.
- Added a focused test for an available terrain where the local player already
  owns a workshop bonus.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
