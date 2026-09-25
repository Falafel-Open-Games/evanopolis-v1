# Evanopolis V1 Rulebook

Status: **draft for client review and rules signoff**  
Language: English  
Ruleset: `evanopolis_v1`
Implementation audit: **2026-09-25**  

This manual describes the playable V1 rules in player-facing language. It also
identifies decisions that still require client approval. A decision block is
part of the rules signoff agenda and must be resolved, or explicitly deferred,
before this document can become the final rulebook.

## 1. Game Overview

Evanopolis is a turn-based economic board game about building Bitcoin mining
operations. Players move around a 36-space board, buy terrain and special
properties, develop mining infrastructure, collect rent, and manage EVA.

The server controls dice, card order, balances, ownership, rent, development,
and turn order. Players choose among the actions offered on their turn.

### Objective

Remain solvent and outlast the other players. The match ends when only one
active player remains, and that player wins. Final positions are determined in
reverse bankruptcy order: the last eliminated player finishes second, the
previous eliminated player finishes third, and so on. The top three positions
receive shares of the final prize pool.

> **Decision required — prize distribution**
>
> Agree how the final prize pool is divided among first, second, and third, and
> how unused positions are handled in a two-player match.

## 2. Game Concepts and Components

- **EVA:** the unit used for balances, purchases, development, cards, and rent.
- **Player pawn:** shows a player's position on the board.
- **Terrain:** a purchasable mining site belonging to one of six cities.
- **Development:** one hydro container followed by up to four machine lots.
- **Machine lot:** 50 mining machines. Four lots represent 200 machines.
- **Special property:** a purchasable property that changes rent or equipment
  commissions.
- **Luck and Destiny:** separate rotating decks of positive and negative
  economic events.
- **Bank:** the game economy that sells properties and equipment and settles
  card rewards or charges.
- **Final prize pool:** a match fund shared by the top three finishers. Its
  two-player distribution still requires approval.
- **Jackpot:** a match-funded prize with a draw when a player passes or lands
  on Start. Its detailed rules are still awaiting approval.

## 3. Setup

1. Create a room for two, three, or four players with its buy-in.
2. Each admitted account occupies one seat. One wallet may occupy only one seat
   in the same room.
3. Player-facing rooms use one of three ticket tiers: Cheap (`0.1 EVA`),
   Average (`0.5 EVA`), or Deluxe (`1 EVA`). Free play currently uses the
   Average economy profile without charging a ticket.
4. Each paid ticket is allocated as `80%` spendable player balance, `10%`
   initial jackpot contribution, and `10%` initial bank reserve. The
   corresponding starting player balances are `0.08`, `0.4`, and `0.8 EVA`.
   Free play mirrors the Average profile balances for testing without moving
   tokens.
5. All terrain, special properties, containers, and machine lots begin under
   bank control.
6. All pawns begin at Start.
7. The server establishes the player order, dice sequence, and initial order of
   both card decks.

The server keeps all authoritative gameplay money as integer micro-EVA, where
`1 EVA = 1,000,000 micro-EVA`. Terrain and special-property prices,
development costs, rent, card values, and Start rewards scale from the selected
tier's spendable balance. The raw `50 EVA` values printed in this manual are
reference values; the player UI displays the scaled values for the room.

> **Decision required — buy-in scaling**
>
> Ratify or revise the implemented scaling of prices, rent, development, card
> values, and Start rewards from the room economy profile. Jackpot payout and
> final-prize settlement remain separate unresolved rules.
>
> The internal [buy-in scaling proposal](buy-in-scaling-proposal.md) adapts the
> raw proportions to the approved `0.1`, `0.5`, and `1 EVA` ticket tiers. It
> defines the implemented `80%` player / `10%` jackpot / `10%` bank allocation,
> fixed-point scaled gameplay values, finite-bank rewards, and bank-payment
> distribution. Those behaviors are live for testing but still require formal
> rules signoff. Recurring jackpot rounds and final-prize settlement are not
> implemented.

> **Decision required — admission payment**
>
> The current V1 path uses blockchain ticket payment and server-verified wallet
> admission. Decide separately whether client prepaid credits must also be
> supported. This does not change the board rules.

## 4. The Board

The board has 36 spaces in clockwise order: 24 terrain spaces, six special
properties, Start, two Luck spaces, two Destiny spaces, and Jail. Prices below
are raw reference values and are scaled for the selected room tier.

