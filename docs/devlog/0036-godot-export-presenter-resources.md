# 0036 - Godot Export Presenter Resources

Date: 2026-09-13

## Status

- Done.

## Next Work

Fix the Godot Web export allowlist so the newly extracted presenter scripts are
included in exported builds.

## Decision

- Keep the current explicit Godot resource export filter.
- Add the extracted presenter scripts to the allowlist.
- Keep the generated Godot `.uid` files for the new scripts.

## Expected Outcome

- Web exports can load the refactored client presenter scripts.
- The browser build no longer fails because presenter resources are missing.

## Result

- Added the three extracted presenter scripts to `godot/export_presets.cfg`.
- Kept the generated `.uid` files for the presenter scripts.
- Rebuilt the Godot Web export; the pack log includes the presenter `.gdc`
  files.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
