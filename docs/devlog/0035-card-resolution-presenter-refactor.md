# 0035 - Card Resolution Presenter Refactor

Date: 2026-09-13

## Status

- Done.

## Next Work

Extract luck/destiny card panel presentation from `server_client_main.gd` into
a dedicated presenter.

## Decision

- Keep this as a behavior-preserving refactor.
- Move pending-card, resolved-card, card copy, icon choice, and command
  selection into `CardResolutionPresenter`.
- Leave command sending and overlay orchestration in `server_client_main.gd`.

## Expected Outcome

- `server_client_main.gd` gets smaller.
- Card presentation rules live in a named module.
- Existing card panel tests continue to pass unchanged.

## Result

- Added `CardResolutionPresenter` for pending-card, resolved-card, game-over,
  card copy, effect formatting, icon choice, and command selection.
- Reduced `server_client_main.gd` from 1163 lines to 992 lines.
- Kept command sending and overlay orchestration in the main scene.
- Preserved existing card panel behavior.

## Verification

- `just godot-test`
- `just godot-server-client-check`
