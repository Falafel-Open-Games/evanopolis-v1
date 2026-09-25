# 0099-C - Release Handoff Baseline

Date: 2026-09-25

## Status

- Done.

## Context

The technical handoff plan called for a release manifest, environment contract,
topology, startup and rollback guidance, known limitations, and a first
deployment checklist. The repository had service-specific Fly notes and
Dockerfiles, but no single operator-facing baseline. The final candidate cannot
be frozen while the other delivery lanes are still landing changes.

## Result

- Inventoried the game server, Rooms API, static web client, and separately
  versioned `tabletop-auth` dependency.
- Added secret-free environment templates for all three services.
- Documented topology, artifact production, immutable image tagging, startup
  order, health checks, persistence, diagnostics, upgrade, rollback, and
  client-owned infrastructure prerequisites.
- Added a release-manifest template with explicit `NOT_RUN`, `UNDECIDED`, and
  required placeholders so a draft cannot be mistaken for a verified release.
- Recorded the in-memory single-replica game-server constraint, single-writer
  Rooms API file store, and external PostgreSQL/Redis responsibilities.

## Evidence and Limits

This slice audited repository configuration, workflows, service source, and
the sibling `tabletop-auth` configuration and runbooks. It did not freeze a
candidate, build containers, publish artifacts, deploy client infrastructure,
or rerun the paid browser path. Those checks belong to the candidate-validation
slice after active delivery work lands.
