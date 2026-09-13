# 0033 - Property Decision Presenter Refactor

Date: 2026-09-13

## Status

- Done.

## Next Work

Reduce `server_client_main.gd` by extracting property and special-property
decision panel presentation into a dedicated client module.

## Decision

- Keep this as a behavior-preserving refactor.
- Move panel visibility/command/data decisions out of the main scene.
- Leave command sending and overlay orchestration in `server_client_main.gd`.
- Keep existing tests as the regression net.

## Expected Outcome

- `server_client_main.gd` becomes smaller and easier to scan.
- Property/special-property panel rules live in a named presenter class.
- Existing Godot client tests continue to pass unchanged.

## Result

- Added `PropertyDecisionPresenter` for property and special-property decision
  panel visibility, commands, and data.
- Reduced `server_client_main.gd` from 1560 lines to 1288 lines.
- Kept command sending and overlay orchestration in `server_client_main.gd`.
- Preserved the existing card, terrain purchase, rent, and special-property
  panel behavior.

## Verification

- `just godot-test`
- `just godot-server-client-check`
