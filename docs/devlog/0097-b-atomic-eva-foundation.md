# 0097-B - Micro-EVA Foundation

Status: accounting foundation, live-state boundary, server gameplay scaling,
and Godot micro-EVA integration complete; closed-economy rules remain separate.

## Goal

Establish an exact micro-EVA accounting representation for the scaled economy
before changing live match state, protocol messages, or Godot presentation.

## Result

- Defined `1 EVA` as `1,000,000` integer micro-EVA for the match ledger.
- Added strict decimal-to-micro parsing and micro-to-decimal formatting.
- Kept ledger values as safe integer JavaScript `number` values so JSON and
  Godot can exchange them without string arithmetic or precision loss.
- Added an exact payment-boundary conversion from the token's 18-decimal atomic
  strings to micro-EVA. `bigint` is used only inside that conversion.
- Rejected token amounts with sub-micro precision instead of rounding them.
- Added exact ratio arithmetic that throws instead of silently rounding when a
  result cannot be represented in whole micro-EVA.
- Added authoritative profiles for the approved `cheap`, `average`, and
  `deluxe` ticket tiers.
- Encoded the proposed `80%` player / `10%` jackpot / `10%` bank allocation.
- Added exact scaling from raw 50-EVA rule values to each tier.
- Added initial match jackpot and bank-reserve accumulation by player count.

Representative exact results:

| Tier | Ticket | Player | Jackpot per seat | Bank per seat | Raw 1-EVA value scales to |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cheap | 0.1 | 0.08 | 0.01 | 0.01 | 0.0016 |
| Average | 0.5 | 0.4 | 0.05 | 0.05 | 0.008 |
| Deluxe | 1 | 0.8 | 0.1 | 0.1 | 0.016 |

## Boundary

The first part did not alter gameplay. The authorized second part wired the
foundation into the paid-room and live-state boundary:

- Paid-room token amounts convert exactly from 18-decimal token units to
  micro-EVA.
- The trusted Rooms API tier and amount must match before match creation.
- Definitions publish the tier, ticket, player allocation, and initial jackpot
  and bank allocations as integer micro-EVA.
- Snapshots publish current jackpot, bank, and player balances as integer
  micro-EVA.
- Paid player slots start with the tier's `80%` allocation.
- Legacy free-play matches receive mirrored micro-EVA balances without changing
  their existing starting balance behavior.
- Player credits, debits, transfers, refunds, and elimination keep the exact
  micro-EVA balance authoritative and derive the temporary legacy decimal field
  from it.

The current match core pre-creates every configured player slot. Initial
jackpot and bank totals are therefore calculated for the full room when the
first admitted player creates the match. Gameplay cannot activate until all
configured seats join and pass paid admission, so the totals are fully backed
before gameplay starts. The current pre-game snapshot shows those eventual
full-room totals rather than incremental per-seat funding.

The authorized third part now applies the same profile scale throughout the
server gameplay rules:

- Board purchase prices, development prices, and rent tables are constructed
  as exact micro-EVA integers for the room profile.
- Special-property prices, card effects, and Start-crossing rewards use the
  same scale.
- Affordability decisions, payments, rent, importer commissions, refunds,
  development delivery, and bankruptcy transfers use micro-EVA values.
- Monetary definitions, pending state, and events publish explicit `*_micro`
  fields. Existing decimal `*_eva` fields are derived compatibility/display
  values for the current Godot client.
- Card copy substitutes the scaled EVA amount, so paid rooms do not describe
  the raw 50-EVA rules value to players.
- A command-flow test proves an average-tier player starts with `400,000`
  micro-EVA and pays the scaled `16,000` micro-EVA price for a raw 2-EVA
  Asunción terrain.

The authorized fourth part migrates the Godot client boundary:

- Player balances, property and development prices, rent tables, pending rent,
  card effects, and monetary events are read as integer micro-EVA.
- Affordability checks and client-side rent previews compare and calculate with
  integers. Rent bonuses use exact tenths ratios matching the server formula.
- A shared formatter converts micro-EVA to human-facing EVA only at UI output,
  retaining up to six decimal places. Values such as `16,000` micro-EVA now
  render as `0.016 EVA` rather than being rounded to one decimal place.
- Rent-table rows use the widest significant fractional precision present in
  that table and pad shorter values with trailing zeroes, aligning decimal
  amounts for quick visual comparison without padding unrelated UI values.
- Terrain and special-property board faces receive their scaled prices from the
  server definition instead of displaying the old static raw-rule prices.
- Special-property faces are discovered across every visual tile and addressed
  by stable property ID rather than by the pawn-path tile index. This matters
  for Importer 1, whose visual face lives on an auxiliary scene tile and was
  previously left showing its static `5 EVA` value even while the decision
  panel correctly showed the scaled `0.04 EVA` price.
- The large regional flag/slice labels also receive the first terrain price for
  their city group from the server definition, keeping them aligned with the
  scaled individual property faces.
- Godot fixtures use the same explicit micro-EVA contract as production. The
  client has no decimal-field compatibility shim, so stale monetary messages
  cannot silently pass as current protocol data.
- Added the shared `eva_money.gd` resource to the Web export allowlist. Without
  that explicit entry, native/editor checks could resolve its global class but
  the exported PCK omitted it and browser builds failed to parse dependents.
- Godot coverage includes a micro-only paid-room snapshot proving that a
  `400,000` balance and `16,000` property price render as `0.4 EVA` and
  `0.016 EVA`, and that Importer 1's board face renders its `40,000` micro-EVA
  price as `0.04 EVA`.

This slice intentionally does not implement the later closed-economy behavior:
bank-funded positive cards and Start rewards, the payment waterfall into
referrals/burn/jackpot/bank, jackpot raffles, or final-prize settlement. Godot
and server now share micro-EVA as the gameplay accounting boundary.

## Protocol Direction Before Integration

Micro-EVA values fit safely in JSON integer numbers for all plausible match
balances. The proposed authoritative wire representation is:

```json
{
  "eva_balance_micro": 400000
}
```

Godot can retain this value as a 64-bit `int` for comparisons and derive
`"0.4"` only for presentation. Human-facing EVA decimals should not be
accounting input.

The integration also needs a migration policy for existing protocol fields
such as `eva_balance`, `price_eva`, and `rent_eva`: replace them atomically in
one coordinated change, or temporarily publish both old display numbers and
new authoritative micro-EVA integers.

## Verification

`npm run test:all` in `apps/game-server`: **111 passed, 0 failed** across the
full unit and WebSocket transport suite.

`just godot-test`: **passed** for configuration and card/portfolio/server-client
presentation coverage. The headless server-client scene smoke check also
completed successfully.

Coverage added for:

- exact micro-EVA parsing and formatting;
- negative values and the smallest game-ledger unit;
- exact conversion of all three approved 18-decimal token ticket amounts;
- rejection of ambiguous, sub-micro, or unrepresentable values;
- rejection of inexact ratio arithmetic;
- all three ticket allocations;
- raw-rule price scaling; and
- two-to-four-player jackpot and bank totals;
- scaled paid-room board, development, rent, special-property, and card
  definitions; and
- an authoritative paid-room terrain purchase through the live command flow.
