# 0099-B - Bank Payment Waterfall

Status: accepted bank-directed gameplay payments now fund referrals, burn,
jackpot, and the finite bank reserve; insolvency settlement remains separate.

## Goal

Route EVA paid to the bank exactly once through the approved closed-economy
distribution:

- `30%` locked for referrals;
- `10%` burned;
- `10%` added to the jackpot; and
- `50%` added to the finite bank reserve.

## Result

- Added authoritative referral and cumulative burn balances in micro-EVA.
- Terrain and special-property purchases distribute their complete price.
- Successful negative-card charges distribute their complete payment.
- Development orders pay Importer commissions to their owners first. Only the
  remaining bank-directed amount enters the waterfall.
- One Importer owner receives `10%`; one player owning both receives `20%`.
- Rent remains a direct player-to-player transfer and does not enter the
  waterfall.
- Every distribution emits `bank_payment_distributed` with its source, gross
  amount, four allocations, and resulting authoritative pool balances.
- Snapshots expose `referral_balance_micro` and `burned_eva_micro` alongside
  the existing jackpot and bank-reserve balances, including after reconnect.

The jackpot round is considered funded whenever its balance is positive, but
raffle odds, award animation, winner transfer, closing, and reopening behavior
remain in the dedicated jackpot slice.

## Exactness

The distribution accepts only non-negative safe integer micro-EVA amounts that
can be divided exactly by the approved tenths. It rejects inexact inputs rather
than rounding or silently losing a micro-EVA. The four destinations always sum
to the gross bank-directed payment.

## Boundary

This slice distributes successful payments. It intentionally does not decide
what happens to a player's residual balance when a negative card eliminates
them because that insolvency settlement rule has not been approved. Rent
bankruptcy continues transferring assets and remaining balance to the player
creditor under its existing rule.

## Verification

- `npm run test:all` in `apps/game-server`: **121 passed, 0 failed**.
- `just godot-test`: **passed** for configuration and the complete
  card/portfolio/server-client presentation suite.

Coverage includes exact split arithmetic and rejection, terrain and special
property purchases, negative cards, development without an Importer, one
Importer commission, both Importers owned by one player, scaled paid economy
balances, snapshot fields, and WebSocket transport.

Manual scaled-free-play validation confirmed a live `8,000` micro-EVA terrain
purchase: the player balance fell from `400,000` to `392,000`; referrals gained
`2,400`; burn gained `800`; jackpot rose from `100,000` to `100,800`; and the
bank reserve rose from `100,000` to `104,000`. The emitted
`bank_payment_distributed` event matched the revision-4 snapshot exactly, and
the four destinations summed back to the gross payment.

Continued manual play also validated reserve consumption by additional Luck
rewards and reserve replenishment by development payments. Special-property
rent bonuses remained player-to-player rent modifiers and did not alter the
four bank-directed pools.

The live session also validated Importer ordering. Player 2 bought Importer 2
for `40,000` micro-EVA, producing the expected `12,000 / 4,000 / 4,000 /
20,000` split. Player 1 then ordered a `16,000` micro-EVA container: Player 2
received the `1,600` commission first, and only the `14,400` remainder entered
the waterfall as `4,320` referrals, `1,440` burn, `1,440` jackpot, and `7,200`
bank reserve. Player balances and all four pool deltas matched those events.

## Deferred

- Selecting and paying concrete referral recipients.
- External token burn execution; this slice tracks the amount removed from
  playable circulation.
- Insolvent negative-card residual-balance settlement.
- Jackpot raffle lifecycle and presentation.
- Final-prize settlement from the remaining bank reserve.
