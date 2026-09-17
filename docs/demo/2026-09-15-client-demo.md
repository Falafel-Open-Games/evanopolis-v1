# Evanopolis Client Demo Notes

Date: 2026-09-15

Baseline last tested by client: `stqlnxmt`, 2026-08-19
Current demo build: `qqzkrsvx`, 2026-09-14

Related follow-up: [2026-09-14 post-demo feedback](2026-09-14-post-demo-feedback.md)

## 1. Changelog Since Last Client Test

### Multiplayer and Server Flow

- Added a server-connected multiplayer review flow with multiple browser
  clients joining the same match.
- Added authoritative server snapshots and command validation for turns,
  purchases, rent, cards, development, special properties, and jail.
- Added deterministic seeds for repeatable demo scenarios and easier bug
  reproduction.
- Added a player HUD showing current player, balance, owned property count,
  available action, and portfolio access.

### Dice, Turns, and Movement

- Dice rolls are now server-authoritative and reproducible from the match seed.
- Turn handoff animates the camera toward the next active player.
- Passing `SALIDA` awards `+2 EVA`; landing exactly on `SALIDA` awards `+3 EVA`.
- Added toast feedback for `SALIDA` rewards after movement completes.

### Terrain, Rent, and Purchases

- Terrain purchase flow is live.
- Rent payment flow is live.
- Rent values are calculated server-side and displayed consistently on:
  - board tiles
  - property decision panels
  - portfolio rows
- Full-city monopoly bonus is implemented for all 4 terrain in a city at level 5.
- Rent tables in the decision panel now show when bonuses are already included.

### Luck and Destiny Cards

- Added provisional `Suerte` and `Destino` decks.
- Added card draw and card resolution flow.
- Cards currently use simple EVA delta effects for the playable demo.
- Added game-over handling when a player cannot afford a card cost.
- Other players see toast feedback when card effects resolve.

### Portfolio and Development

- Added a portfolio panel listing owned terrain.
- Terrain can be selected for development orders from the portfolio.
- Development orders are server-authoritative.
- Delivered containers and machine lots appear:
  - in portfolio details
  - in rent calculations
  - on the 3D board
- Portfolio shows when no affordable development order is available.

### Special Properties

- Special properties can now be purchased from the bank.
- Special property ownership is tracked server-side and shown on the board.
- Special properties are listed in the portfolio under a `SPECIAL PROPERTIES`
  separator.
- Special property rows are visually distinct and not selectable for development.
- Special property effect text is shown in property and portfolio UI.
- Implemented provisional special-property effects:
  - Importers pay equipment purchase commissions.
  - Substations increase the owner's terrain rent.
  - Workshop and Cooling Plant increase the owner's terrain rent using the
    current provisional interpretation.
- Rent displays include active special-property bonuses.

### Notifications and Polish

- Toasts moved to the bottom-left to avoid covering buy/end-turn controls.
- Added toasts for property purchase, rent paid, card resolution, `SALIDA`,
  jail, and game-over events.
- Improved property panel readability for rent tables and bonus notes.
- Improved status bar layout and command labels.

### Prison / Carcel

- Added provisional `CARCEL` behavior for tomorrow's demo:
  - Landing on `CARCEL` sends the player to jail.
  - The landing turn ends with `ACCEPT JAIL TIME`.
  - On that player's next turn, they skip by pressing `SERVE SENTENCE`.
  - After serving, they return to normal play.
- This behavior is intentionally marked as client-approval-needed.

## 2. Client Input Needed

### Must Confirm Before Final Rules

- `CARCEL` rule:
  - Is landing on `CARCEL` supposed to be punitive?
  - Is skipping exactly one turn acceptable?
  - Should there be fines, doubles rolls, jail-release cards, or card-triggered
    jail movement later?

- Workshop and Cooling Plant:
  - Raw spec says `+10%` rent for terrain in the city where the special property
    is located.
  - Current demo interpretation gives `+10%` rent to all terrain owned by that
    special property's owner.
  - Need client approval on city-local vs owner-wide bonus.

- Importers and development access:
  - Raw spec implies Importadora unlocks containers/machines.
  - Current demo keeps development available without importer ownership.
  - Need client decision: should development unlock for everyone once any
    importer exists, only for the owner, or remain always available?

- Importer commissions:
  - Current demo: each Importer gives its owner 10% commission on equipment
    purchases; same owner with both Importers receives 20%.
  - Confirm whether this matches intended economy.

