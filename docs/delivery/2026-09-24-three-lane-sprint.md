# September 24 Three-Lane Delivery Sprint

## Objective

Run three parallel work lanes before the September 25 client meeting without
turning shared files or release state into an integration bottleneck.

The strongest visible outcome for the meeting is a simple, polished,
non-development-looking way to create and join Evanopolis rooms in both free
and paid modes. In parallel, the playable game should continue improving and
the technical representative should receive a concrete handoff package.

## Shared Rules

- Read and follow the repository `AGENTS.md` before making changes.
- Use `jj`, not Git, for version-control work.
- Do not run `jj git push`; the user performs keyed pushes.
- Keep each lane within its ownership boundary. If a necessary change crosses
  into another lane, coordinate it explicitly instead of silently expanding
  scope.
- Do not overwrite unrelated work or generated version changes from another
  lane.
- Run `just sync-review-version` immediately before any direct-to-main landing
  or PR review publish flow.
- Use a one-line Conventional Commit summary, a blank line, and a descriptive
  body with `jj describe`.
- Treat `BUILD_VERSION` and wrapper cache-busting labels as integration files.
  When landing PRs, resolve them to the current `main` state and run
  `just sync-review-version` once after integration.
- Report verified results, remaining blockers, and files changed. Do not claim
  a browser, payment, deployment, or gameplay path was validated unless it was
  actually exercised.

## Lane 1 — Player Entry Experience

### Outcome

Deliver clean, shareable, player-facing pages for creating and joining both
free and paid rooms. The default experience should look like a product, not an
engineering console, on desktop and mobile.

### Working Model

- Use the primary chat and current worktree.
- Land completed work directly on `main`.
- Do not open a PR for this lane.

### Primary Ownership

- `apps/web-wrapper/`
- Entry-page browser tests and entry-specific assets
- `docs/design/production-entry-page-requirements.md`
- Entry-flow documentation when necessary

### Product Priorities

1. A clear choice between creating a room and joining from an invitation.
2. A simple free-play path suitable for beta testers.
3. A guided paid path covering wallet sign-in, room creation or lookup,
   allowance/payment, verification, and launch.
4. Shareable URLs that preserve the correct room and mode.
5. Player-facing copy that hides endpoints, UUIDs, chain configuration, and
   recovery mechanics from the normal path.
6. Responsive layouts at representative desktop and smartphone widths.
7. Useful failure and recovery states without exposing raw internal errors.

### Avoid Unless Coordinated

- Gameplay rules and Godot board UI
- Game-server economy behavior
- General release packaging and operator documentation
- Deployment configuration unrelated to making the entry flow work

### Copy/Paste Codex Prompt

```text
Work on Lane 1 of the September 24 Evanopolis delivery sprint: the player entry
experience. Use this current worktree and land completed changes directly on
main; do not create a PR and do not push. Read AGENTS.md and
docs/delivery/2026-09-24-three-lane-sprint.md first.

Our highest-value client-facing result for tomorrow is a simple,
non-development-looking, shareable experience for creating and joining rooms
in both free and paid modes. Audit the current apps/web-wrapper entry flow in a
real browser, then implement and verify the most important gaps. The default
path must feel like a product on desktop and mobile. Keep endpoints, UUIDs,
chain settings, transaction recovery, and developer navigation out of the
primary experience, while retaining recovery tools in a secondary place when
they are genuinely needed.

Own apps/web-wrapper, entry-specific tests/assets, and the production entry
page requirements. Avoid gameplay/rules work and general handoff packaging
unless a narrowly necessary cross-lane change is coordinated. Preserve both
free and paid flows, invitations, wallet/payment recovery, and existing
security boundaries. Verify representative host, invitation, free-play, paid,
desktop, and smartphone paths in proportion to what changes.

Work autonomously through audit, implementation, and verification. Before
landing, run just sync-review-version. Finalize the change with jj describe
using a Conventional Commit summary, a blank line, and a descriptive body;
move the main bookmark to the completed change as appropriate. Never run
jj git push. Report what is ready for tomorrow, what you verified, and any
remaining blockers.
```

