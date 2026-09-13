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
- [ ] Add client tile ownership display for special properties.

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
- Once any player owns Importadora 1, development orders unlock for all
  players. The Importadora 1 owner receives 10% equipment commission.
- Importadora 2 has no standalone effect. If the same player owns both
  importadoras, that player's equipment commission becomes 20%.
- Subestacion 1 makes its owner's terrain collect +10% rent.
- Subestacion 2 has no standalone effect. If the same player owns both
  substations, that player's terrain collects +30% rent total.
- ~~Taller Propio gives `+10%` rent for terrain in its city.~~
  Use `+10%` rent for all terrain owned by its owner.
- ~~Cooling Plant gives `+10%` rent for terrain in its city.~~
  Use `+10%` rent for all terrain owned by its owner.

Checklist:

- [ ] Apply importadora commission when container/machine orders are paid.
- [ ] Add event(s) for commission transfer or payout.
- [ ] Apply substation global rent bonus.
- [ ] Apply Workshop/Cooling rent bonuses using the approved interpretation.
- [ ] Add tests for each special property effect.
- [ ] Add tests for stacked multiplicative rent bonuses.
- [ ] Add client display for special-property-modified rent values.
- [ ] Confirm with client whether Workshop/Cooling Plant should remain
      city-local or use the provisional broad owner rent bonus.
- [ ] Confirm with client whether development should stay locked until any
      player buys Importadora 1.
- [ ] Confirm with client whether Importadora 2/Subestacion 2 should have no
      standalone effect.

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

- [ ] Search for any additional prison rule source before implementation.
- [ ] If no source exists, propose a provisional Monopoly-like rule.
- [ ] Decide whether landing on `CARCEL` is visiting or punitive.
- [ ] Decide what sends a player to prison.
- [ ] Decide how a player exits prison.
- [ ] Implement server state and turn/action restrictions.
- [ ] Add client presentation.
- [ ] Mark provisional decisions for client approval.

## Cross-Cutting Finish Checklist

- [ ] Every finished slice has a numbered devlog entry with status/result.
- [ ] At the end of each slice, update this roadmap if scope/status changes.
- [ ] Run targeted server/client tests for the touched rule.
- [ ] Run `just godot-test` for Godot UI/presentation changes.
- [ ] Run `just godot-server-client-check` for server-client scene changes.
- [ ] Run `just godot-web-export` after Godot/browser-visible changes.
- [ ] Before commit/main, run `just sync-review-version`.
- [ ] Keep a short list of provisional decisions that need client approval.
