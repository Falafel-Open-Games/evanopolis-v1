# Suerte and Destino Card Plan

This plan translates the current rules spec into protocol, server, and Godot
client work. It intentionally avoids inventing card effects that are not yet in
the approved rules.

Design fallback: Evanopolis is a Monopoly-style game. When the Evanopolis rules
are silent and a placeholder is needed for the playable demo, prefer behavior a
regular Monopoly player would already understand. Mark those choices as
placeholder behavior until Evanopolis-specific card text is approved.

## Current Facts

- The board has four chance-style spaces:
  - `luck_1` at index `6`
  - `destiny_1` at index `12`
  - `luck_2` at index `24`
  - `destiny_2` at index `30`
- Server board definitions already distinguish `kind: "luck"` from
  `kind: "destiny"`.
- Turn flow says that landing on `Suerte` or `Destino` should draw and resolve
  a card after movement and before the player ends the turn.
- The normalized rules do not yet define card contents, deck size, shuffle
  policy, persistence, or exact card effects.

## Product Decisions Needed

Provisional decisions for implementation progress:

- `Suerte` and `Destino` are separate decks.
- V1 starts with 3 simple cards in each deck.
- Decks are shuffled at match start.
- All match randomness should come from a match seed so dice rolls and card
  order can be reproduced from logs.
- Drawn cards go to the bottom of their deck without reshuffling.
- Cards are simple for V1, but they resolve only after the active player
  acknowledges the pending card.

Client approval watchlist:

- final card ids, titles, localized text, and effects
- whether cards can move the player again
- if a card moves the player, whether the destination space also resolves
- whether cards can force money transfers, bank payments, rent, jail, jackpot,
  or game over
- whether final decks keep the bottom-of-deck policy or use discards/reshuffles

## Recommended V1 Shape

Use two separate decks:

- `luck` for `Suerte`
- `destiny` for `Destino`

Use simple one-step cards only for V1. This matches the common Monopoly-style
pattern of drawing a chance/community card, reading it, applying the result,
and discarding it. In Evanopolis, the player acknowledgement is explicit:
landing creates a pending card, and `request_resolve_card` applies it. Avoid
keepable cards until jail and inventory rules exist.

Represent each card with stable ids:

```json
{
  "card_id": "destiny_collect_2_eva",
  "deck_id": "destiny",
  "labels": {
    "en": "Collect 2 EVA",
    "es": "Cobra 2 EVA",
    "pt_br": "Receba 2 EVA"
  },
  "effect": {
    "type": "eva_delta",
    "amount_eva": 2
  }
}
```

Start with simple effect types that do not require unresolved systems:

- `eva_delta`: active player gains or loses EVA to/from the bank
- `move_relative`: active player moves forward or backward by a fixed number
  of spaces
- `move_to_space`: active player moves to a fixed `space_id`

For tomorrow's playable placeholder, prefer `eva_delta` cards first. They give
`Suerte` and `Destino` an immediate visible effect without creating movement
chains, jail behavior, jackpot interactions, or bankruptcy edge cases.

Defer effects that depend on unresolved systems:

- jail cards
- jackpot cards
- debt/bankruptcy exceptions
- terrain upgrades
- payments to or from other players
- cards whose value depends on owned properties or buildings
- movement cards
- persistent inventory cards

## Placeholder Deck Direction

Until final card text exists, use Monopoly-like card categories:

- receive EVA from the bank
- pay EVA to the bank
- move to a named board space
- move forward or backward by a small number of spaces
- receive EVA from other players
- pay EVA based on owned properties or development

For the first playable demo slice, use only receive/pay EVA cards between the
active player and the bank. Player-to-player payments, property-relative cards,
and movement cards are reserved for a future version/update.

Suggested placeholder tone:

- `Suerte`: slightly positive, lucky windfalls
- `Destino`: mixed fate/economy pressure, including small penalties

Example placeholder cards:

