# Evanopolis V1 Rules Spec

This document is the programmer-facing normalized rules draft for the client's
current intended game.

Source of intent:
- `raw_game_rules_spec_draft.txt`

This document preserves the client intent where it is clear, and marks missing
or contradictory rules explicitly.

## 1. Product Shape

Evanopolis V1 is a turn-based economic board game with:
- purchasable terrain tiles
- property development through mining infrastructure
- purchasable special properties that modify income or purchases
- chance-style card spaces (`Suerte`, `Destino`)
- a buy-in based room economy in `EVA`
- bank purchase revenue splits into jackpot, referrals, burn, and final prizes
- a final ranking payout model where the top 3 players receive prizes

Do not infer unspecified rules from classic Monopoly; only rules explicitly defined here or later approved by the client should be implemented.

## 2. Core Data Model

Recommended server-authoritative entities:
- `match`
- `player`
- `board_space`
- `terrain_tile`
- `special_property`
- `city_group`
- `card`
- `bank`
- `jackpot`
- `prize_pool`
- `turn_state`

Recommended board model:
- circular array of 36 positions

## 3. Board Layout

The board contains 36 spaces.

### 3.1 Vertex Spaces

There are 6 special vertex spaces in clockwise order:
1. `Salida`
2. `Suerte`
3. `Destino`
4. `Carcel`
5. `Suerte`
6. `Destino`

### 3.2 Side Layout

Each of the 6 sides contains 5 spaces in this order:
1. terrain
2. terrain
3. special property
4. terrain
5. terrain

### 3.3 Totals

- 24 terrain tiles
- 6 special properties
- 6 vertex spaces
- 36 total spaces

## 4. Terrain Groups

There are 6 cities, each with 4 terrain tiles.

Base terrain purchase values:
- Caracas: `1 EVA`
- Asuncion: `2 EVA`
- Ciudad del Este: `2 EVA`
- Minsk: `3 EVA`
- Siberia: `3 EVA`
- Texas: `4 EVA`

Open question:
- The raw draft defines city names and base values, but not their exact board
  indices. The normalized implementation will need a fixed mapping from board
  position to city/tile identity.

## 5. Terrain Development

Each terrain tile can contain:
- 1 hydro container costing `2 EVA`
- 1 to 4 machine lots
- each machine lot represents 50 machines
- each machine lot costs `1 EVA`
- maximum machine count per tile: `200`
- maximum development level: `5`

### 5.1 Development Levels

Level meanings:
- Level 0: empty terrain
- Level 1: container only
- Level 2: container + 1 machine lot
- Level 3: container + 2 machine lots
- Level 4: container + 3 machine lots
- Level 5: container + 4 machine lots

Important inferred invariant:
- machine lots require the container to exist first

Open question:
- The raw draft says a terrain can have a container and `1 to 4` lots, but does
  not explicitly state whether players may buy multiple lots in one action or
  only one increment at a time.

## 6. Invested Value Per Terrain

For rent calculations, each terrain tracks `total_invested_value`:

`total_invested_value = terrain_base_value + container_cost_if_present + machine_lot_cost_total`

Examples:
- Caracas fully developed: `1 + 2 + 4 = 7 EVA`
- Texas fully developed: `4 + 2 + 4 = 10 EVA`

## 7. Base Rent Formula

Base rent depends on development level and total invested value.

| Level | Infrastructure | Rent Percentage |
| --- | --- | --- |
| 0 | Empty terrain | 50% |
| 1 | Container | 60% |
| 2 | +50 machines | 70% |
| 3 | +100 machines | 80% |
| 4 | +150 machines | 90% |
| 5 | +200 machines | 100% |

Base formula:

`base_rent = total_invested_value * level_percentage`

Interpretation note:
- level 0 terrain still charges rent at 50% of terrain base value

Open question:
- The draft does not state whether rent is rounded, floored, or stored in full
  decimal precision. The server should use a fixed numeric policy before money
  logic is finalized.

## 8. Monopoly Bonus

