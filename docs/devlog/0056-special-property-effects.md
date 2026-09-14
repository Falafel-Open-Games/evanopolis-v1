# 0056 - Special Property Effects

Date: 2026-09-13

## Status

- Done.

## Next Work

Make special property ownership affect the authoritative economy instead of only
appearing in the UI.

## Scope

- Pay importer equipment commissions when development orders are purchased.
- Apply special-property rent multipliers to server rent calculations.
- Mirror modified rent values in client board and portfolio displays.

## Decisions

- Development ordering remains available for tomorrow's playable build; importer
  ownership does not gate the feature yet.
- Each importer owner receives 10% equipment commission, unless one player owns
  both importers, in which case only that player receives 20%.
- Substation 1 or 2 gives the owner +10% rent; owning both gives +30% total.
- Private Workshop and Cooling Plant each give their owner +10% rent.
- The existing full level-5 city monopoly multiplier still applies after these
  special-property multipliers.

## Expected Outcome

- Equipment purchases transfer visible commission events to importer owners.
- Rent paid by players matches the special property effects currently described
  in the UI and roadmap.

## Implementation Notes

- Development ordering remains ungated for the playable build tomorrow.
- Importer commission is applied immediately when a development order is paid.
- Commission payouts emit `special_property_commission_collected` events.
- Server rent now applies special-property owner bonuses and the level-5 city
  monopoly multiplier.
- Client board and portfolio rent labels mirror the same special-property
  multiplier model.
- Importer player-facing copy no longer claims that importers unlock
  development.

## Verification

- `npm test` in `apps/game-server`
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
