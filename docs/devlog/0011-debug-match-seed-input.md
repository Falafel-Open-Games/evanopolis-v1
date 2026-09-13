# 0011 - Debug Match Seed Input

Date: 2026-09-13

## Status

- Done.

## Next Work

Add a temporary debug path for creating reproducible matches with an explicit
random seed from the wrapper page.

## Decision

- Keep the server as the source of truth for dice rolls and deck shuffles.
- Allow `random_seed` on `join_match` only when the game server is started with
  a debug/development opt-in flag.
- Surface the seed in the wrapper launch config so a tester can copy a failing
  match setup.
- Preserve the existing default behavior when no seed is provided.

## Why

- Reproducing a specific dice/card sequence makes manual testing and bug reports
  much faster.
- The production build should not give players a convenient way to select known
  dice rolls.

## Expected Outcome

- The wrapper has a seed input near room size and buy-in.
- New match links include `random_seed` only when the field is non-empty.
- Godot forwards the optional seed in `join_match`.
- The server accepts that seed only with an explicit debug env/config flag.
- Tests cover accepted and rejected client-provided seeds.

## Result

- Added a `Seed` field to the web wrapper launch config.
- Forwarded `random_seed` from wrapper query params into Godot and then into
  the `join_match` message.
- Added the server guard `EVANOPOLIS_ALLOW_CLIENT_RANDOM_SEED=1`/`true`.
- Updated local `just game-server-serve` to enable the guard for manual testing.
- Left deployed/default server behavior rejecting client-provided seeds.
- Rebuilt the Godot web export with cache-busted pack
  `index-ursunnly.pck`.
