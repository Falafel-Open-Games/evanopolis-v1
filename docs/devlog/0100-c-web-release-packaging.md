# 0100-C - Web Release Packaging

Date: 2026-09-25

## Status

- Done.

## Context

GitHub Pages provided a hosted review build, but the technical handoff had no
durable, versioned wrapper and Godot web-export artifact. GitHub Actions
artifacts are temporary workflow evidence, while GitHub Packages does not
provide a natural generic static-bundle registry.

## Result

- Added a reproducible packager for an already-exported wrapper and Godot web
  client.
- The packager validates required runtime files and emits a versioned archive,
  a source/build manifest, and SHA-256 checksums.
- Added a `v*` tag workflow that runs wrapper and Godot checks, exports the web
  client, uploads temporary workflow evidence, and creates a draft GitHub
  prerelease with the permanent delivery assets.
- Pull requests that affect the release inputs run the same build and packaging
  validation with read-only repository permission. Release-write permission is
  isolated to the tag-only draft-publication job.
- Kept publishing as a manual decision: the workflow creates a draft
  prerelease and does not announce an unreviewed build as delivered.

## Known Boundary

The wrapper still uses hostname-sensitive staging defaults or explicit query
parameters for service endpoints. A runtime deployment configuration remains
to be coordinated with the player-entry lane before the archive is considered
portable for a client-owned production environment.

## Verification

- `actionlint .github/workflows/web-release.yml`
- `node --test apps/web-wrapper/test/*.test.mjs`
- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
- Packaged the real Godot export twice and confirmed byte-identical archives.
- Verified `SHA256SUMS`, required runtime files, archive exclusions, and the
  manifest's versioned Godot pack reference.