If a player owns all 4 terrain tiles in a city and all 4 are level 5:

`monopoly_rent = base_rent * 2`

This multiplier applies before global and local bonus multipliers.

Open question:
- The draft only defines the monopoly bonus for full level-5 ownership. It does
  not define whether owning all 4 tiles without full development provides any
  lesser bonus. Current normalized assumption: no bonus unless all 4 are level 5.

## 9. Special Properties

There are 6 special properties, all purchased from the bank.

### 9.1 Importadora 1

- purchase price: `5 EVA`
- effect: enables purchase of containers and machines
- owner receives 10% commission from all equipment purchases by any player

### 9.2 Subestacion 1

- purchase price: `6 EVA`
- effect: `+10%` global profitability modifier on final rent

### 9.3 Taller Propio

- purchase price: `8 EVA`
- effect: `+10%` local rent modifier for all terrain tiles in the city where it is located

### 9.4 Importadora 2

- purchase price: `5 EVA`
- effect: if a player owns Importadora 1 and Importadora 2, equipment commissions become `20%`

### 9.5 Subestacion 2

- purchase price: `6 EVA`
- effect: if a player owns Subestacion 1 and Subestacion 2, global profitability becomes `+30% total`

### 9.6 Cooling Plant

- purchase price: `10 EVA`
- effect: `+10%` local rent modifier for the city where it is located

## 10. Rent Modifier Order

The raw draft says bonuses are multiplicative and gives this high-level formula:

`final_rent = base_rent * global_bonus * city_bonus`

Normalized order:
1. calculate `base_rent` from invested value and level
2. apply monopoly bonus if eligible
3. apply global bonus multiplier
4. apply local city bonus multiplier

Open questions:
- Does `Subestacion 1 + Subestacion 2` mean total global multiplier is `1.30x`
  and replaces the individual bonuses, or do both individual bonuses still stack
  separately?
- If a city contains both `Taller Propio` and `Cooling Plant`, is the intended
  local multiplier `1.1 * 1.1 = 1.21x`?
- Are special property bonuses active immediately on purchase?

## 11. Equipment Purchase Gating

Normalized assumption from draft wording:
- players may only buy containers and machine lots if at least one player owns
  the relevant importadora ability
- actual purchase access is unlocked by `Importadora 1`
- owning both importadoras increases commission rate but does not change the
  equipment catalog itself

Open questions:
- Can any player buy equipment once Importadora 1 exists in the match, or only
  the importadora owner?
- At what point in the turn can equipment purchases happen?
- Can a player buy equipment remotely for any owned tile, or only from specific
  board positions?

## 12. Turn Flow

Each turn currently normalizes to:
1. roll 2 dice
2. move forward by the total
3. resolve pass-through `Salida` reward if crossed
4. resolve landing space
5. if the landing space is purchasable and available, offer purchase
6. if the landing space is owned by another player and rent applies, charge rent
7. if the landing space is `Suerte` or `Destino`, draw and resolve a card
8. if the landing space is `Salida`, apply exact-landing bonus
9. end turn

Open questions:
- The draft does not define doubles behavior.
- The draft does not define extra turns from doubles.
- The draft does not define whether card effects can trigger additional movement
  or additional purchases within the same turn.

## 13. Salida Rules

When a player passes `Salida`:
- gain `2 EVA`
- gain `1` free jackpot spin

When a player lands exactly on `Salida`:
- gain `1 EVA` additional
- total reward for exact landing after passing logic: `3 EVA`

Open question:
- The raw draft references jackpot spins, but jackpot mechanics themselves are
  not defined.

## 14. Suerte and Destino

Board spaces for `Suerte` and `Destino` exist, but the card systems are not
specified in the raw draft.

Implementation status:
- cannot be implemented yet without a card list and resolution rules

Required missing definitions:
- card deck contents
- deck sizes
- shuffle policy
- whether decks are separate or shared
- whether cards persist in hand or resolve immediately
- whether there are keepable cards such as jail release cards

## 15. Carcel

