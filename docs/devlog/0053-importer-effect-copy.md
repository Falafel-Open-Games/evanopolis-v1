# 0053 - Importer Effect Copy

Date: 2026-09-13

## Status

- Done.

## Next Work

Clarify Importer 1 and Importer 2 effect text in the client UI.

## Decision

- Both importers describe the full V1 effect:
  development unlock, 10% equipment commission, and 20% commission when the same
  player owns both importers.
- Keep portfolio and property-decision detail copy aligned.

## Expected Outcome

- A player who owns only Importer 2 understands that it still unlocks
  development and earns commission.

## Implementation Notes

- Aligned Importer 1 and Importer 2 portfolio summaries.
- Aligned Importer 1 and Importer 2 property-decision rule details.
- Updated tests for both copy surfaces.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
