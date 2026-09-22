# September 22 Client Meeting

## What we had

- Paid room admission binds one wallet to one seat.
- Returning players can reconnect by signing again after an expired session.
- The invitation page recognizes a wallet that already paid for the room and
  avoids offering a second payment.
- Paid multiplayer works with separate browsers and wallets through the local
  tunnels.
- Refresh restores the correct player camera.
- Pending card panels are visible to spectators and disappear after the card
  is resolved.
- Compact controls replay recent gameplay notifications.
- Special property purchases and development arrivals appear in the event
  history, including grouped delivery summaries.
- Dice, pawn movement, main actions, panel openings, and card outcomes have
  sound effects.
- Background music loops and can be muted from the bottom-right control.
- Third-party asset sources and licenses are cataloged for a future credits
  screen.

## Last meeting feedback

- We received the official Portuguese text for the good-event and bad-event
  cards. The supplied list contains 17 cards of each type, with `X EVA` as the
  placeholder for values that still need to be assigned.
- The implemented special-property rules were accepted: owning the importer
  does not gate development orders, and special properties apply global
  effects rather than effects based on where the property is located.
- The jackpot must be funded from the sum of the match buy-ins rather than
  provided as an external prize. Each time a player passes or lands on Start,
  the jackpot draw happens in-game and is presented with a roulette or another
  clear animated visual cue. The exact jackpot allocation and draw behavior
  still need to be specified.
- The turn timer remains planned, but it has not been implemented yet.
- The client asked whether room tickets could be paid with prepaid account
  credits from another system instead of requiring players to interact directly
  with the blockchain. We confirmed that this flow could supplement or replace
  the current paid room creation and match-entry interactions if their system
  provides a clean API. Its API contract, authentication model, balance and
  debit operations, and payment confirmation behavior still need to be reviewed.
- The client requested a browsable event-log list in addition to the current
  toast notifications and previous, next, and latest replay controls.
- Suerte and Destino must operate within the match economy funded by finite
  buy-in resources. Positive card payouts cannot create EVA beyond the money
  available to the game bank. Because decks rotate, match setup must reserve
  enough EVA to cover the worst supported sequence of positive cards before
  the bank receives property purchases, development payments, or other income.
  The reserve formula and its relationship to the jackpot allocation still
  need to be specified.

## What's new

- Added a browsable, newest-first event log beside the compact toast replay
  controls. Selecting an entry closes the list and replays that event as a
  toast.
- Replaced the six placeholder cards with all 34 client-supplied event
  concepts, translated them into English, Spanish, and Brazilian Portuguese,
  and assigned provisional values from 1 to 3 EVA. Bank reserve and solvency
  guardrails remain a later economy slice.
- Started the [English V1 rulebook draft](../rules/evanopolis-v1-rulebook.md) as
  the shared document for rules signoff. It describes the current playable
  rules in player-facing language and collects unresolved decisions in explicit
  approval blocks and a closing checklist.
- Replaced the raw `socket_not_open` error with connection recovery states. The
  game now retries transient disconnects, disables stale actions while offline,
  asks for a new wallet signature when paid admission expires, and explains
  when another tab took over the seat or a restarted server lost the match.

## Agree the Delivery Finish Line

Use the shared [delivery completion checklist](../delivery/completion-checklist.md)
to agree what “done” means. The proposed finish line has six checks:

1. Sign off the V1 rules and scope.
2. Complete one joint full-match acceptance session.
3. Validate the selected payment and account integration in staging.
4. Deliver versioned Docker images, the web bundle, and operating instructions.
5. Deploy and smoke-test the package in the client's environment.
6. Hand over source, documentation, licenses, known limitations, and obtain
   final acceptance.

## Meeting Outcomes — September 22

### Room entry experience

- Redesign the room creation page so it feels like a production user flow and
  clearly guides the host through creating a room.
- Redesign the invitation acceptance page so it clearly guides an invited
  player through joining and paying for a seat.
- Make both entry pages responsive and usable on smartphones.
- Use the current production entry URL as the starting point for this work:
  <https://www.falafel.com.br/evanopolis-v1/room-entry.html>.
- Provide a simplified free-to-play entry flow that can be shared with beta
  testers without exposing development-oriented controls or terminology.

### Required flow documentation

- **Fabricio:** list every field the room creator must provide and explain why
  it is needed.
- **Fabricio:** list every field an invited player must provide and document the
  possible paths through login, token allowance, and payment.
- Use those two field and flow inventories as requirements for the final entry
  page designs.

### Browser and wallet acceptance

- Validate sign-in and payment in Chrome and Safari.
- Validate the same flow on a smartphone with a mobile wallet.
- Include login, allowance approval, payment, duplicate-entry prevention, and
  successful game admission in the acceptance path.

### Economy and rules follow-ups

- Each match needs a separately reserved bank fund. Every player still starts
  with an EVA balance equal to their buy-in, while the reserve prevents positive
  card payouts and other bank obligations from making the bank insolvent.
- Define the reserve source, amount, covered obligations, and replenishment or
  exhaustion behavior before approving the economy.
- Define the mortgage rule, including eligibility, valuation, repayment,
  ownership restrictions, and what happens at bankruptcy or match end.

### Coordination

- Send Friday's Meet link to participants in advance.