## Lane 2 — Game, Rules, and Gameplay UI

### Outcome

Improve the playable game through focused, reviewable slices: rules,
server-authoritative behavior, Godot gameplay UI, feedback, and polish.

### Working Model

- Use a different terminal, Codex session, and worktree.
- Use one or more focused PR branches rather than landing directly on `main`.
- Open PRs as coherent slices become ready for review.
- The user performs each keyed push; Codex prepares and tracks the bookmark.

### Primary Ownership

- `apps/game-server/`
- `godot/`
- Gameplay protocol and rule tests
- `docs/rules/`, gameplay specifications, and relevant numbered devlogs
- Gameplay portions of `docs/backlog/delivery-roadmap.md`

### Product Priorities

Select narrow slices from the remaining client-visible or rules-blocking work,
especially:

- jackpot and match-economy behavior after the rules are sufficiently defined;
- final-prize distribution and game-over presentation;
- turn timer behavior;
- mortgage rules;
- card values, bank reserve, and solvency behavior;
- gameplay UI clarity and defects found during full-match testing.

Unresolved product decisions must not be guessed. A slice may document a
decision and prepare implementation boundaries, but behavior should change
only when the rule is understood or an experiment is explicitly agreed.

### Avoid Unless Coordinated

- `apps/web-wrapper/` room-entry experience
- Deployment packaging and environment/runbook work
- Broad edits to delivery coordination documents

### Copy/Paste Codex Prompt

```text
Work on Lane 2 of the September 24 Evanopolis delivery sprint: game rules,
gameplay behavior, and gameplay UI. This must be a separate terminal, Codex
session, and worktree. Read AGENTS.md and
docs/delivery/2026-09-24-three-lane-sprint.md first. Use jj, create focused PR
bookmarks, and do not land directly on main.

Start by reconciling the September 22 meeting outcomes, the V1 rulebook, the
delivery roadmap, and the actual implementation. Choose the highest-value
coherent slice that is not blocked by an unanswered client decision. Diagnose
bugs before changing behavior, and do not invent jackpot, reserve, prize,
timer, mortgage, or economy rules where approval is still required. Prefer
small end-to-end slices with authoritative server behavior, protocol updates,
Godot presentation, focused tests, and a numbered devlog when applicable.

Own apps/game-server, godot, gameplay protocol/tests, gameplay rule documents,
and relevant backlog status. Avoid apps/web-wrapper room-entry files and
technical-handoff packaging unless explicitly coordinated. Preserve the
repository's GDScript conventions and run targeted server/client checks plus
the required Godot checks for touched surfaces.

As each coherent slice becomes ready, run just sync-review-version, finalize it
with jj describe using a Conventional Commit summary, blank line, and detailed
body, choose a descriptive branch name, and prepare the bookmark for a PR.
Never run jj git push: tell the user exactly what needs to be pushed. Once the
remote bookmark exists, track <branch>@origin and open or update the PR. Report
test evidence, rule assumptions, review notes, and remaining blockers.
```

## Lane 3 — Technical Handoff

### Outcome

Give the client's technical representative a concrete release candidate and
enough accurate operating information to choose an integration environment and
begin deployment.

### Working Model

- Use a different terminal, Codex session, and worktree.
- Prepare handoff improvements as focused PRs.
- Keep deployment claims evidence-based and identify client-owned prerequisites.
- The user performs keyed pushes; Codex prepares and tracks PR bookmarks.

### Primary Ownership

- `docs/delivery/`
- `docs/deployment/`
- Deployment manifests and environment templates
- Container/release packaging and smoke checks
- Operator-facing architecture and known-limitations material

