# 0071 - Production Entry Handoff Docs

Date: 2026-09-14

## Goal

Create production-facing documentation for the rebooted paid entry flow so
client developers can review architecture, responsibilities, tradeoffs, and
remaining launch risks without reconstructing everything from devlogs.

## Changes

- Added `docs/architecture/production_entry_flow.md`:
  - system overview
  - trust boundaries
  - creator/invitee/payment flow
  - API boundaries
  - contract addresses
  - local runbook
  - deployment notes
  - security and known production gaps
- Added `apps/rooms-api/REST_API.md` with request/response contract details.
- Linked the new docs from:
  - root `README.md`
  - `apps/rooms-api/README.md`
  - `apps/web-wrapper/README.md`
  - `production_entry_flow_inventory.md`

## Notes

- Sensitive auth/payment implementation remains documented in the private
  `../tabletop-auth` repo and is referenced rather than copied.
- This repo now documents the public boundaries it owns and the integration
  responsibilities it imposes on production deployment.
