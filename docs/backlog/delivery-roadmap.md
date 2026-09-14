# Evanopolis Delivery Roadmap

Date: 2026-09-13

This is the working checklist to revisit at the end of each implementation
slice until the game is ready to deliver.

## Rule Source Hierarchy

1. Follow `docs/spec/raw_game_rules_spec_draft.txt` when a rule is present
   there, even if it is incomplete or roughly written.
2. When the raw spec is vague, implement the smallest playable interpretation
   that fits the text and record the decision.
3. When the raw spec is silent, fall back to regular Monopoly expectations and
   mark the behavior as provisional/client-approval-needed.

## Current Playable Foundation

- [x] Multiplayer match join and authoritative server snapshots.
- [x] Server-authoritative dice rolls with reproducible random seed support.
- [x] Terrain purchase flow.
- [x] Base rent payment flow.
- [x] Luck and destiny decks with simple EVA delta cards.
- [x] Card acknowledgement flow with game-over handling for unaffordable costs.
- [x] Portfolio panel for owned terrain.
- [x] Development order command flow.
- [x] Delivered containers and machine lots reflected in portfolio.
- [x] Delivered containers and machine lots reflected on the 3D board.
- [x] Owned terrain tile rent labels reflect delivered development level.

## Required Before Delivery

### Production Create Match, Invite, Wallet Auth, And Paid Admission Flow

Status: launch blocker.

This project is currently using a free-to-play demo bootstrap so development,
testing, and client validation can move quickly. That path is not the production
launch flow.

Before delivery, restore the pay-to-play entry flow from the previous
`../evanopolis-deliverable` + `../tabletop-auth` architecture:

- players authenticate in the browser with a wallet/SIWE flow
- a creator creates a room with production room settings, including maximum
  player count and room buy-in/admission policy
- the room service returns durable room metadata and invite links
- invited players open the link, authenticate with their wallets, and join that
  room context
- every participating wallet pays the required EVA token admission ticket using
  the testnet payment smart contract path
- payment is verified server-side against the configured chain, contract,
  player wallet, amount, and room/game id
- the game server admits only authenticated, verified, eligible players for the
  room
- the graphical client launches from a wrapper-owned launch payload after auth,
  room lookup, payment verification, and admission are satisfied

Reference implementation/docs:

- `../evanopolis-deliverable/TODO.md`
- `../evanopolis-deliverable/apps/web-wrapper/docs/USER_FLOW.md`
- `../evanopolis-deliverable/apps/rooms-api/README.md`
- `../tabletop-auth/docs/auth-login-design.md`
- `../tabletop-auth/docs/payment-auth-overview.md`
- `../tabletop-auth/docs/api.md`
- `../tabletop-auth/docs/payment-rpc-runbook.md`

Checklist:

- [x] Add or port a production room service surface for authenticated
      `create room`, public invite lookup, room settings, and durable room
      metadata.
- [x] Keep temporary free/demo `join_match` options clearly separate from the
      production room bootstrap contract.
- [ ] Add browser wallet login in the wrapper using the `tabletop-auth` SIWE/JWT
      contract.
- [x] Add create-room UI for max players and buy-in/admission settings.
- [x] Add invite-link generation and invite-link join flow.
- [ ] Add EVA token approval/payment UI for the room admission ticket.
- [ ] Integrate payment verification/recovery against the testnet payment
      contract through the auth/payment service.
- [ ] Bind payment verification to wallet address, room/game id, ticket amount,
      chain id, configured adapter contract, and confirmation policy.
- [ ] Have the game server hydrate authoritative matches from trusted room
      metadata rather than client-supplied room settings.
- [ ] Enforce admission server-side at join time so unpaid/unverified players
      cannot enter by bypassing the wrapper.
- [ ] Preserve reconnect behavior for already-admitted players without requiring
      duplicate payment.