| Deck | Card id | Text | Effect |
| --- | --- | --- | --- |
| `luck` | `luck_mining_bonus` | Mining bonus. Receive 2 EVA. | `+2 EVA` |
| `luck` | `luck_unexpected_client` | Unexpected client. Receive 1 EVA. | `+1 EVA` |
| `destiny` | `destiny_operating_tax` | Operating tax. Pay 2 EVA. | `-2 EVA` |
| `destiny` | `destiny_favorable_market` | Favorable market. Receive 2 EVA. | `+2 EVA` |

These are placeholders, not final Evanopolis card text.

## Protocol Changes

### Match Definition

Add public card metadata to `match_definition.definition`:

```json
{
  "random_seed": "evanopolis:demo",
  "card_decks": [
    {
      "deck_id": "destiny",
      "labels": {
        "en": "Destiny",
        "es": "Destino",
        "pt_br": "Destino"
      },
      "cards": [
        {
          "card_id": "destiny_collect_2_eva",
          "labels": {
            "en": "Collect 2 EVA",
            "es": "Cobra 2 EVA",
            "pt_br": "Receba 2 EVA"
          }
        }
      ]
    }
  ]
}
```

The definition may expose card labels, but should not expose shuffled deck
order. The `random_seed` is public so local/debug matches can be reproduced
from logs.

### Match Snapshot

Add durable state so the client can recover a pending card after reconnect:

```json
{
  "pending_card_resolution": {
    "deck_id": "destiny",
    "card_id": "destiny_collect_2_eva",
    "player_id": "player_1",
    "space_id": "destiny_1",
    "effect": {
      "type": "eva_delta",
      "amount_eva": 2
    }
  }
}
```

While `pending_card_resolution` exists for the active player, expose only
`request_resolve_card` in `available_actions`. Block `request_end_turn` until
the card is resolved.

### Match Events

Emit card events before the snapshot for the resulting revision:

```json
{
  "type": "card_drawn",
  "player_id": "player_1",
  "space_id": "destiny_1",
  "deck_id": "destiny",
  "card_id": "destiny_collect_2_eva"
}
```

For cards that change state, include a second semantic event:

```json
{
  "type": "card_resolved",
  "player_id": "player_1",
  "deck_id": "destiny",
  "card_id": "destiny_collect_2_eva",
  "effect": {
    "type": "eva_delta",
    "amount_eva": 2
  }
}
```

The authoritative snapshot remains the recovery source. The events are for
animation, readable logs, and client presentation.

## Server Work

1. Add card/deck types and fixed V1 demo deck definitions.
2. Add match seed state and move dice/card randomness to a seeded PRNG.
3. Extend match state with private deck order state.
4. During `request_roll`, after movement and before available actions:
   - detect `kind: "luck"` or `kind: "destiny"`
   - draw from the matching deck
   - move the drawn card to the bottom of its deck
   - create `pending_card_resolution`
   - emit `card_drawn`
5. Add `request_resolve_card`:
   - validate the active player has a pending card
   - apply the card effect
   - clear `pending_card_resolution`
   - emit `card_resolved`
6. Add tests for:
   - `destiny_1` and `destiny_2` draw from the `destiny` deck
   - `luck_1` and `luck_2` draw from the `luck` deck
   - drawn cards move to the bottom without reshuffling
   - a known seed reproduces dice and card order
   - card effects do not apply before `request_resolve_card`
   - events arrive before the snapshot
   - reconnect snapshot recovers any durable card result state

## Godot Client Work

1. Read `card_decks` from `match_definition`.
2. Store card labels in `GameClientViewModel`.
3. Present `card_drawn` and `card_resolved` events in the presentation queue.
4. Show a lightweight card panel for the active card result.
5. Keep card presentation recoverable: if only a snapshot is received, render
   the final board/economy state even if the animation was missed.

## First Safe Implementation Slice

After card contents are approved, the first code slice should implement one
deterministic pending-resolution `Destino` card and one test that lands a
player on `destiny_1`.

Suggested starter card:

- `destiny_collect_2_eva`
- effect: active player gains `2 EVA` from the bank
- no extra movement
- one acknowledgement applies the card

This creates visible progress without depending on jail, jackpot, debt, or
inventory systems.
