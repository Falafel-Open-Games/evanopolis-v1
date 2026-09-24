# Buy-In Scaling Proposal

Status: **draft for internal review before client signoff**  
Date: 2026-09-24

## Decision to Record

The client has approved three room ticket values:

- `0.1 EVA`
- `0.5 EVA`
- `1 EVA`

This proposal treats the room ticket as the player's total contribution to the
match. The ticket is divided before play into:

- the player's spendable starting balance;
- an initial contribution to the shared jackpot; and
- an initial contribution to the match bank reserve.

The player's starting balance is therefore intentionally lower than the ticket
price.

For review, this document proposes the following simple allocation:

- `80%` player starting balance;
- `10%` initial jackpot contribution; and
- `10%` initial bank-reserve contribution.

These percentages are a proposal, not yet an approved rule.

The raw rules define a base economy with a `50 EVA` starting balance and this
scaling formula:

`scaled value = raw 50-EVA value × (room ticket / 50 EVA)`

We propose preserving the raw gameplay proportions while treating the approved
`0.5 EVA` ticket as the normal/default tier. Under the proposed allocation,
that ticket gives the player a `0.4 EVA` starting balance. Prices and rewards
are scaled from that spendable balance, not from the full ticket, so their
relationship to the player's initial funds remains equivalent to the raw
`50 EVA` economy.

## Approved Ticket Tiers

| Room tier | Ticket | Player balance: 80% | Jackpot: 10% | Bank reserve: 10% |
| --- | ---: | ---: | ---: | ---: |
| Cheap | 0.1 EVA | 0.08 EVA | 0.01 EVA | 0.01 EVA |
| Average / normal | 0.5 EVA | 0.4 EVA | 0.05 EVA | 0.05 EVA |
| Deluxe | 1 EVA | 0.8 EVA | 0.1 EVA | 0.1 EVA |

The amounts in this table are contributed by each player. For a match with
`N` paid seats:

`initial jackpot = ticket × 10% × N`

`initial bank reserve = ticket × 10% × N`

The `0.5 EVA` ticket replaces the raw `50 EVA` room as the player-facing normal
tier. Its `0.4 EVA` player allocation becomes the reference starting balance
for scaling terrain, development, rent, and Start rewards.

## Scaling Rule

Every amount that belongs to the playable match economy should be derived from
the room ticket:

`player starting balance = room ticket × 80%`

`gameplay scale = player starting balance / 50 EVA`

`scaled gameplay value = raw value × gameplay scale`

The ticket allocation itself is calculated separately. Jackpot and bank seed
amounts must not be credited to the player's spendable balance.

Percentages and non-monetary quantities do not scale. Examples include rent
rates, commission rates, purchase-distribution percentages, dice values,
machine counts, board positions, and jackpot odds.

## Proposed Price Table

### Terrain

| City | Raw value | Cheap: 0.1 EVA | Normal: 0.5 EVA | Deluxe: 1 EVA |
| --- | ---: | ---: | ---: | ---: |
| Caracas | 1 EVA | 0.0016 EVA | 0.008 EVA | 0.016 EVA |
| Asuncion | 2 EVA | 0.0032 EVA | 0.016 EVA | 0.032 EVA |
| Ciudad del Este | 2 EVA | 0.0032 EVA | 0.016 EVA | 0.032 EVA |
| Minsk | 3 EVA | 0.0048 EVA | 0.024 EVA | 0.048 EVA |
| Siberia | 3 EVA | 0.0048 EVA | 0.024 EVA | 0.048 EVA |
| Texas | 4 EVA | 0.0064 EVA | 0.032 EVA | 0.064 EVA |

### Development

| Purchase | Raw value | Cheap: 0.1 EVA | Normal: 0.5 EVA | Deluxe: 1 EVA |
| --- | ---: | ---: | ---: | ---: |
| Hydro container | 2 EVA | 0.0032 EVA | 0.016 EVA | 0.032 EVA |
| One machine lot | 1 EVA | 0.0016 EVA | 0.008 EVA | 0.016 EVA |

