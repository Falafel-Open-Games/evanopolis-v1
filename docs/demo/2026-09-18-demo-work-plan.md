# September 18 Client Demo Work Plan

Prepared: 2026-09-17. Timebox: roughly one working day.

The meeting agenda and live decision sheet are in
[the September 18 client meeting script](2026-09-18-client-meeting-script.md).

## Current Baseline

- The deployed paid flow was validated with two paid players on 2026-09-17.
- The player balance roster and clearer terrain rent labels are already on `main`.
- The remaining post-demo feedback is tracked in
  [the feedback notes](2026-09-14-post-demo-feedback.md).
- The two workspaces start clean from the same `main` revision. This plan is a
  schedule, not a claim that the slices below are implemented.

## Track A: This Chat, Main Workspace

Own gameplay state, protocol, and integration work here. Avoid parallel edits
to these files in the small-PR workspace.

1. **Public card visibility and reviewable events.** Inspect the existing card
   event/snapshot flow, then make a `Destino` draw and its result visible to all
   players. Keep the acting player's decision authority unchanged. Add a way to
   review important recent match events so a short toast is not the only record.
   Verify with two clients and focused server/Godot tests.
2. **Paid reconnect and duplicate-wallet behavior.** Reproduce reconnect after
   a paid player refreshes or loses the socket. Define the intended same-wallet
   replacement behavior from the existing admission contract, fix only the
   confirmed gap, and cover the accepted and rejected cases with integration
   tests. This is a delivery blocker even if it is less visible in the demo.
3. **If time remains: jail rule.** Replace the provisional one-turn sentence
   with the client's stated doubles / `1 EVA` / two-round rule. Cover server
   transitions and the landing/turn UI copy. Treat this as one complete slice;
   otherwise show it as agreed feedback awaiting implementation.

Track A owns `apps/game-server/`, `godot/game/scripts/server_client_main.gd`,
the card presenter/panel, and the paid join/launch path in the web wrapper.

## Track B: Small PR Workspace

Use `../evanopolis-v1-small-prs`, one focused PR at a time. Start from current
`main` before each PR, and avoid Track A's owned files.

1. **English board-space labels.** Update the visible board art/scene labels
   for `Cárcel`, `Destino`, and `Suerte` to `JAIL`, `DESTINY`, and `LUCK`. Check every
   board instance and the review scene. Keep the logical `space_id` and rule
   names stable. Include a screenshot or visual check and a small devlog entry.
2. **Demo-facing room entry polish.** Review the current paid create/invite/pay
   screens for unclear text and recoverable error presentation. Make a separate
   PR only for concrete, reproducible issues in wrapper UI files outside the
   paid launch/admission path. Include browser checks for create and invite.
3. **If time remains: audio controls.** Add a self-contained music on/off and
   volume UI only if a suitable licensed asset is available and the change
   stays independent of gameplay/protocol files. Otherwise use the time for a
   polished demo runbook and a final visual QA pass.

The Track B chat should prepare each PR branch and hand over its bookmark and
test results. The user performs the keyed push; once the branch is on origin,
Track B can open the PR and hand over its URL. Track A lands PR branches with
their ancestry intact so GitHub recognizes them as merged.

## Integration Checkpoints

1. Land the board-label PR after Track A's first gameplay slice is tested.
2. Land any other small PR at a pause between Track A slices, not during a
   shared Godot export or while both workspaces edit the same file.
3. After all selected PRs are landed, run `just sync-review-version` once,
   then run the relevant server tests, `just godot-test`,
   `just godot-server-client-check`, and a web export for browser-visible Godot
   changes. Validate the paid two-player path and the new feedback behavior in
   a browser before the demo.

## Demo Cut Line

The minimum useful demo improvement is one public/reviewable feedback event,
English board labels, and a stable paid two-player entry. Reconnect hardening
is the strongest delivery improvement. A partial jail or timer implementation
should not be presented as complete. The turn timer, economy multiplier,
insolvency transfer model, and final card/economy content need dedicated rule
decisions and larger slices after this timebox.

## Ready-to-Paste Brief for the Small-PR Chat

> Work in `../evanopolis-v1-small-prs`. Read `AGENTS.md`. The main workspace
> has the plan at `../evanopolis-v1/docs/demo/2026-09-18-demo-work-plan.md`.
> Your first slice is the English
> board-space label pass only: update the visible `Cárcel`, `Destino`, and
> `Suerte` labels to `JAIL`, `DESTINY`, and `LUCK` without changing logical IDs or game
> rules. Check the review and server-client scenes, add a numbered devlog,
> run relevant Godot checks, and prepare a focused PR branch. Use `jj` for version
> control, track your PR bookmark with origin, and leave keyed pushing to me.
> Once I push the branch, open the PR. Send back the bookmark, PR URL when
> available, files changed, and verification. Do not edit
> `apps/game-server/`, `godot/game/scripts/server_client_main.gd`, card panel
> files, or paid join/launch files; those belong to the main chat. After that
> PR, inspect room-entry polish as the next independent slice.
