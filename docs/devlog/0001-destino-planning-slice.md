# 0001 - Destino Planning Slice

Date: 2026-09-13

## Status

- Done.
- Produced the initial Suerte/Destino planning document and established the
  provisional Monopoly-style fallback principle.

## Next Work

Next work: define the intended behavior and implementation shape for the
`Destino` board spaces before changing gameplay code.

## Why

Why this slice:
- `Destino` is already present in the board definition as `destiny_1` and
  `destiny_2`.
- The normalized rules say landing on `Suerte` or `Destino` should draw and
  resolve a card.
- The same rules spec explicitly says the card systems cannot be implemented
  safely yet because card contents, deck policy, and resolution rules are still
  undefined.

## Slice Goal

Slice goal:
- write down a concrete protocol/server/client plan for `Suerte` and `Destino`
  card support
- separate confirmed rules from product decisions still needed
- avoid speculative gameplay behavior until the missing card rules are approved
- use regular Monopoly-style chance/community-card behavior as the placeholder
  design baseline when Evanopolis-specific rules are silent

## Expected Outcome

Expected outcome:
- a commit-sized documentation change that makes the next implementation slice
  clear and reviewable
- no runtime gameplay behavior changes in this slice