The lane may make narrowly scoped changes under `deploy/` or service build
configuration when required to produce or validate the handoff package.

### Product Priorities

Follow the Thursday section of the
[September 22–25 handoff plan](2026-09-22-to-25-handoff-plan.md):

1. Inventory the exact deployable artifacts and select a candidate revision.
2. Validate clean builds, images, health checks, and available smoke tests.
3. Exercise or precisely document the staged end-to-end paid path.
4. Produce an environment-variable contract with secret placeholders only.
5. Produce the release manifest, checksums, known limitations, topology,
   startup order, upgrade/rollback notes, and first-deployment checklist.
6. Separate repository-complete work from external DNS, TLS, registry,
   credentials, `tabletop-auth`, and client-infrastructure dependencies.
7. Prepare the questions and artifact locations to send before the meeting.

### Avoid Unless Coordinated

- Redesigning player-facing entry pages
- Gameplay rules or Godot gameplay UI
- Claiming client-environment deployment before access and evidence exist

### Copy/Paste Codex Prompt

```text
Work on Lane 3 of the September 24 Evanopolis delivery sprint: the technical
handoff. Use a separate terminal, Codex session, and worktree. Read AGENTS.md,
docs/delivery/2026-09-24-three-lane-sprint.md, and
docs/delivery/2026-09-22-to-25-handoff-plan.md first. Use jj and prepare focused
PRs; do not land directly on main and never run jj git push.

The goal for tomorrow is a concrete release candidate plus accurate material
that lets the client's technical representative obtain the artifacts,
understand the topology and configuration contract, choose the first target
environment, assign infrastructure ownership, and begin deployment. Audit the
repository and the sibling tabletop-auth dependency before trusting existing
docs. Reconcile stale statements with actual code and deployed behavior.

Own delivery/deployment docs, environment templates, manifests, container and
web-bundle packaging, smoke checks, topology, operator checklists, and known
limitations. Make narrowly necessary deploy/build changes when they are needed
for a reproducible handoff. Avoid redesigning the wrapper entry experience or
changing gameplay rules. Clearly separate what is verified locally or in
staging from what still requires DNS, TLS, secrets, registry access,
tabletop-auth coordination, or client infrastructure.

Work through the Thursday handoff checklist: identify the candidate revision;
run feasible clean builds, tests, image health checks, and staged smoke checks;
assemble versioned artifact metadata and checksums; document configuration,
startup, diagnostics, persistence, upgrade, and rollback; and prepare the
questions and artifact locations for the technical representative. Never put
real secrets in documentation.

For each coherent PR slice, run just sync-review-version, use jj describe with
a Conventional Commit summary, blank line, and detailed body, choose a
descriptive branch name, and prepare its bookmark. Tell the user exactly what
must be pushed. Once the remote bookmark exists, track <branch>@origin and open
or update the PR. Report verified evidence, external blockers with owners, and
the shortest path to tomorrow's handoff.
```

## Integration Order

1. Keep Lane 1 moving on `main` because it owns the most visible meeting
   outcome.
2. Rebase or refresh Lane 2 and Lane 3 from current `main` before final review.
3. Review and land focused gameplay and handoff PRs without copying their
   payloads into fresh commits, so GitHub preserves normal merged-PR semantics.
4. Resolve generated review/version labels in favor of current `main`.
5. After the desired PRs are landed, run `just sync-review-version` once and
   execute the final cross-lane smoke and presentation checks.

## Meeting-Ready Definition

The sprint is ready to present when:

- a client can open a clean public page, create either kind of room, share an
  invitation, and understand how to join without developer guidance;
- the highest-value completed gameplay improvements are demonstrable and each
  unresolved rule is named rather than hidden;
- the technical representative has artifact locations, topology,
  configuration requirements, known limitations, and a concrete first
  deployment checklist; and
- every claim in the meeting can be tied to a tested path, artifact, document,
  or explicitly assigned follow-up.
