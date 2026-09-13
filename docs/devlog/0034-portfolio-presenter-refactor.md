# 0034 - Portfolio Presenter Refactor

Date: 2026-09-13

## Status

- Done.

## Next Work

Extract portfolio panel data assembly from `server_client_main.gd` into a
dedicated presenter.

## Decision

- Keep this as a behavior-preserving refactor.
- Move owned-terrain sorting, development subtitles, order labels, affordability
  checks, and displayed rent calculation into `PortfolioPresenter`.
- Leave panel toggling and order command sending in `server_client_main.gd`.

## Expected Outcome

- `server_client_main.gd` gets smaller again.
- Portfolio presentation rules live in a named module.
- Existing portfolio and board display tests continue to pass.

## Result

- Added `PortfolioPresenter` for owned-terrain sorting, portfolio rows, order
  labels, affordability, and displayed portfolio rent.
- Reduced `server_client_main.gd` from 1287 lines to 1163 lines.
- Kept portfolio panel toggling and development order command sending in the
  main scene.
- Left board tile rent display helpers in `server_client_main.gd`; those can
  move later with a shared economy/rent display helper.

## Verification

- `just godot-test`
- `just godot-server-client-check`