Machine quantities remain unchanged: each lot still represents 50 machines,
and a terrain still supports four lots.

### Special Properties

| Property | Raw value | Cheap: 0.1 EVA | Normal: 0.5 EVA | Deluxe: 1 EVA |
| --- | ---: | ---: | ---: | ---: |
| Importer 1 | 5 EVA | 0.008 EVA | 0.04 EVA | 0.08 EVA |
| Substation 1 | 6 EVA | 0.0096 EVA | 0.048 EVA | 0.096 EVA |
| Private Workshop | 8 EVA | 0.0128 EVA | 0.064 EVA | 0.128 EVA |
| Importer 2 | 5 EVA | 0.008 EVA | 0.04 EVA | 0.08 EVA |
| Substation 2 | 6 EVA | 0.0096 EVA | 0.048 EVA | 0.096 EVA |
| Cooling Plant | 10 EVA | 0.016 EVA | 0.08 EVA | 0.16 EVA |

### Start Rewards

| Event | Raw value | Cheap: 0.1 EVA | Normal: 0.5 EVA | Deluxe: 1 EVA |
| --- | ---: | ---: | ---: | ---: |
| Pass Start | 2 EVA | 0.0032 EVA | 0.016 EVA | 0.032 EVA |
| Land exactly on Start | 3 EVA total | 0.0048 EVA total | 0.024 EVA total | 0.048 EVA total |

The free jackpot draw earned by passing or landing on Start is a count, not an
EVA amount, so it does not scale.

## Recurring Jackpot Rounds

The jackpot may be awarded more than once during a match. Each award closes
one jackpot round and later contributions can open a new round.

- Passing or landing exactly on Start triggers a jackpot raffle while the
  current jackpot round is open and funded.
- A losing raffle leaves the jackpot open for later eligible Start events.
- The first winning raffle transfers the entire current jackpot balance to the
  winner's spendable player balance and closes the current jackpot round.
- The jackpot balance becomes zero immediately after that transfer.
- Eligible later contributions accumulate toward a new jackpot round. The
  jackpot reopens immediately when its balance becomes positive. There is no
  minimum funding threshold beyond the smallest supported positive atomic-unit
  balance.
- Passing or landing on Start does not trigger a raffle while the jackpot
  balance is zero.
- Closing the jackpot does not change the separate Start EVA reward. That
  reward continues to follow the finite-bank exhaustion rule.
- Jackpot EVA is not removed from the match after it is awarded. Once credited
  to the winner, it behaves like any other player balance: it may be spent on
  purchases, paid to another player, or transferred under the approved
  bankruptcy rules.
- The authoritative match snapshot and gameplay event history must identify
  whether the jackpot is open or closed and, once won, identify the winner and
  awarded amount.

The client requested a visible jackpot animation on every eligible Start
crossing. The animation therefore runs for each funded raffle, including losing
raffles. It does not run while the jackpot balance is zero.

## Rent

Rent continues to use the raw percentage rules:

`invested value = scaled terrain price + scaled delivered development cost`

`base rent = invested value × level rent rate`

The level rates remain `50%`, `60%`, `70%`, `80%`, `90%`, and `100%`.
Complete-city and special-property multipliers also remain unchanged.

Example for an empty Caracas terrain:

| Tier | Terrain price | Level-0 rate | Rent |
| --- | ---: | ---: | ---: |
| Cheap | 0.0016 EVA | 50% | 0.0008 EVA |
| Normal | 0.008 EVA | 50% | 0.004 EVA |
| Deluxe | 0.016 EVA | 50% | 0.008 EVA |

## Other Monetary Values

The same multiplier should apply to monetary values added later, including:

- approved Luck and Destiny card amounts;
- fixed jackpot payouts, if the approved jackpot uses fixed amounts;
- fixed bank-reserve targets, if any;
- any fixed minimum or maximum mortgage values;
- fixed prize amounts, if prizes are not defined solely as percentages of a
  funded pool.

Amounts already defined as a percentage of a transaction or funded pool do not
need a second scaling step. Examples include Importer commission and the
proposed referral/burn/jackpot/bank-reserve distribution.

