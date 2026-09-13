# 0004 - Seeded Server Dice

Date: 2026-09-13

## Status

- Done.
- Server dice now derives from `random_seed` and `dice_roll_count`.
- Godot remains a renderer of authoritative server results and does not own
  gameplay RNG state.

## Next Work

Make server dice rolls deterministic from match seed plus dice roll count.

## Decision

- Godot does not maintain authoritative gameplay RNG state.
- The server owns gameplay randomness.
- Dice rolls derive from `random_seed` and `dice_roll_count`.
- `dice_roll_count` increments only when a roll command is accepted.
- Card deck shuffle already derives from `random_seed`; card draws cycle cards
  to the bottom without additional randomness.

## Why

- Reproducible matches are easier to debug and explain.
- A counter-based random stream avoids one random domain changing another.
- The client can render server results without coordinating RNG state.

## Expected Outcome

- snapshots expose `dice_roll_count`
- same seed produces the same dice sequence
- accepted rolls advance the dice counter
- gameplay remains server-authoritative
