# 0098-B - Finite Bank Rewards

Status: paid-room Start and positive-card rewards are funded by the shared bank
reserve; payment inflows and jackpot behavior remain separate slices.

## Goal

Prevent paid matches from creating EVA when Start crossings or positive cards
award more than the match bank can fund.

## Result

- Added one exact integer payout rule for paid economy tiers:
  `actual payout = min(nominal reward, available bank reserve)`.
- Full payouts debit the reserve by the nominal reward.
- A positive but insufficient reserve pays its complete remaining balance.
- An empty reserve pays zero. It never becomes negative.
- Start crossings still emit their gameplay event and retain the existing
  jackpot-roll metadata when the EVA reward is partial or zero. The jackpot
  raffle itself remains deferred.
- Positive card resolution applies the same reserve rule. Negative cards remain
  player-to-bank charges and will feed the later payment-waterfall slice.
- Snapshots continue to publish the authoritative remaining
  `bank_reserve_micro`, including after exhaustion and reconnect hydration.

Legacy free play has no funded economy tier or initial bank allocation. It
therefore preserves its existing reward behavior for compatibility rather than
silently changing all free matches to zero-reward games. Finite-bank behavior
activates when a paid room selects an approved economy tier.

## Event Contract

Reward events publish:

- `nominal_amount_micro`: the scaled reward defined by the rules;
- `amount_micro`: the amount actually credited to the player; and
- `bank_reserve_after_micro`: the reserve remaining after payment.

For full payouts, nominal and actual amounts match. Publishing both makes
partial and zero outcomes explicit without requiring clients to infer them from
snapshots.

## Player Feedback

- Full rewards keep the existing compact copy.
- Partial Start and card rewards show both the amount paid and the nominal
  reward, explaining that the reserve emptied.
- Zero payouts explicitly say that the bank reserve was empty.
- Local resolved-card panels, observer toasts, and replay history share the
  same nominal-versus-actual result.

## Verification

- `npm run test:all` in `apps/game-server`: **119 passed, 0 failed**.
- `just godot-test`: **passed** for configuration and the complete
  card/portfolio/server-client presentation suite.

Coverage includes full, partial, zero, and invalid reserve payouts; paid Start
crossings; paid positive-card resolution; authoritative player and reserve
balances; snapshot hydration; and partial/zero Godot presentation.

Manual two-player scaled-free-play validation confirmed the live WebSocket and
presentation path: the initial `100,000` micro-EVA reserve fell to `84,000`
after a normal Start crossing; an exact Start landing reduced `36,000` to
`12,000`; the next exact landing paid the remaining `12,000` of its nominal
`24,000` reward and emptied the reserve; later Start and positive-card rewards
paid zero with the expected empty-bank feedback.

## Deferred

- Splitting bank-directed payments into referrals, burn, jackpot, and reserve.
- Importer-commission ordering within that payment waterfall.
- Jackpot raffle odds, award, closing, and reopening.
- Final-prize settlement from the remaining bank reserve.
