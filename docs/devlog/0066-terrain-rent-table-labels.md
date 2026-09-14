# 0066 - Terrain Rent Table Labels

Date: 2026-09-14

## Status

- Done.

## Next Work

Make terrain development labels easier to understand for new players.

## Scope

- Replace raw `+50` through `+200` rent-table build labels with lot and rig counts.
- Keep rent formulas and development levels unchanged.
- Update the terrain cost note to explain lot cost without repeating the rig count.

## Result

- Rent tables now show labels such as `1 lot / 50 rigs`.
- Terrain cost notes now read `Container 2 EVA · each lot costs 1 EVA`.
- Server contract, Godot panel, and spec examples use the same labels.

## Verification

- `npm test` in `apps/game-server`
- `just godot-test`
