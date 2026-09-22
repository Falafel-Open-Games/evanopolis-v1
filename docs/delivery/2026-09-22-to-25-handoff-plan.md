# Technical Handoff Plan — Tuesday September 22 to Friday September 25

## Friday Outcome

By Friday's meeting, give the client's technical representative a concrete
release candidate and enough operating information to begin building the final
integration and deployment environments.

Friday is the start of the infrastructure handoff, not the final production
deployment. A successful meeting ends with:

- the technical representative able to obtain every artifact;
- the service topology and configuration contract understood;
- one environment selected as the first integration target;
- owners assigned for DNS, TLS, secrets, persistence, and wallet/payment
  configuration;
- the first deployment attempt scheduled or started; and
- technical blockers recorded with an owner and next action.

## Package to Send Before the Meeting

### Versioned artifacts

- Game server container image pinned by source commit, not only `latest`.
- Rooms API container image pinned by source commit.
- `tabletop-auth` container image or its separate build instructions and pinned
  source revision.
- Static web wrapper and Godot web export as a versioned archive.
- Release manifest listing source revisions, image names and digests, web bundle
  checksum, build identifier, and build date.

### Operating material

- Environment-variable template for every service, with required and optional
  values identified and secrets represented only by placeholders.
- Service topology showing browser, web host, Rooms API, game server,
  `tabletop-auth`, blockchain RPC/payment adapter, and persistent stores.
- Startup order, health endpoints, WebSocket endpoint, smoke checks, expected
  success responses, and basic log checks.
- TLS, reverse-proxy, WebSocket upgrade, CORS, and public-domain requirements.
- Upgrade and rollback procedure for a pinned release.
- Known limitations, especially in-memory active matches and the current
  single-replica requirement for the game server.
- Production entry-flow contract covering room creation, invitation, login,
  allowance, payment, duplicate-seat prevention, admission, and expired-session
  recovery.

## Work Plan

### Tuesday — define and inventory

1. Inventory all deployable services and the exact artifacts each repository
   can produce.
2. Write the cross-service environment contract and identify missing values.
3. Document the room-creator fields and invited-player fields and flows.
4. Decide the proposed target topology for the first client environment while
   keeping the instructions platform-neutral where possible.
5. List external activation work for `evanopolis.falafel.com.br`, including
   DNS, TLS, root routing, and CORS for both APIs. Treat it as the
   project-hosted demo/beta address, not the client's final hostname.

### Wednesday — assemble the first bundle

1. Add a production-oriented environment template and operator runbook.
2. Add a repeatable local or staging composition for the Evanopolis services,
   or document exact commands if the client's platform will provide the
   orchestration layer.
3. Build the game server and Rooms API images locally and run their health
   checks.
4. Export and archive the static web client.
5. Coordinate the matching `tabletop-auth` image, configuration, and database
   requirements from its repository.
6. Begin the friendlier, responsive room creation and invitation entry pages as
   a separate user-facing track.

### Thursday — freeze and validate the candidate

1. Select one source revision as the Friday handoff candidate.
2. Run automated tests and container smoke checks from clean builds.
3. Exercise one complete staged path: create room, authenticate, approve
   allowance if required, pay, accept invitation with a second account, join the
   same match, refresh, and reconnect after session expiry.
4. Check the entry pages at representative desktop and smartphone widths.
5. Produce the release manifest, checksums, known-limitations list, and a short
   first-deployment checklist.
6. Send the artifact locations and documents to the technical representative
   with enough lead time to obtain them before Friday.

### Friday — technical integration kickoff

1. Walk through the topology and browser-to-service request flow.
2. Confirm the client's target infrastructure, container runtime or
   orchestrator, registry access, public domains, TLS termination, and secret
   management.
3. Confirm persistence and backup expectations for auth data and room metadata.
4. Make an explicit decision about active-match durability: accept a
   single-replica in-memory V1 limitation or schedule match persistence before
   production acceptance.
5. Review required outbound blockchain RPC access and payment-adapter settings.
6. Pull or build the pinned artifacts and start the first target environment if
   access and credentials are available.
7. Run health checks, load the entry page, and verify WebSocket and CORS routing.
8. Record failures, missing values, infrastructure owners, and the next joint
   deployment checkpoint.

## Questions to Send the Technical Representative in Advance

- Which platform will run the containers: Docker Compose, Kubernetes, a cloud
  container service, or another system?
- Which container registry can their environment pull from, and can it access
  the current GHCR packages?
- Which hostname under `evervaluecoin.com` should serve the final client entry
  page, and who on their team controls its DNS and TLS certificates?
- Should `evanopolis.falafel.com.br`, which Fabricio controls, remain available
  as the project-hosted demo and beta-testing environment?
- Which public hostnames should be used for the web client, Rooms API, game
  WebSocket server, and authentication/payment service?
- How are secrets stored and injected?
- Which database or persistent-volume services are available?
- Are outbound HTTPS and WebSocket connections restricted?
- Which blockchain network, RPC endpoint, payment-adapter address, and
  confirmation policy should the integration environment use?
- Which Chrome, Safari, iPhone, Android, and mobile-wallet combinations must be
  part of acceptance?
- Should the first environment use the existing blockchain payment path, the
  client's prepaid-credit integration, or both?

## Scope Protection

The Friday bundle may contain a release candidate with documented limitations.
It should not present unresolved rules or infrastructure assumptions as final.
The client deployment is complete only when the shared
[delivery completion checklist](completion-checklist.md) is satisfied.
