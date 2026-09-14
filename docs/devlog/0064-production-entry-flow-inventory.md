# 0064 - Production Entry Flow Inventory

Date: 2026-09-14

## Status

- Done.

## Next Work

Start the production auth, room, invite, payment, and admission work with a
clear port map from the previous implementation.

## Scope

- Review the old `../evanopolis-deliverable` room, wrapper, and game-server
  integration docs.
- Review the `../tabletop-auth` wallet auth and payment verification contracts.
- Compare those expectations with the current free-play `evanopolis-v1` repo.
- Write a concrete responsibility split and slice plan for the port.

## Expected Outcome

- The next implementation slice can start from a known contract instead of
  rediscovering the old architecture.
- The team has a visible distinction between current demo bootstrap and required
  production paid-entry flow.
- The next few slices are small enough to complete and document independently.

## Implementation Notes

- Added `docs/architecture/production_entry_flow_inventory.md`.
- Captured source references from `evanopolis-deliverable` and `tabletop-auth`.
- Identified missing current-repo surfaces: rooms API, wallet auth UI, invite
  flow, payment verification integration, and server-side paid admission.
- Defined responsibility boundaries for `tabletop-auth`, rooms API, web
  wrapper, and game server.
- Listed the next implementation slices: rooms API contract, wrapper room flow,
  wallet auth, payment gate, game-server admission, and full runbooks.

## Verification

- Docs-only slice; no code tests run.