- Substations:
  - Current demo: one substation gives its owner +10% rent; owning both gives
    +30% total.
  - Confirm whether +30% replaces the individual bonuses or stacks in another
    way.

### Can Defer After Demo

- Jackpot:
  - Passing `SALIDA` records the free jackpot roll in the event, but jackpot
    state/action is not implemented.
  - Need to decide whether V1 needs a playable jackpot roll or just tracked
    reporting.

- Bank purchase distribution:
  - Raw spec says bank purchases split into jackpot, referrals, burn, and final
    prize fund.
  - Current demo does not track those pools.
  - Need to decide if this is gameplay-visible or only an end-game/accounting
    report.

- Card deck content:
  - Current `Suerte`/`Destino` cards are placeholders.
  - Need final card list, text, effects, deck sizes, and whether any cards are
    held for later use.

- Game-over and prize flow:
  - Current demo eliminates players when they cannot pay required costs.
  - Need final prize/fund distribution rules.

## 3. Demo Operator Script

### Setup

1. Start the game server with the current build.
2. Start the web wrapper/review page.
3. Create a new match.
4. Use 2 to 4 players depending on meeting size.
5. Use a deterministic seed when you want repeatable behavior.
6. Open one browser tab/window per player.

Suggested framing:

> This build is now server-connected. The server is authoritative for dice,
> turns, balances, ownership, rent, cards, development, special properties, and
> provisional jail behavior. Some rules are intentionally provisional so we can
> validate them together today.

### Walkthrough Flow

1. Join players to the match.
   - Point out player HUD: player color, balance, owned count, action button,
     portfolio.

2. Roll and buy a terrain.
   - Show server dice result.
   - Land on available terrain.
   - Buy terrain.
   - Show ownership reflected on tile and player owned count.

3. Show rent.
   - Move another player onto owned terrain.
   - Pay rent.
   - Point out balance change and rent toast for other players.

4. Show `SALIDA`.
   - Explain pass bonus: `+2 EVA`.
   - Explain exact landing bonus: total `+3 EVA`.
   - Mention jackpot free roll is recorded but jackpot gameplay is deferred.

5. Show card flow.
   - Land on `Suerte` or `Destino`.
   - Show card panel.
   - Resolve card.
   - Point out other-player toast and balance update.
   - Mention card content is placeholder pending final client card list.

6. Show portfolio.
   - Open portfolio.
   - Show owned terrain.
   - Show special properties separated when owned.
   - Show unavailable/available development order state.

7. Show development order.
   - Select an owned terrain from portfolio.
   - Order a container or machine lot if affordable.
   - Explain development is currently not gated by Importer ownership.
   - Advance turns until delivery if practical.
   - Show board props and rent updates after delivery.

8. Show special property purchase/effect.
   - Land on an unowned special property.
   - Show full effect description in the decision panel.
   - Buy if affordable.
   - Open portfolio and show it under `SPECIAL PROPERTIES`.
   - If possible, show rent values including bonus notes.

9. Show `CARCEL` if seed/time allows.
   - Land on `CARCEL`.
   - Point out `ACCEPT JAIL TIME`.
   - End the landing turn.
   - On that player's next turn, point out `SERVE SENTENCE`.
   - Serve sentence and show normal turn flow resumes later.
   - Ask for approval on whether this is the desired prison rule.

10. Show game-over if time allows.
    - Trigger unaffordable card/rent if practical.
    - Point out game-over toast and remaining active player flow.

### What To Say When Something Is Provisional

Use this pattern:

> The demo implements one playable interpretation so the flow can be tested
> end-to-end. We have this marked as requiring your approval before treating it
> as final.

### Known Demo Scope Boundaries

- Jackpot roll UI is not implemented yet.
- Bank purchase distribution pools are not implemented yet.
- Card decks are provisional placeholders.
- Prison is provisional.
- Importer gating is deferred; commissions are implemented.
- Workshop/Cooling behavior uses the broad owner bonus interpretation for now.
- Final prize/referral/burn accounting is not implemented yet.

### Suggested Closing Questions

1. Does the core turn loop feel right: roll, decide, pay/buy/resolve, end turn?
2. Does the portfolio development flow make sense?
3. Which special-property interpretations should become final?
4. Should development require Importer ownership, or stay always available?
5. What exact behavior should `CARCEL` have?
6. Should jackpot and bank distribution be visible gameplay in V1, or reporting
   after the match?
7. What are the final `Suerte` and `Destino` card lists?
