# Evanopolis V1 Delivery Completion Checklist

Status: draft for joint agreement.

The immediate technical handoff work is organized in the
[September 22–25 handoff plan](2026-09-22-to-25-handoff-plan.md).

The delivery is complete when every item below is checked or explicitly
removed from V1 by both sides. Each check must leave the listed evidence so
progress and acceptance are visible to everyone.

## 1. Agree the V1 Rules and Scope

- [ ] Hold one rules signoff session and record the final decisions for the
  jackpot, final prize distribution, turn timer, card values and bank reserve,
  mortgages, and any remaining special property behavior.
- [x] Use the blockchain flow as the only production ticket payment path.
- [ ] Mark every other requested idea as included in V1 or deferred after V1.

Evidence: one approved rules and scope document with no unanswered item that
blocks gameplay or admission.

## 2. Complete and Accept the Playable Game

- [ ] Play one complete multiplayer match in a joint acceptance session using
  the agreed production rules.
- [ ] Verify room creation, invitations, one seat per account, reconnection,
  full turn flow, properties, developments, cards, jackpot, timer, game over,
  winner, event history, sound, and language presentation.
- [ ] Verify the production room creation and invitation pages at supported
  desktop and smartphone widths, plus the simplified beta free-play entry.
- [ ] Record any accepted cosmetic limitation separately from blocking defects.

Evidence: a dated acceptance-session result with blocking defects closed.

## 3. Validate the Production Integration

- [ ] Connect the selected account, credit, or wallet services in staging.
- [ ] Confirm payment or debit, duplicate-entry prevention, admission, expired
  session recovery, and rejection paths with client-owned test accounts.
- [ ] Validate sign-in, allowance, payment, and admission in Chrome and Safari,
  including at least one smartphone wallet flow.
- [ ] Agree the required environment variables, secrets, domains, CORS origins,
  and service ownership.

Evidence: one successful staged paid match with at least two real accounts and
documented failure-path checks.

## 4. Deliver the Deployment Package

- [ ] Deliver versioned Docker images for the server components and a versioned
  web client bundle, with the exact source revision recorded.
- [ ] Deliver instructions for configuration, secrets, startup order, health
  checks, backup or persistence expectations, upgrades, and rollback.
- [ ] Deliver an environment template and a single operator checklist for
  bringing up the complete system.

Evidence: the client can deploy the pinned delivery version by following the
instructions without undocumented steps.

## 5. Run the Client Deployment Session

- [ ] Deploy the delivery package in the client-controlled target environment.
- [ ] Run service health checks and one end-to-end room creation and match join.
- [ ] Confirm logs and basic operational diagnostics are available to the
  client's operator.

Evidence: recorded deployed versions, service URLs, health results, and the
client operator's acknowledgement.

## 6. Complete the Final Handoff

- [ ] Deliver the agreed source revision, deployment artifacts, operating
  documentation, third-party credits and licenses, and known limitations.
- [ ] Review the final deferred-work list so it cannot be confused with an
  unfinished V1 requirement.
- [ ] Both sides approve the completed checklist.

Evidence: a dated delivery acceptance signed or acknowledged by both sides.
