# 0058 - Terrain Tile Rent Overlay Bleed

Date: 2026-09-13

## Status

- Done.

## Next Work

Fix owned terrain tiles whose runtime rent label can visually overlap with the
imported board's printed base price.

## Scope

- Keep server state and rent calculation unchanged.
- Keep the same runtime tile-face component and copy.
- Adjust only the 3D presentation layer enough to prevent old printed tile
  values from bleeding through when a terrain becomes owned.

## Expected Outcome

- Owned terrain tiles show one clear owner-colored rent value.
- Available terrain tiles continue to show their normal purchase price.

## Investigation Notes

- The affected Asuncion tile has a normal `PropertyTileFace` instance and is
  updated through the server-authoritative ownership refresh path.
- The visual artifact matches the imported board art's printed price showing
  through/near the runtime rent label at the current shallow camera angle.

## Implementation Notes

- Raised the terrain tile face card, color strip, title, and value label a
  little farther above the imported tile surface.
- Confirmed the original tile price is part of the imported tile mesh, not a
  removable label node. A runtime mask was tested and rejected because it hid
  the authoritative runtime rent label.
- Kept only the small tile-face height adjustment. The clean remaining fix is
  to remove the baked terrain labels from the board asset/source model or make
  the runtime tile face fully replace that part of the asset.
- Kept the ownership/rent refresh behavior unchanged.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