`Carcel` exists on the board, but no rules are defined for it.

Implementation status:
- cannot be implemented yet without explicit jail behavior

Required missing definitions:
- what sends a player to jail
- what happens when landing on jail normally
- whether jailed players skip turns
- how players leave jail
- whether fines or cards apply

## 16. Room Buy-In

Base room buy-in:
- `50 EVA` per player

Raw scaling formula:
- `new_value = base_value * (room_buy_in / 50)`

Open question:
- The raw draft does not define which values are scaled by buy-in.

Candidate scalable values:
- terrain prices
- special property prices
- equipment prices
- rent values
- pass-through `Salida` rewards
- jackpot contributions
- final prize pool values

This must be signed off explicitly before implementation.

## 17. Bank Inventory Value

The bank initially owns:
- terrain value: `60 EVA`
- special properties: `40 EVA`
- containers: `48 EVA`
- machine lots: `96 EVA`
- total theoretical value: `244 EVA`

Interpretation:
- this appears to be a bookkeeping statement of total purchasable asset value,
  not a cash reserve system

## 18. Bank Money Handling

The primary economic rule is:
- the bank does not retain money from purchases

Any purchase made from the bank is split as follows:
- `10%` to jackpot
- `30%` to referrals
- `10%` to burn
- `50%` to final prize pool

Example for an `8 EVA` purchase:
- jackpot: `0.8 EVA`
- referrals: `2.4 EVA`
- burn: `0.8 EVA`
- final prize pool: `4 EVA`

Open questions:
- Who receives the referrals allocation if no referral relationship exists?
- Is the referrals amount distributed to one referrer, multiple referrers, or a
  predefined tree?
- What exact accounting object holds burned value?
- Are purchase commissions to Importadora owners taken before or after this bank
  split?

## 19. Rent Transfers

When one player pays rent to another:
- the owner receives 100% of the rent
- the bank receives no commission

Open questions:
- What happens if the paying player cannot afford full rent?
- Is partial payment allowed?
- What liquidation order applies before bankruptcy?

## 20. Match Objective and Endgame

Current stated objective:
- finish in the top 3
- the top 3 receive prizes from the final prize pool

This is not yet enough to implement endgame.

Required missing definitions:
- what event ends the match
- whether players can be eliminated through bankruptcy
- whether the match ends by time, rounds, remaining players, or asset exhaustion
- how top 3 ranking is determined
- how prize pool is split among top 3
- what happens if fewer than 3 players remain

## 21. Mandatory Open Questions Before Implementation

These are blocking questions that must be resolved before authoritative rules can
be implemented safely:

1. What exactly do `Suerte` and `Destino` cards do?
2. What exactly does `Carcel` do?
3. What event ends the match?
4. How are the top 3 determined and rewarded?
5. What values scale with room buy-in?
6. When can players buy terrain upgrades and special properties?
7. Who can buy equipment once importadora exists?
8. How are importadora commissions accounted relative to bank purchase splits?
9. How does debt and bankruptcy work?
10. What is the full jackpot mechanic?
11. Are special-property bonuses active immediately and always-on?
12. What rounding policy should be used for EVA arithmetic?

## 22. Safe Implementation Guidance

Before the blocking questions are answered, only these areas are safe to start:
- repo structure
- server-authoritative turn/state architecture
- board data structures
- property/city/special-property static definitions
- wallet/auth/wrapper integration boundaries
- generic RPC/session transport
- deploy/runbook baseline

Rules that should not be implemented yet as final behavior:
- card systems
- jail behavior
- jackpot flow
- endgame resolution
- bankruptcy resolution
- buy-in scaling
- special-property edge interactions

## 23. Normalized Assumption Policy

If the team chooses to prototype before all answers exist, every unresolved rule
must be tagged in code and docs as one of:
- `CLIENT_DECISION_REQUIRED`
- `TEMPORARY_V1_ASSUMPTION`
- `NOT_IMPLEMENTED`

That prevents prototype behavior from silently becoming the production ruleset.
