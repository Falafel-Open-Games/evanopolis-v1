# 0096-B - Buy-in Scaling Proposal

Status: completed documentation slice; gameplay implementation deferred until
rules review.

## Goal

Translate the client-approved `0.1`, `0.5`, and `1 EVA` room tickets into a
finite match-economy proposal while preserving the relative values in the raw
50-EVA rules.

## Result

- Added a reviewable buy-in scaling proposal under `docs/rules/`.
- Proposed dividing each ticket into `80%` player starting balance, `10%`
  initial jackpot, and `10%` initial bank reserve.
- Scaled terrain, development, special-property prices, rent, and Start rewards
  from the spendable player allocation.
- Documented the fixed-point precision required by the smaller economy.
- Defined a finite shared bank: fixed positive-card and Start rewards pay in
  full, partially, or zero according to the available reserve.
- Defined recurring jackpot rounds. A winning raffle transfers the full pool
  to the winner; any later positive contribution immediately opens a new round.
- Defined the bank-payment waterfall as `30%` referrals, `10%` burn, `10%`
  jackpot, and `50%` bank reserve.
- Defined Importer commission as a player-to-player transfer deducted before
  the remaining equipment payment enters the bank waterfall.
- Defined the remaining bank reserve as the final-prize pool at game end, so
  the bank retains no EVA after final payouts.

## Deferred Decisions

- Client approval or revision of the proposed `80/10/10` ticket allocation.
- Whether the normal `0.5 EVA` tier is also the free-play default.
- Final confirmation of which monetary values scale.
- Protocol fixed-point representation and UI precision policy.
- Final-prize ranking percentages and referral/burn accounting details.
- Whether legacy 50-EVA matches need compatibility support.

The current positive-only Luck and negative-only Destiny deck assignment was
confirmed as an implementation mismatch with the intended mixed decks, but it
was explicitly deferred from this slice.

## Verification

Documentation and arithmetic were reviewed against:

- `docs/spec/raw_game_rules_spec_draft.txt`
- `docs/spec/raw_card_texts_client_chat.md`
- `docs/rules/evanopolis-v1-rulebook.md`
- the current room ticket tiers and game-server economy constraints

No runtime behavior changed, so runtime tests were not required.