- [ ] Define room expiration/capacity/duplicate-wallet behavior.
- [ ] Document local and staging end-to-end runbooks covering auth, room create,
      invite, payment, verified join, launch, gameplay, and reconnect.
- [ ] Add automated coverage for create room, invite lookup, verified admission,
      rejected admission, reconnect, and payment mismatch/failure cases.

## Priority Roadmap

### 1. Salida / Start Passing

Spec anchor:

- Passing `SALIDA`: `+2 EVA` and `1 tiro gratis del jackpot`.
- Landing exactly on `SALIDA`: additional `+1 EVA`, total `+3 EVA`.

Checklist:

- [x] Server detects movement crossing `SALIDA`.
- [x] Server detects exact landing on `SALIDA`.
- [x] Server applies the EVA award.
- [x] Protocol records/emits the award event.
- [x] Tests cover pass-only, exact landing, and non-crossing movement.
- [x] Client reflects the resulting balance through the authoritative snapshot.
- [x] Decide whether jackpot free roll is deferred or represented as pending
      placeholder state until jackpot exists.

Decision: jackpot free rolls are recorded in the `start_bonus_collected` event
for now. Persistent jackpot/free-roll state remains in the Jackpot roadmap item.

### 2. Rent Formula Audit

Spec anchor:

- Investment total = terrain value + container cost + installed machine lot cost.
- Level 0 to 5 percentages: `50%`, `60%`, `70%`, `80%`, `90%`, `100%`.
- Owning all 4 terrain in a city at level 5 doubles base rent.
- Special property bonuses apply after the monopoly multiplier.

Checklist:

- [x] Confirm current server rent table matches the formula for all cities and
      levels.
- [x] Replace hardcoded or stale rent values if any mismatch the spec.
- [x] Add/adjust tests for each level calculation.
- [x] Add/adjust tests for city monopoly at all 4 terrain level 5.
- [x] Confirm client portfolio and tile rent displays match server-calculated
      rent.

Decision: base rent tables already matched the investment-total formula. The
missing piece was the all-4-terrain city monopoly multiplier at level 5; this is
now applied server-side and mirrored in board/portfolio rent displays. Special
property rent bonuses remain in the Special Property Effects item.

### 3. Special Property Ownership

Spec anchor:

- All special properties are bought from the bank.
- Importadora 1 costs `5 EVA`.
- Subestacion 1 costs `6 EVA`.
- Taller Propio costs `8 EVA`.
- Importadora 2 costs `5 EVA`.
- Subestacion 2 costs `6 EVA`.
- Cooling Plant costs `10 EVA`.

Checklist:

- [x] Add server-side ownership state for special properties.
- [x] Add purchase command/action for special properties.
- [x] Add unaffordable purchase handling.
- [x] Add protocol events/snapshot fields for special property ownership.
- [x] Add server tests for purchase, duplicate ownership prevention, and
      unaffordable purchase.
- [x] Add client decision panel support when landing on unowned special
      properties.
- [x] Add client tile ownership display for special properties.

Follow-up note:
- Importer 1's visible tile face is currently on `tile_026`, while logical
  board index 3 maps to `tile_003`. This slice avoids remapping board geometry;
  a later board-asset alignment pass should verify all special tile faces match
  their logical indices.

### 4. Special Property Effects

Spec anchor:

- Importadora owner receives equipment purchase commission.
- One importadora gives `10%` commission.
- Owning both importadoras raises commission to `20%`.
- One substation gives `+10%` global rent profitability.
- Owning both substations gives `+30%` global rent profitability total.
- Taller Propio gives `+10%` rent for terrain in its city.
- Cooling Plant gives `+10%` rent for terrain in its city.
- Final rent = base rent x global bonus x city bonus.

Provisional implementation addendum, client approval needed:
- Development orders remain available without an importer for the current
  playable build. Importer gating is deferred.
- Each importadora owner receives 10% equipment commission. If the same player
  owns both importadoras, that player's equipment commission becomes 20%.
