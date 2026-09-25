# September 25 Release Candidate Validation

Status: preliminary candidate rejected; artifact alignment fixed and final RC
freeze automation ready for review.

## Candidate Audited

- Evanopolis source: `1517d870d4e6739a5c9e6150b1cd4f6b06b4a666`
- Build label: `qkmxsrvt`
- `tabletop-auth` source inspected locally:
  `96fbe38ffc367931ccc529298f4d2a799fdc9f0a`
- Audit date: 2026-09-25

No other Evanopolis pull request was open when this audit began.

## Verified Evidence

### Repository CI

- GitHub Pages workflow for `1517d870`: passed.
- Game Server test, image publication, staging deployment, and smoke workflow
  for `1517d870`: passed.
- The immediately preceding Game Server workflow failure was isolated to the
  Fly CLI setup step; its test and image-publication jobs passed.

### Clean Local Container Builds

- Game Server image built from the candidate Dockerfile.
  - Dockerfile test result: 121 passed, 0 failed.
  - Local image ID:
    `sha256:959ada8931c6a1c24e34b7853e2953ed02b097ea252dac2bbc93a2a37a57966c`
  - Platform: `linux/amd64`.
- Rooms API image built from the candidate Dockerfile.
  - Dockerfile test result: 9 passed, 0 failed.
  - Local image ID:
    `sha256:6322966de73ccb615f3c5ff2c7b093c23929c95ccdef830c5d68965a6e430c91`
  - Platform: `linux/amd64`.

The image IDs above are local Docker image identifiers, not registry digests.

### Local Container Health

- Temporary Game Server container passed `GET /health` and reported
  `version=qkmxsrvt`.
- Temporary Rooms API container passed `GET /healthz`.
- Both explicitly named temporary containers were stopped and removed after
  the checks.

### Staging Health

- Game Server staging `GET /health`: passed and reported `qkmxsrvt`.
- Rooms API staging `GET /healthz`: passed.
- `tabletop-auth` staging `GET /health`: passed.
- GitHub Pages entry URL responded with the configured redirect to
  `https://www.falafel.com.br/evanopolis-v1/`.

### Published Artifact Inspection

- Game Server candidate image exists at
  `ghcr.io/falafel-open-games/evanopolis-v1-game-server:sha-1517d870d4e6739a5c9e6150b1cd4f6b06b4a666`.
- Game Server candidate OCI index digest:
  `sha256:8b94539adabb5b8251d3c7f0022f92db0e9020531be8a17c584c6b75168b318a`.
- GitHub Pages produced a non-expired candidate artifact.

## Rejection Reason

The exact candidate Rooms API tag did not exist:

```text
ghcr.io/falafel-open-games/evanopolis-v1-rooms-api:sha-1517d870d4e6739a5c9e6150b1cd4f6b06b4a666
```

The Rooms API workflow only ran for Rooms API paths and did not include
`BUILD_VERSION`. The post-merge version-sync commit therefore published the
Game Server candidate but not the Rooms API candidate. A release manifest
cannot honestly claim a single pinned source revision for both images.

## Corrective Action and Next Gate

Add `BUILD_VERSION` to the Rooms API workflow path filter. After that change is
reviewed and landed:

1. run the post-merge review-version sync;
2. confirm both SHA-tagged images exist for the resulting `main` revision;
3. resolve and record both registry digests;
4. rebuild/package the web client from that exact revision;
5. repeat local and staging health checks;
6. populate the release manifest; and
7. only then create the RC tag and inspect the draft GitHub Release.

No RC tag or GitHub Release was created from the rejected candidate.

## Final Freeze Inputs

The Rooms API trigger correction landed and the next synchronized `main`
revision published aligned Game Server and Rooms API images successfully. The
private `tabletop-auth` dependency is now published as:

- source revision: `b977c5c0ec261b47cfbd77c8396170b0e2f00733`;
- immutable image tag:
  `ghcr.io/falafel-open-games/tabletop-auth:sha-b977c5c0ec261b47cfbd77c8396170b0e2f00733`;
- OCI index digest:
  `sha256:f29045f1ec89a28eb284922be924191bc451880ee610d0091bfbc429bacb78be`.

The tag workflow now generates `release-manifest.yaml` after resolving the
Game Server and Rooms API digests for the tagged `GITHUB_SHA`. This avoids an
impossible self-referential source SHA in a committed manifest and ensures the
draft prerelease contains the exact web checksum and all three container
digests.

The RC tag must only be pushed after the Game Server and Rooms API workflows
have published successful `sha-<full-commit>` images for the tag target.