## Money Transferred to the Bank

Every gameplay payment whose recipient is the bank is distributed once using
the raw-rule percentages:

| Destination | Share | During the match |
| --- | ---: | --- |
| Referrals | 30% | Locked for the approved referral recipients |
| Burn | 10% | Removed from playable circulation |
| Jackpot | 10% | Added to the current jackpot balance and opens a new round if the balance was zero |
| Bank reserve | 50% | Retained temporarily to fund bank obligations |

This applies to every approved bank-directed gameplay transfer, including
property and development purchases and negative card charges. Any future rule
that sends money to the bank follows the same distribution unless it explicitly
defines another recipient.

The distribution runs exactly once on the gross bank-directed amount. The
amounts assigned to referrals, burn, jackpot, or bank reserve are destinations,
not new bank transfers, and are not recursively split again.

For example, a `0.04 EVA` bank-directed payment is distributed as:

- `0.012 EVA` referrals;
- `0.004 EVA` burn;
- `0.004 EVA` jackpot; and
- `0.02 EVA` bank reserve.

### Importer commission ordering

Importer commission is a player-to-player transfer and is deducted before the
remaining equipment payment reaches the bank:

1. The purchasing player pays the full scaled equipment price.
2. Each applicable Importer owner receives the commission granted by that
   property.
3. If one player owns both Importers, that player receives `20%` total.
4. The equipment price remaining after all Importer commission is the
   bank-directed amount.
5. Only that remainder is split into `30%` referrals, `10%` burn, `10%`
   jackpot, and `50%` bank reserve.

Importer commission is therefore not funded by the bank and is not deducted
from one of the four destination shares.

### Meaning of "the bank does not retain money"

The `50%` bank share is a temporary match reserve, not permanent bank revenue.
During play it funds positive card payouts, Start rewards, and any other
approved bank obligations. At game end, the entire remaining bank reserve
becomes the final-prize pool and is paid according to the approved final-ranking
percentages.

Therefore:

`final-prize pool = bank reserve remaining at game end`

The final prize is not a second ledger funded alongside the bank reserve. The
same EVA serves as the finite operating reserve during the match and becomes
the final prize only when gameplay ends. This preserves the raw specification's
principle that the bank does not keep money after the match.

Referral and burn allocations do not return to the bank reserve or final-prize
pool. The exact referral recipients and the external accounting meaning of
burn remain part of the broader economy signoff.

## Finite Bank and Reward Exhaustion

For internal review, this proposal uses one shared finite bank reserve rather
than dynamically changing card values or creating EVA during play.

Positive card rewards and Start rewards have fixed nominal values determined
by the room's gameplay scale. When one of those rewards resolves:

`actual payout = minimum of nominal reward and available bank reserve`

- If the bank can cover the reward, it pays the full nominal value.
- If the bank is positive but cannot cover the reward, it pays the remaining
  bank balance as a partial payout.
- If the bank is empty, the reward resolves with a zero payout.
- The bank balance never becomes negative and the game never creates EVA to
  satisfy a reward.
- The gameplay event and player-facing presentation must show the nominal
  reward and actual payout whenever they differ.

This exhaustion rule is necessary even if the sum of one positive-card deck is
less than the initial bank reserve. The positive deck rotates, players may pass
on all purchases, and players can cross Start repeatedly, so fixed rewards
otherwise create an unbounded liability.

The initial bank reserve is funded by the proposed `10%` contribution from
every admitted ticket. During play, every approved bank-directed transfer
replenishes it with the `50%` bank-reserve share defined above.

This section is the selected internal proposal and still requires client
approval as part of the card-economy and bank-reserve signoff.

## Numeric Representation

Exact proportional scaling requires at least `0.0001 EVA` precision for the
approved tiers, and base rent reaches `0.0008 EVA`. Calculations involving
percentage bonuses or purchase splits can require still smaller intermediate
values.

The implementation should not use binary floating-point values as the source
of truth and should not round monetary operations to tenths of an EVA. The
server should store authoritative balances and transaction amounts as integer
atomic units and apply one documented rounding rule only when division cannot
produce an exact atomic-unit result.

