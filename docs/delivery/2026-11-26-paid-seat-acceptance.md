# 2026-11-26 Paid Seat Acceptance

## Scope

Validate the final-seat reservation, paid admission, and stable player-order
contract on the official client-hosted AWS environment.

Environment:

- wrapper: `https://play.evanopolis.evervaluecoin.com`, version `tsxukrrm`;
- auth: `https://auth.evanopolis.evervaluecoin.com`;
- game server: `https://game.evanopolis.evervaluecoin.com`, version
  `tsxukrrm`;
- one two-player paid room with a 0.1 EVA ticket;
- three distinct wallets in Chrome, Firefox, and Brave.

## Observed Sequence

1. Wallet A paid first and appeared as its own paid seat 1. Authenticated
   wallets B and C saw an anonymized paid player in seat 1 and seat 2 open.
2. Wallet B continued to payment. Before approving or paying, seat 2 appeared
   to wallet C as held/reserved.
3. Wallet C attempted to continue and received: "This room filled before the
   payment started. No transaction was submitted." No wallet approval or
   payment transaction opened for C.
4. Wallet B initially encountered a stale gas-fee wallet error. Retrying reused
   its reservation; after the transaction confirmed, seat 2 became paid.
5. Wallet B entered the game before wallet A and was assigned `player_2`.
6. Wallet A entered afterward as `player_1`, and the match started normally.
7. Wallet B refreshed during the match and reconnected directly while its JWT
   remained valid, preserving `player_2` and all match state.
8. Wallet B then closed the browser completely. Wallet A observed `player_2`
   offline; after A ended its turn, the offline `player_2` correctly became the
   active player under the current no-timeout policy.
9. Wallet B reopened the invitation in a new browser window, connected the same
   wallet, and was recognized as already paid. It entered without another
   payment, returned as `player_2` with its balance, position, and three owned
   properties preserved, rolled, and ended its turn. Wallet A then received the
   enabled roll action again as `player_1`.

## Result

Passed. The deployed system demonstrated all of the following:

- the reservation is visible before funds can move;
- the final seat cannot be oversold;
- a rejected wallet is blocked before allowance approval or payment;
- reservation retry survives a wallet transaction failure;
- payment converts the held seat to paid;
- lobby occupancy is authoritative and anonymized;
- WebSocket connection order cannot change paid player/turn order;
- the two admitted wallets can start the match;
- refresh reconnect and a new browser session restore the same paid seat and
  authoritative match state without another payment;
- gameplay continues normally after the recovered player completes its turn.

This closes the deployed final-seat acceptance gate. It does not replace the
remaining complete-match, expired-JWT, mobile, and rules-signoff acceptance
work. It also exposed the offline active-player stall. The agreed V1 follow-up
gives an offline active player 120 seconds to reconnect, then skips the turn
without elimination or asset transfer. Pending rent or card resolution suspends
the skip. The implementation is covered locally and still needs deployed AWS
acceptance.
