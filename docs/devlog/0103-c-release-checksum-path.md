# 0103-C - Release Checksum Path

Date: 2026-09-25

## Status

- RC1 retained as an unpublished draft after asset inspection failed.
- Checksum-path correction ready for review.

## Result

- Corrected the complete release manifest entry in `SHA256SUMS` from
  `dist/release-manifest.yaml` to the downloadable asset name
  `release-manifest.yaml`.
- Added an in-workflow `sha256sum -c SHA256SUMS` gate before GitHub Release
  creation so path or content mismatches fail before assets are uploaded.
- Kept `v1.0.0-rc.1` unpublished; the corrected candidate will use the next RC
  number after the fix lands and aligned images are published.