| Index | Space | Type | Price |
| ---: | --- | --- | ---: |
| 0 | Start | Start | — |
| 1–2 | Caracas terrain 1–2 | Terrain | 1 EVA each |
| 3 | Importer 1 | Special property | 5 EVA |
| 4–5 | Caracas terrain 3–4 | Terrain | 1 EVA each |
| 6 | Luck | Card | — |
| 7–8 | Asuncion terrain 1–2 | Terrain | 2 EVA each |
| 9 | Substation 1 | Special property | 6 EVA |
| 10–11 | Asuncion terrain 3–4 | Terrain | 2 EVA each |
| 12 | Destiny | Card | — |
| 13–14 | Ciudad del Este terrain 1–2 | Terrain | 2 EVA each |
| 15 | Private Workshop | Special property | 8 EVA |
| 16–17 | Ciudad del Este terrain 3–4 | Terrain | 2 EVA each |
| 18 | Jail | Jail | — |
| 19–20 | Minsk terrain 1–2 | Terrain | 3 EVA each |
| 21 | Importer 2 | Special property | 5 EVA |
| 22–23 | Minsk terrain 3–4 | Terrain | 3 EVA each |
| 24 | Luck | Card | — |
| 25–26 | Siberia terrain 1–2 | Terrain | 3 EVA each |
| 27 | Substation 2 | Special property | 6 EVA |
| 28–29 | Siberia terrain 3–4 | Terrain | 3 EVA each |
| 30 | Destiny | Card | — |
| 31–32 | Texas terrain 1–2 | Terrain | 4 EVA each |
| 33 | Cooling Plant | Special property | 10 EVA |
| 34–35 | Texas terrain 3–4 | Terrain | 4 EVA each |

## 5. Turn Sequence

At the beginning of a normal turn, any development ordered by that player is
delivered first. The player then completes these steps:

1. Order development for any eligible terrain, if desired.
2. Roll two dice.
3. Move clockwise by the total rolled.
4. Receive the Start reward if the move passes or lands on Start.
5. Resolve the space where the pawn lands.
6. Complete every mandatory action, such as paying rent or resolving a card.
7. Optionally buy an available terrain or special property on that space.
8. End the turn. The next active player then begins.

Development can also be ordered during another player's turn. An active player
may order before rolling, but cannot order during their own post-roll
resolution. The current game has no special rule for doubles and no extra turn
for rolling doubles.

> **Decision required — turn timer**
>
> Set the duration, warning behavior, and automatic result when time expires at
> each decision: roll, purchase or pass, card acknowledgement, rent/game-over
> acknowledgement, development ordering, and end turn.

## 6. Resolving Board Spaces

### Unowned terrain

If the active player can afford the terrain, they may buy it for its printed
price or pass. Buying transfers the terrain to that player immediately.

### Your own terrain

No rent is due. The turn may end after the landing resolves.

### Another player's terrain

The active player must pay the displayed rent to the owner. The owner receives
100% of the rent. The turn cannot end until the rent or resulting game-over
action is resolved.

### Unowned special property

If the active player can afford it, they may buy it for its printed price or
pass. Its effect begins immediately under the current V1 implementation.

### Owned special property

No landing payment is due. Special properties affect the economy through their
described passive effects.

### Luck or Destiny

Draw the next card from the matching deck, acknowledge it, and apply its EVA
change. The resolved card moves to the bottom of its deck.

### Jail

The player is marked as jailed. See section 11.

### Start

Apply the Start reward described in section 12.

## 7. Terrain Development

Each terrain has six states. Costs below are raw reference values and are
scaled for the selected room tier:

| Level | Infrastructure | Machine count | Order cost | Base rent rate |
| ---: | --- | ---: | ---: | ---: |
| 0 | Empty terrain | 0 | — | 50% |
| 1 | Hydro container | 0 | 2 EVA | 60% |
| 2 | Container + 1 machine lot | 50 | 1 EVA | 70% |
| 3 | Container + 2 machine lots | 100 | 1 EVA | 80% |
| 4 | Container + 3 machine lots | 150 | 1 EVA | 90% |
| 5 | Container + 4 machine lots | 200 | 1 EVA | 100% |

Development rules:

- A player may develop only terrain they own.
- Development proceeds one level per order. The container must come first;
  machine lots follow in order.
- The order is paid for immediately.
- It is delivered automatically at the beginning of that player's next turn.
- Multiple valid orders may arrive together at that turn start.
- If the player no longer owns the terrain at delivery, the order is cancelled
  and its price is refunded.
- Importer ownership does not gate development purchases in V1.

## 8. Rent

For each terrain:

`invested value = terrain price + delivered container cost + delivered machine-lot costs`

`base rent = invested value × the current level's base rent rate`

Examples before bonuses:

- Fully developed Caracas: `(1 + 2 + 4) × 100% = 7 EVA`.
- Fully developed Texas: `(4 + 2 + 4) × 100% = 10 EVA`.

Rent is calculated in exact integer micro-EVA. The UI displays up to six
decimal places as needed and hides unnecessary trailing zeroes. Ordered
infrastructure does not affect rent until it is delivered.

### Complete city bonus

If one player owns all four terrain spaces in a city and all four are level 5,
the rent of those terrain spaces is doubled. Owning all four without fully
developing them currently gives no rent bonus.

### Special-property rent bonus

The current V1 implementation adds the owner's applicable special-property
bonus and applies that multiplier and the complete-city multiplier to base
rent using exact micro-EVA arithmetic.

## 9. Special Properties

The client accepted the V1 model in which these effects are global to the
owner's holdings rather than tied to the special property's board location.

| Property | Raw reference price | V1 effect |
| --- | ---: | --- |
| Importer 1 | 5 EVA | Its owner receives 10% of every equipment purchase. |
| Importer 2 | 5 EVA | Its owner receives 10% of every equipment purchase. |
| Both Importers | — | If one player owns both, that player receives 20% total rather than two separate 10% payments. |
| Substation 1 | 6 EVA | Terrain owned by its owner receives +10% rent. |
| Substation 2 | 6 EVA | Terrain owned by its owner receives +10% rent. |
| Both Substations | — | If one player owns both, that player's total substation rent bonus becomes +30%. |
| Private Workshop | 8 EVA | Terrain owned by its owner receives +10% rent. |
| Cooling Plant | 10 EVA | Terrain owned by its owner receives +10% rent. |

Equipment commission is credited when a development order is paid.

> **Decision required — purchase accounting**
>
> The implementation pays Importer commission first, then sends the remaining
> bank-directed amount through the distribution in section 13. Ratify that
> ordering and decide who receives the referral allocation when no referral
> relationship exists.

## 10. Luck and Destiny Cards

Luck contains 17 positive events and Destiny contains 17 negative events. The
texts come from the client-supplied card list and are translated into English,
Spanish, and Brazilian Portuguese.

Current V1 behavior:

- Each deck is separate and its order is determined by the match seed.
- A drawn card moves to the bottom of its deck, so decks rotate.
- Cards resolve immediately after the player acknowledges the card panel.
- All current effects add or subtract EVA.
- Current raw card amounts are provisional values from 1 to 3 EVA and scale
  with the room economy profile.
- Cards are never held in a player's hand.
- There are no movement, property, jail-release, or player-to-player cards.

If a player cannot pay a negative card in full, the player accepts game over.
Their remaining EVA is removed from play. Their properties currently remain
assigned to the eliminated player because a bank-creditor transfer rule has not
been approved.

> **Decision required — card economy**
>
> Approve every card value and ratify the implemented finite-bank rule. Positive
> cards pay `min(nominal reward, available bank reserve)`, so they may pay fully,
> partially, or zero without making the reserve negative. Bank-directed
> payments replenish the reserve as described in section 13.

> **Decision required — unaffordable card transfer**
>
> Confirm what happens to the eliminated player's remaining balance,
> properties, and pending development orders when a bank card charge cannot be
> paid. The current behavior leaves properties assigned to the eliminated
> player and has no creditor.

## 11. Jail

Current V1 behavior:

1. Landing on Jail marks the player as jailed.
2. The landing turn ends normally after Jail is resolved.
3. On that player's next turn, they cannot roll.
4. They serve the sentence, are released, and the turn advances.

There is no fine, doubles-based release, jail-release card, or additional
movement into Jail in the current rules.

> **Decision required — approve Jail**
>
> Confirm this one-skipped-turn behavior as final or provide the replacement
> rules, including every way to enter and leave Jail.

## 12. Start and Jackpot

Passing Start nominally awards 2 raw EVA. Landing exactly on Start nominally
awards 3 raw EVA total. These values scale with the room economy profile and
are paid from the finite bank reserve. If the reserve is insufficient, the
player receives the remaining reserve; if it is empty, the EVA payout is zero.

Each pass or exact landing also earns one jackpot draw. The client has agreed
that the jackpot prize comes from the match buy-ins and that the draw occurs
inside the game with a roulette or comparable visual presentation.

The playable build records the earned draw but does not yet run or pay a
jackpot.