- Subestacion 1 makes its owner's terrain collect +10% rent.
- Subestacion 2 also makes its owner's terrain collect +10% rent. If the same
  player owns both substations, that player's terrain collects +30% rent total.
- ~~Taller Propio gives `+10%` rent for terrain in its city.~~
  Use `+10%` rent for all terrain owned by its owner.
- ~~Cooling Plant gives `+10%` rent for terrain in its city.~~
  Use `+10%` rent for all terrain owned by its owner.

Checklist:

- [x] Apply importadora commission when container/machine orders are paid.
- [x] Add event(s) for commission transfer or payout.
- [x] Apply substation global rent bonus.
- [x] Apply Workshop/Cooling rent bonuses using the approved interpretation.
- [x] Add tests covering importadora commission and rent bonus effects.
- [x] Add tests for stacked multiplicative rent bonuses.
- [x] Add client display for special-property-modified rent values.
- [ ] Confirm with client whether Workshop/Cooling Plant should remain
      city-local or use the provisional broad owner rent bonus.
- [ ] Confirm with client whether development should become locked behind
      importadora ownership in a future version.

### 5. Jackpot

Spec anchor:

- Passing `SALIDA` grants `1 tiro gratis del jackpot`.
- Bank purchases distribute `10%` to jackpot.
- The final prize fund and jackpot are part of the intended economy.

Checklist:

- [ ] Decide minimum v1 representation: tracked pool only, free-roll token, or
      playable jackpot roll.
- [ ] Track jackpot contributions from purchases.
- [ ] Track free jackpot rolls earned by crossing `SALIDA`.
- [ ] Add protocol fields/events.
- [ ] Add tests for jackpot contribution and free-roll accrual.
- [ ] Add client display/action if jackpot roll is playable in v1.

### 6. Bank Purchase Distribution

Spec anchor:

- Bank does not retain money.
- Bank purchases split as `10%` jackpot, `30%` referrals, `10%` burn, `50%`
  final prize fund.

Checklist:

- [ ] Apply distribution to terrain purchases.
- [ ] Apply distribution to special property purchases.
- [ ] Apply distribution to equipment/development purchases.
- [ ] Add protocol fields for pools if visible in v1.
- [ ] Add server tests for distribution math.
- [ ] Decide client visibility for jackpot/final prize/referrals/burn.

### 7. Prison / Carcel

Spec anchor:

- `CARCEL` is one of the 6 vertex spaces.
- The provided raw spec does not define prison behavior beyond the space.

Checklist:

- [x] Search for any additional prison rule source before implementation.
- [x] If no source exists, propose a provisional Monopoly-like rule.
- [x] Decide whether landing on `CARCEL` is visiting or punitive.
- [x] Decide what sends a player to prison.
- [x] Decide how a player exits prison.
- [x] Implement server state and turn/action restrictions.
- [x] Add client presentation.
- [x] Mark provisional decisions for client approval.

Provisional implementation addendum, client approval needed:
- Landing on `CARCEL` is punitive for the current demo build.
- Landing on `CARCEL` marks the player as jailed.
- A jailed player skips their next turn by pressing `SERVE SENTENCE`.
- Serving the sentence clears jailed state and advances to the next player.
- No fines, doubles rolls, jail-release cards, or send-to-jail cards exist yet.

## Cross-Cutting Finish Checklist

- [ ] Every finished slice has a numbered devlog entry with status/result.
- [ ] At the end of each slice, update this roadmap if scope/status changes.
- [ ] Run targeted server/client tests for the touched rule.
- [ ] Run `just godot-test` for Godot UI/presentation changes.
- [ ] Run `just godot-server-client-check` for server-client scene changes.
- [ ] Run `just godot-web-export` after Godot/browser-visible changes.
- [ ] Before commit/main, run `just sync-review-version`.
- [ ] Keep a short list of provisional decisions that need client approval.
