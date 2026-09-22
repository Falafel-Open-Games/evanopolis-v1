# 0095 - Simplified Production Entry

Date: 2026-09-22

## Result

- Define the host and invited-player entry requirements for the client design
  team in `docs/design/production-entry-page-requirements.md`.
- Reshape the demo entry page around three player-facing areas: wallet, room
  setup or invitation, and seat payment/launch.
- Keep API endpoints, chain ID, room UUID, transaction recovery, and developer
  navigation inside secondary disclosures.
- Combine balance, allowance approval, payment, and verification behind one
  guided primary payment action while retaining individual recovery controls.
- Add an invitation-copy action and responsive phone layout.

## Verification

- `node --check apps/web-wrapper/room-entry.js`
- Chromium render at 1440 × 1000
- Chromium render at 390 × 844
