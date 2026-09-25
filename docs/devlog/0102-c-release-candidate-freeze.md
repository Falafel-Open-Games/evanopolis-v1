# 0102-C - Release Candidate Freeze

Date: 2026-09-25

## Status

- Final RC manifest automation ready for review.
- RC tag intentionally not created before the aligned images exist.

## Result

- Pinned the private `tabletop-auth` source, immutable tag, and OCI digest in
  the release workflow.
- Added tag-time resolution of Game Server and Rooms API digests.
- Added generation of a complete `release-manifest.yaml` beside the web bundle
  and included it in `SHA256SUMS`.
- Kept incomplete acceptance evidence explicit: staged paid two-player and
  representative desktop/mobile browser checks remain `NOT_RUN`.

## Release Gate

After this slice lands, synchronize the review version and wait for both
container workflows to publish images for the exact resulting `main` SHA.
Only then push the `v*` RC tag and inspect the generated draft prerelease.
