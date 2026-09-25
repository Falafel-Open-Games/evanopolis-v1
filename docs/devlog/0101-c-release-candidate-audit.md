# 0101-C - Release Candidate Audit

Date: 2026-09-25

## Status

- Corrective action ready for review.
- Candidate `1517d870` rejected as a complete handoff bundle.

## Result

- Fixed the Rooms API workflow trigger so a review-version sync publishes a
  SHA-tagged Rooms API image for the same revision as the other release
  artifacts.
- Recorded the first candidate audit with exact revisions, CI results, local
  image identifiers, test totals, container and staging health evidence, and
  the rejected-candidate reason.
- Did not create an RC tag or represent the incomplete artifact set as a
  release candidate.

## Verification

- Game Server Docker build: 121 tests passed.
- Rooms API Docker build: 9 tests passed.
- Both temporary local containers passed their health smoke checks.
- Game Server, Rooms API, and `tabletop-auth` staging health checks passed.
- GitHub Pages candidate workflow passed and its artifact exists.
- Game Server candidate GHCR digest resolved successfully.
- Rooms API candidate GHCR lookup returned `not found`, confirming the workflow
  alignment gap addressed by this slice.
