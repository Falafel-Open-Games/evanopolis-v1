# 0081 - Staging Custom Domain CORS

Date: 2026-09-17

## Goal

Allow the staging paid-entry browser flow to run from the project custom domain,
not only from GitHub Pages or localhost.

## Changes

- Added `https://www.falafel.com.br` and `https://falafel.com.br` to the Rooms
  API staging CORS allowlist.
- Updated the staging deployment runbook to list the required browser origins
  for `tabletop-auth` and Rooms API.

## Notes

- `tabletop-auth` owns its CORS allowlist through its GitHub Actions
  `ALLOWED_ORIGINS` variable/Fly secret sync, so that service must be redeployed
  after adding the same custom-domain origins.

## Validation

- Not run; deployment configuration/documentation only.
