# 0085 - PR Landing Procedure

Date: 2026-09-17

## Status

- Done.

## Context

The open PR integration slice accepted the code and docs content, but did so by
transplanting PR payloads into a new main-line commit. That preserved the desired
files, but it did not preserve GitHub's normal PR merge semantics.

## Scope

- Document the preferred future procedure in `AGENTS.md`.
- Make preserving branch/PR ancestry the default when accepting PRs from another
  agent.
- Treat generated review labels as conflict-resolution noise and regenerate them
  once at the end.

## Result

Future agents should land open PRs in a way that GitHub recognizes as merged,
unless the user explicitly approves a transplant-style integration.
