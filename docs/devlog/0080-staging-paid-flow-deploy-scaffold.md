# 0080 - Staging Paid Flow Deploy Scaffold

Date: 2026-09-17

## Goal

Add the missing Rooms API staging deployment path and connect the existing
staging services for the paid create-room, invite, payment, and game admission
flow.

## Changes

- Added the missing Rooms API Docker and Fly deployment scaffolding.
- Added the missing Rooms API GitHub Actions workflow that tests, publishes,
  deploys, and smoke-checks the staging app.
- Added Rooms API `just` deployment and smoke-check shortcuts.
- Configured game-server staging with Rooms API and auth/payment service URLs.
- Updated the wrapper staging default auth URL to `tabletop-auth`.
- Added a staging paid-flow deployment runbook covering services, one-time Fly
  setup, secrets, deployment order, smoke checks, and browser validation.

## Notes

- The staging stack currently uses the existing `https://tabletop-auth.fly.dev`
  app as the auth/payment service.
- Creating a separate `tabletop-auth-staging` app remains a deployment policy
  decision for the private auth repo.
- Local Docker validation was blocked by Docker socket permissions on this
  machine.

## Validation

- `npm test --prefix apps/rooms-api`
- `npm test --prefix apps/game-server`
- `just --dry-run rooms-api-fly-deploy`
- `just --dry-run rooms-api-smoke-staging`
- `just --dry-run game-server-fly-deploy`