> **Decision required — jackpot**
>
> Define the buy-in amount reserved for the jackpot, prize values or payout
> table, odds, whether every draw pays, whether the jackpot changes after a win,
> what happens to unused jackpot funds, and how jackpot funds remain separate
> from the card reserve and final prize pool.

## 13. Purchases and Bank Distribution

The playable build distributes each successful bank-directed gameplay payment
as follows:

- 10% to the jackpot.
- 30% to referrals.
- 10% to burn.
- 50% to the finite bank reserve.

Terrain and special-property purchases use the split. Successful negative-card
payments also use it. Development pays any Importer commission first, and only
the remainder uses the split. Rent is a direct player-to-player transfer and
does not use it.

The referral and burn shares are currently authoritative in-match ledgers.
Concrete referral recipients and external token burning are not yet executed.
The bank reserve funds positive-card and Start rewards and is intended to
become the final-prize pool at game end, but that settlement is not implemented.

> **Decision required — bank ledgers**
>
> Ratify the implemented transaction set, exact micro-EVA split, and
> Importer-first ordering. Define referral recipients, external burn execution,
> and final settlement of the remaining bank reserve.

## 14. Bankruptcy and Elimination

### Unaffordable rent

If a player cannot pay mandatory rent in full:

1. The player accepts game over.
2. Their remaining EVA, owned terrain, and owned special properties transfer to
   the terrain owner who is owed the rent.
3. The unpaid rent itself is not partially paid as a separate step.
4. The eliminated player is skipped in all future turns.
5. Play advances to the next active player.

The current playable build has no mortgages, forced sales, loans, or voluntary
liquidation.

> **Decision required — mortgage rule**
>
> Define whether mortgages are part of V1. If they are, specify which assets
> qualify, mortgage value, when a player may mortgage or repay, repayment cost,
> whether mortgaged terrain collects rent or receives development, whether it
> can be transferred, and how a mortgage resolves at bankruptcy or match end.

> **Decision required — transferred development**
>
> Confirm whether transferred terrain keeps its delivered development and what
> happens to development orders awaiting delivery.

### Unaffordable card charge

An unaffordable negative card also eliminates its player, but the bank is the
creditor. See the unresolved transfer decision in section 10.

## 15. Game End

The match ends immediately when a bankruptcy leaves only one active player.
That player finishes first and is declared the winner. No more gameplay actions
are available.

The ranking is assigned in reverse bankruptcy order. In a four-player match:

1. The first eliminated player finishes fourth.
2. The second eliminated player finishes third.
3. The last eliminated player finishes second.
4. The remaining active player finishes first.

The top three receive shares of the final prize pool. The payout percentages
and treatment of an unused third-place share in a two-player match remain
undefined; see the prize-distribution decision in section 1.

## 16. Current Operational Limitations

- The turn timer is not implemented.
- Jackpot draws and payouts are not implemented.
- Referral assignment, external burn execution, persisted second/third-place
  ranking, and final-prize payouts are not implemented.
- Unaffordable negative-card settlement still lacks an approved creditor and
  asset-transfer rule.
- Active matches currently live in server memory. A server restart can make an
  active match unavailable unless persistence or recovery is added.

These limitations are delivery-scope items and do not silently define final
game rules.

## 17. Rules Signoff Checklist

This checklist supplies the evidence for item 1, **Agree the V1 Rules and
Scope**, in the [delivery completion checklist](../delivery/completion-checklist.md).

- [x] Approve last-player-standing as the objective and reverse bankruptcy
  order as the final ranking.
- [ ] Approve top-three prize percentages and two-player distribution.
- [ ] Ratify the implemented buy-in scaling and decide whether prepaid-credit
      admission is also required.
- [ ] Approve the turn timer and timeout outcomes.
- [ ] Approve all card values, ratify finite-bank rewards, and define
      unaffordable-card transfer.
- [ ] Approve Jail behavior.
- [ ] Approve jackpot funding, draw, payout, and leftover-fund behavior.
- [ ] Ratify purchase allocation, exact splitting, and commission ordering;
      define referral recipients and external burn execution.
- [ ] Approve bankruptcy transfers, including delivered and pending
  development.
- [ ] Approve the mortgage rule or explicitly defer mortgages beyond V1.
- [ ] Mark every remaining requested feature as V1 or deferred.
- [ ] Record the approved rulebook revision and meeting date.

When all boxes are checked, this document can be relabeled from draft to the
approved Evanopolis V1 rulebook and used during the full-match acceptance
session.
