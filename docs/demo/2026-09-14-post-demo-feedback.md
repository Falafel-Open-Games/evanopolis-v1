# Evanopolis Post-Demo Feedback

Date: 2026-09-14

Source: Telegram notes captured after the client demo. Most notes were written
in Portuguese and are normalized here into implementation-oriented follow-up
items.

## Summary

The demo feedback clustered around four areas:

- players need stronger protection against missing transient notifications
- public game events should be visible to all players, not only the acting
  player
- the rule/economy layer needs final decisions for prison, insolvency, and
  buy-in-relative pricing
- the playable client needs room-level timers, audio polish, and clearer
  cross-player state visibility

This document records the feedback as product input, not as final spec. Items
that change rules should be reconciled with `docs/spec/game_rules_v1_normalized.md`
before implementation.

## Feedback Themes

### Notifications And Event Visibility

- Add a way to review older notifications, or make important notifications
  require explicit dismissal so players cannot miss them.
- When a player lands on `Destino`, the drawn card should be shown to all
  players, not only to the player who landed there.
- Keep using observer-facing feedback for shared events, but distinguish
  between low-priority toasts and critical decisions/results that must remain
  visible until acknowledged.

### Board Language

- Change remaining board-space labels from Spanish/Portuguese to English.
  Explicit examples called out in feedback:
  - `Carcel`
  - `Destino`

### Prison / Jail Rule

Client feedback clarified the desired prison rule:

- A player in jail may leave by rolling doubles.
- A player may pay `1 EVA` to leave jail.
- If neither of those happens, the player remains jailed for two rounds.
- When a player lands on jail, the UI should explain:
  - what actions can get them out
  - how long they remain jailed if they do nothing

This supersedes the one-turn provisional jail behavior used for the demo.

### Turn Timer

- Add a timer for each turn.
- If the timer expires, the game passes the turn to the next player.
- The timer duration should be configurable when creating the room.

Open implementation questions:

- Should the timer pause while a required modal/card decision is open?
- Should expired turns auto-decline optional purchases and development orders?
- Should room owners choose from presets or enter a custom duration?

### Audio

- Add chill-out background music.
- Background music should support on/off control.
- Preferably expose background music volume control.
- Add sound effects for common events, including:
  - dice roll
  - pawns moving
  - opening and closing windows/panels
  - other major gameplay events

### Cross-Player State

- Players should be able to see the balances of other players.
- The current HUD already shows local player state; follow-up UI should expose
  enough opponent state for strategic decisions without cluttering the main
  board view.

### Game Over And Insolvency

Revise game-over handling for players who cannot pay:

- If the debt is caused by rent or another player-owned asset, the debtor
  should mortgage/liquidate first.
- If liquidation is still insufficient, all remaining debtor assets transfer to
  the owner of the terrain or asset that caused the elimination.
- If the elimination is caused by a `Destino` card, the eliminated player's
  properties and developments return to the bank instead of transferring to
  another player.

Open implementation questions:

- Which assets can be mortgaged, and at what value?
- Are developments sold back, removed, or transferred during liquidation?
- Does the eliminated player keep any pending jackpot/prize claims?
- Does the winner/final-prize flow need to account for burned, banked, or
  transferred assets differently?

### Buy-In Relative Economy Scaling

Demo feedback indicated that a `10 EVA` buy-in with the current spec prices
made money run out too quickly, roughly around the first complete lap.

Follow-up requirement:

- Game prices should be adjustable as a ratio relative to the ticket/buy-in.
- Room creation should support an economy multiplier for spec prices.
- Examples discussed:
  - `1.0x`: current spec prices
  - `0.5x`: half of spec prices
  - `0.333x`: one third of spec prices
  - custom multiplier

The multiplier should apply consistently to terrain prices, special property
prices, development costs, rent, fines, and card money effects unless a specific
rule says otherwise.

Open implementation questions:

- Should multipliers round to whole EVA, tenths, or token base units?
- Should the UI show original spec price, scaled price, or both?
- Should rooms expose only curated economy presets for balance testing?
- Should the buy-in itself determine the default multiplier automatically?

## Candidate Follow-Up Backlog

- Persistent or reviewable notification history.
- Critical event modal/ack flow for public card draws.
- English board-space label pass.
- Final jail rule implementation and UI copy.
- Room-level turn timer setting and server-enforced timeout.
- Background music controls and event sound effects.
- Opponent balance visibility in HUD or player list.
- Mortgage/liquidation model before game-over elimination.
- Distinct insolvency handling for player-caused debts versus `Destino` cards.
- Buy-in-relative economy multiplier in room settings and server rules.

