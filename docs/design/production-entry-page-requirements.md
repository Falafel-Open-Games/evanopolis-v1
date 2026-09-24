# Evanopolis Production Entry Pages — Design Requirements

Date: 2026-09-22
Audience: João and the client design team

## Goal

Design two focused, mobile-first entry experiences: one for creating a game and
one for accepting an invitation. Players should see only the information and
next action needed to enter the match. Service URLs, chain identifiers, JWTs,
transaction hashes, and developer navigation are not part of the normal flow.

## Shared Requirements

- Treat the checked-in page as a neutral wireframe template rather than final
  visual design. It should use a monochrome palette, plain borders, and marked
  logo and marketing-copy placeholders so the client design team can apply its
  own brand system without first removing an Evanopolis theme.
- Use a single-column layout on smartphones and a calm, centered layout on
  larger screens.
- Keep one visually dominant action per step.
- Explain wallet requests before opening the wallet.
- Preserve the room context while the wallet is open or a transaction confirms.
- Show progress through **Connect**, **Room**, **Pay**, and **Play**.
- Use plain player-facing language. Avoid API, JWT, RPC, payload, admission,
  allowance, and transaction-proof terminology in the primary interface.
- Provide accessible labels, visible focus states, touch targets of at least
  44px, and status text that does not depend on color alone.
- Keep technical configuration and payment recovery in a secondary support or
  advanced area.

## Create a Game

### Information supplied by the host

1. **Display name** — 1–32 characters; shown to invited players as the host.
2. **Number of players** — 2, 3, or 4 seats in total, including the host.
3. **Ticket option** — currently maps to Cheap, Average, or Deluxe and displays
   its exact EVA price before confirmation.
4. **Wallet account** — selected through the wallet; never typed into a field.

### Flow

1. Introduce room creation and connect the wallet.
2. Ask the host to sign the login message. Signing does not spend EVA.
3. Collect display name, player count, and ticket option.
4. Show a final room summary and create the room.
5. Present a shareable invitation link with an obvious copy/share action.
6. Check whether this wallet already owns the host seat.
7. If unpaid, guide the host through EVA approval when required and ticket
   payment. Explain that these can be separate wallet confirmations.
8. When verified, present **Enter game** as the dominant action.

## Accept an Invitation

### Information supplied by the invited player

The player does not type room configuration. The invitation supplies the room
identifier, and the room service supplies:

- host display name;
- player count;
- ticket option and exact EVA price; and
- room creation date when support context is needed.

The player only chooses a wallet account and approves wallet requests.

### Flow

1. Load and show the room summary before asking for payment.
2. Connect the wallet and request a login signature.
3. Check immediately whether that wallet already has a seat.
4. If it has a seat, skip all payment actions and show **Enter game**.
5. If it does not, show the exact ticket price and one primary payment action.
6. If token allowance is insufficient, explain and request approval first.
7. Request ticket payment, verify it automatically, then show **Enter game**.
8. Never offer a second payment to a wallet that already owns a seat.

## Exceptional Paths

- Wrong network: explain the required network and ask the wallet to switch.
- Insufficient EVA: state the balance problem without offering a transaction
  that cannot succeed.
- Rejected signature or transaction: keep the current step and allow retry.
- Expired login: request a fresh signature without requesting another payment.
- Previously submitted payment: verify or recover it before offering payment.
- Room unavailable or full: show a terminal explanation and no payment action.
- Different wallet after payment: explain that seats belong to the wallet that
  paid.

## Product Decisions Needed From Fabricio and the Client

- Final product name, logo, background art, and brand tokens.
- Player-facing names and descriptions for the three ticket options.
- Whether to show an estimated fiat value beside EVA.
- Final network name and wallet-support wording.
- Whether invitation sharing needs copy, native mobile share, QR code, or all
  three.
- Support contact and destination for payment-recovery help.
- Final client hostname under `evervaluecoin.com`.