The EVA token uses 18 decimal places in the current payment contract. The game
protocol may either use those same atomic units or define a smaller fixed game
unit that exactly represents every approved price and calculation. Display
formatting should hide unnecessary trailing zeroes while retaining enough
precision to explain every balance change.

## Room and Server Contract

- The Rooms API remains authoritative for a paid room's ticket tier and amount.
- The game server converts that authoritative ticket amount into the player's
  starting balance, initial jackpot, initial bank reserve, and gameplay scale.
- Paid clients must not be allowed to supply a different starting balance.
- Every player in one match uses the same ticket, starting balance, price
  table, and monetary scale.
- Free-play rooms should select one of the same three economy tiers. The normal
  `0.5 EVA` tier should be the default unless a different product decision is
  recorded.
- Reconnecting players recover the existing match scale; they cannot change it
  by reconnecting with another tier.

## Migration and Compatibility

The current game server accepts only integer buy-ins from `1` through `1000`
EVA, paid rooms always start with the hard-coded `50 EVA` balance, and parts of
the economy round to tenths. Implementing this proposal requires a coordinated
migration of:

- room-tier-to-EVA mapping at the trusted paid-room boundary;
- fractional fixed-point room and match values;
- board and development price derivation;
- rent, rewards, commissions, transfers, and balance comparisons;
- protocol fields and Godot display formatting;
- fixtures and tests that currently assume the 50-EVA economy.

Existing saved or active matches must retain the economy under which they were
created. Because active matches are currently in memory, the simplest rollout
is to deploy the new economy with no old active matches or to version the
ruleset if old and new matches must coexist.

## Proposed Acceptance Criteria

- A `0.1`, `0.5`, or `1 EVA` paid ticket produces a player balance of `0.08`,
  `0.4`, or `0.8 EVA` respectively.
- Each admitted seat contributes `10%` of its ticket to the initial jackpot and
  `10%` to the initial bank reserve exactly once.
- The three tiers use `0.2×`, `1×`, and `2×` versions of one economy.
- Prices, rent, rewards, and balance transfers preserve the raw-rule
  proportions without floating-point drift.
- Positive cards and Start rewards debit the shared bank reserve, pay partially
  when necessary, and never make the reserve negative.
- A reward drawn with an empty bank resolves with a zero payout and clear
  player-facing feedback.
- Every bank-directed gameplay payment is split once into `30%` referrals,
  `10%` burn, `10%` jackpot, and `50%` bank reserve.
- At game end, the complete remaining bank reserve becomes the final-prize
  pool; the bank retains nothing.
- A winning raffle transfers the complete jackpot balance to the winner's
  spendable balance without creating or destroying EVA.
- Later eligible contributions reopen and fund a new jackpot round.
- The server rejects a paid-room ticket/starting-balance mismatch.
- Snapshots and gameplay events communicate exact monetary values.
- Godot shows small values clearly and consistently.
- Tests cover representative purchases, full development, rent, bonuses,
  Start rewards, commissions, bankruptcy transfers, and reconnects in all
  three tiers.

## Review Questions

1. Approve or revise the proposed `80%` player / `10%` jackpot / `10%` bank
   allocation.
2. Should the `0.5 EVA` tier be the default for both paid and free play?
3. Should every game-economy amount scale, as proposed, or should any reward or
   price remain fixed across tiers?
4. Confirm that positive cards and Start rewards use one shared bank reserve,
   including partial and zero payouts when it is exhausted.
5. Should the UI dynamically show the required precision rather than enforcing
   a fixed number of decimal places?
6. Should the protocol use 18-decimal token atomic units end to end, or a
   smaller integer game unit with an explicitly documented precision?
7. Is a clean rollout with no legacy active matches acceptable, or must a
   versioned ruleset support old 50-EVA matches?
8. Do the tier labels `Cheap`, `Average`, and `Deluxe` remain final player-facing
   names, or should the product use neutral names based on the ticket amount?

No gameplay behavior should change until this proposal is reviewed and the
remaining questions are resolved.
