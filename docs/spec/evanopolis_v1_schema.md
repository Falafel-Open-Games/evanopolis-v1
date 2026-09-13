# Evanopolis V1 Schema

This document describes Evanopolis-specific payloads carried by the generic game
server protocol. The generic message envelope, join/reconnect flow, revision
rules, snapshots, and events are documented in
[`../architecture/game_server_protocol.md`](../architecture/game_server_protocol.md).

The schemas here are allowed to evolve as Evanopolis rules are finalized. Stable
client code should use ids such as `space_id`, `group_id`, and
`special_property_id` instead of display labels.

## Match Definition

The server sends `match_definition` after every accepted `join_match`.

Envelope:

```json
{
  "type": "match_definition",
  "definition": {
    "match_id": "demo",
    "ruleset_id": "evanopolis_v1",
    "random_seed": "evanopolis:demo",
    "room_buy_in_eva": 50,
    "spaces": [],
    "card_decks": []
  }
}
```

Fields:

- `match_id`: match this definition was sent for
- `ruleset_id`: Evanopolis ruleset/version id
- `random_seed`: seed intended to make match randomness reproducible from logs
- `room_buy_in_eva`: match buy-in and starting player balance
- `spaces`: static 36-space board definition
- `card_decks`: public metadata for the provisional `Suerte` and `Destino`
  decks

The definition is static metadata. It does not contain dynamic ownership,
development, pawn positions, dice, turn state, or available actions.

## Match Randomness

The server owns authoritative gameplay randomness. Godot and browser clients do
not maintain gameplay RNG state; they render dice/card results from server
events and snapshots.

Snapshots include:

```json
{
  "random_seed": "evanopolis:demo",
  "dice_roll_count": 1
}
```

Fields:

- `random_seed`: match seed used by server-side random streams
- `dice_roll_count`: number of accepted dice rolls so far

Dice rolls derive from `random_seed`, the current `dice_roll_count`, and the
die index. The counter increments only when a `request_roll` command is
accepted.

Card deck order is initialized from `random_seed` and deck id. Drawn cards move
to the bottom of their deck without additional randomness.

## Localized Labels

Localized labels currently use:

```json
{
  "en": "Asuncion",
  "es": "Asunción",
  "pt_br": "Assunção"
}
```

English labels are available through `labels.en`. Spanish/source labels preserve
approved board-language names where they differ. Brazilian Portuguese labels are
available through `labels.pt_br`.

Clients should treat `label` as the approved board/spec display value. Use
`labels` when language selection matters.

## Board Space Shape

Every space has:

- `index`: numeric board position, starting at `0`
- `space_id`: stable unique board-space id
- `kind`: space category
- `label`: approved board/spec display label
- `labels`: localized labels

Known `kind` values:

- `start`
- `terrain`
- `special_property`
- `luck`
- `destiny`
- `jail`

## Card Deck Shape

`Suerte` and `Destino` use separate provisional V1 decks. Each deck currently
contains three simple placeholder cards that resolve after player
acknowledgement.

Example:

```json
{
  "deck_id": "destiny",
  "labels": {
    "en": "Destiny",
    "es": "Destino",
    "pt_br": "Destino"
  },
  "cards": [
    {
      "card_id": "destiny_operating_tax",
      "deck_id": "destiny",
      "labels": {
        "en": "Operating tax. Pay 2 EVA.",
        "es": "Impuesto operativo. Paga 2 EVA.",
        "pt_br": "Imposto operacional. Pague 2 EVA."
      },
      "effect": {
        "type": "eva_delta",
        "amount_eva": -2
      }
    }
  ]
}
```

Current deck ids:

- `luck`
- `destiny`

Current effect types:

- `eva_delta`: active player gains or loses EVA to/from the bank

Tomorrow's playable placeholder cards intentionally use only `eva_delta`
effects. Player-to-player payments, property-relative cards, movement cards,
jail cards, jackpot cards, and keepable cards are future-version work.

These cards are placeholders for the playable demo and still need client
approval for final text and effects.

## Pending Card Resolution

When a player lands on a `luck` or `destiny` space, the server draws a card but
does not immediately apply its effect. The snapshot exposes a pending card:

```json
{
  "pending_card_resolution": {
    "deck_id": "destiny",
    "card_id": "destiny_operating_tax",
    "player_id": "player_1",
    "space_id": "destiny_1",
    "effect": {
      "type": "eva_delta",
      "amount_eva": -2
    }
  }
}
```

While `pending_card_resolution` is present for the active player,
`available_actions` is:

```json
["request_resolve_card"]
```

The player sends:

```json
{
  "type": "request_resolve_card",
  "match_id": "demo",
  "client_id": "browser-1234",
  "player_id": "player_1",
  "seen_revision": 4,
  "payload": {}
}
```

The server then applies the card effect, clears `pending_card_resolution`, and
exposes `request_end_turn`. The client may keep the card panel open and replace
`APPLY CARD` with `END TURN` so the player stays in the same decision surface.

If a negative `eva_delta` card asks the active player to pay more EVA than they
currently have, `available_actions` becomes:

```json
["request_accept_game_over"]
```

Accepting game over marks that player `game_over`, clears
`pending_card_resolution`, and emits `player_eliminated` with:

```json
{
  "type": "player_eliminated",
  "player_id": "player_1",
  "reason": "insufficient_card_eva",
  "space_id": "destiny_1",
  "deck_id": "destiny",
  "card_id": "destiny_operating_tax",
  "amount_eva": -2,
  "next_player_id": "player_2"
}
```

Unlike rent debt, card debt is owed to the bank and has no creditor player.
Terrain liquidation for bank debt is intentionally deferred until a final
bankruptcy/liquidation rule is approved.

Card draw and resolution use separate events:

```json
{
  "type": "card_drawn",
  "player_id": "player_1",
  "space_id": "destiny_1",
  "deck_id": "destiny",
  "card_id": "destiny_operating_tax"
}
```

```json
{
  "type": "card_resolved",
  "player_id": "player_1",
  "space_id": "destiny_1",
  "deck_id": "destiny",
  "card_id": "destiny_operating_tax",
  "effect_type": "eva_delta",
  "amount_eva": -2
}
```

## Terrain Space

Example:

```json
{
  "index": 1,
  "space_id": "terrain_caracas_1",
  "kind": "terrain",
  "label": "Caracas",
  "labels": {
    "en": "Caracas",
    "es": "Caracas",
    "pt_br": "Caracas"
  },
  "group_id": "caracas",
  "group_label": "Caracas",
  "group_labels": {
    "en": "Caracas",
    "es": "Caracas",
    "pt_br": "Caracas"
  },
  "terrain_index": 1,
  "purchase_price_eva": 1,
  "development_rent_table": [
    { "level": 0, "build_label": "Empty", "rent_eva": 0.5 },
    { "level": 1, "build_label": "Container", "rent_eva": 1.8 },
    { "level": 2, "build_label": "+50", "rent_eva": 2.8 },
    { "level": 3, "build_label": "+100", "rent_eva": 4.0 },
    { "level": 4, "build_label": "+150", "rent_eva": 5.4 },
    { "level": 5, "build_label": "+200", "rent_eva": 7.0 }
  ],
  "container_price_eva": 2,
  "machine_lot_price_eva": 1
}
```

Terrain-specific fields:

- `group_id`: city/terrain group id
- `group_label`: approved board/spec group label
- `group_labels`: localized city/group labels
- `terrain_index`: 1-based terrain number within the city group
- `purchase_price_eva`: static purchase price in EVA
- `development_rent_table`: static display/rules rows for terrain development
  level, development label, and base rent before ownership or special-property
  modifiers. `rent_eva` is a decimal EVA number normalized to one decimal
  place, not a whole-EVA integer.
- `container_price_eva`: static terrain container price
- `machine_lot_price_eva`: static price for each 50-machine lot

Terrain display labels repeat the city/group name. Use `space_id` and
`terrain_index` when a unique terrain reference is required.

The server definition intentionally does not include UI accent colors. Clients
map terrain identity such as `group_id` to local presentation colors.

## Special Property Space

Example:

```json
{
  "index": 21,
  "space_id": "special_importer_2",
  "kind": "special_property",
  "label": "Importadora 2",
  "labels": {
    "en": "Importer 2",
    "es": "Importadora 2",
    "pt_br": "Importadora 2"
  },
  "special_property_id": "importer_2",
  "purchase_price_eva": 5
}
```

Special-property-specific fields:

- `special_property_id`: stable special-property id
- `purchase_price_eva`: static purchase price in EVA

Repeated special-property display labels include their spec number, such as
`Importadora 1`, `Importadora 2`, `Subestación 1`, and `Subestación 2`. Use
`space_id` or `special_property_id` for programmatic references.

`Cooling Plant` remains the canonical English/source rule name. Its Spanish
localized label is `Planta de Refrigeración`.

## Vertex Spaces

Example:

```json
{
  "index": 0,
  "space_id": "start",
  "kind": "start",
  "label": "Start",
  "labels": {
    "en": "Start",
    "es": "Salida",
    "pt_br": "Saída"
  }
}
```

Vertex spaces do not currently include prices.

## Dynamic Snapshot State

Dynamic match state belongs in `match_snapshot`, not in `match_definition`.

Current dynamic snapshot fields include:

- `match_id`
- `revision`
- `phase`
- `room_buy_in_eva`
- `local_player_id`
- `active_player_id`
- `winner_player_id`
- `players`
- `spectators`
- `terrain_ownership`
- `pending_rent`
- `dice`
- `available_actions`

Board `spaces` are intentionally not repeated in snapshots.

### `players`

Player snapshots include turn position, seat status, and the current EVA
balance:

```json
{
  "player_id": "player_1",
  "position": 7,
  "status": "active",
  "eva_balance": 48,
  "joined": true,
  "connected": true
}
```

Known `status` values:

- `active`: the player remains in the turn cycle
- `game_over`: the player has been eliminated and is skipped by future turns

### `winner_player_id`

`winner_player_id` is empty until the current V1 endgame condition is reached.
When only one active player remains, it contains that player's `player_id`.
At that point the match phase is `finished` and no player receives gameplay
actions.

The first successful `join_match` may set `room_buy_in_eva`; otherwise the
server uses `50 EVA`. Each player starts with the match `room_buy_in_eva`.
Scaling terrain prices, rent, rewards, and other values from room buy-in is
still deferred.

The first-join configuration path is temporary for development/debugging. Before
launch, room buy-in and other room settings must be created through a Rooms API
or equivalent stricter bootstrap flow, then reflected here as server-owned match
metadata.

### `terrain_ownership`

Terrain ownership is dynamic state keyed by stable board-space id:

```json
[
  {
    "space_id": "terrain_asuncion_1",
    "owner_player_id": "player_1"
  }
]
```

The array is empty before any terrain is purchased. Ownership lives in
`match_snapshot`, not in `match_definition`, because it changes during play.

### `pending_rent`

When the active player lands on terrain owned by another player, the snapshot
contains a pending rent obligation:

```json
{
  "space_id": "terrain_asuncion_1",
  "payer_player_id": "player_2",
  "owner_player_id": "player_1",
  "rent_eva": 1
}
```

The server records `rent_eva` when the obligation is created so a later pay
action resolves that exact obligation. The field is `null` when no rent is due.
Paying rent clears this obligation, transfers EVA from payer to owner, and emits
a `rent_paid` event.

### `available_actions`

After the active player rolls onto an unowned terrain they can afford, the
active player's snapshot includes:

```json
["request_purchase_property", "request_end_turn"]
```

After purchase, on self-owned terrain, or on non-terrain spaces, purchase is not
available and the active player keeps `request_end_turn`.

After the active player lands on terrain owned by another player, the snapshot
includes only:

```json
["request_pay_rent"]
```

The active player cannot end the turn until the rent obligation is paid.

If the active player cannot afford the pending rent, the snapshot includes only:

```json
["request_accept_game_over"]
```

Accepting game over resolves the insufficient-rent state, transfers the
eliminated player's remaining EVA and owned properties to the rent owner, clears
the pending rent, and advances the turn cycle to the next active player.

If that elimination leaves only one active player, the server emits
`game_ended`, sets the match phase to `finished`, sets `winner_player_id` to the
last active player, and returns no available gameplay actions.

## Evanopolis Commands

### `request_purchase_property`

Requests purchase of the terrain where the active player's pawn currently
stands. The command has no payload fields in the current slice:

```json
{
  "type": "request_purchase_property",
  "match_id": "demo",
  "client_id": "client-a",
  "player_id": "player_1",
  "seen_revision": 4,
  "payload": {}
}
```

The server accepts the command only when:

- the match is active
- the requesting player is the active player
- the player has already rolled this turn
- the current space is an unowned terrain
- the active player has enough EVA to pay the purchase price

The current slice debits the buyer's EVA balance and records ownership. Bank
distribution into jackpot, referrals, burn, and final prize pool is still
deferred.

Accepted purchase event:

```json
{
  "type": "property_purchased",
  "player_id": "player_1",
  "space_id": "terrain_asuncion_1",
  "price_eva": 2
}
```

### `request_pay_rent`

Requests payment of the current pending rent obligation. The command has no
payload fields in the current slice:

```json
{
  "type": "request_pay_rent",
  "match_id": "demo",
  "client_id": "client-b",
  "player_id": "player_2",
  "seen_revision": 7,
  "payload": {}
}
```

The server accepts the command only when:

- the match is active
- the requesting player is the active player
- the player has already rolled this turn
- the active player has a pending rent obligation
- the active player has enough EVA to pay the rent

Accepted rent event:

```json
{
  "type": "rent_paid",
  "payer_player_id": "player_2",
  "owner_player_id": "player_1",
  "space_id": "terrain_asuncion_1",
  "rent_eva": 1
}
```

### `request_accept_game_over`

Accepts the V1 insufficient-rent game-over resolution when the active player has
a pending rent obligation they cannot afford. The command has no payload fields:

```json
{
  "type": "request_accept_game_over",
  "match_id": "demo",
  "client_id": "client-b",
  "player_id": "player_2",
  "seen_revision": 7,
  "payload": {}
}
```

The server accepts the command only when:

- the match is active
- the requesting player is the active player
- the player has already rolled this turn
- the active player has a pending rent obligation
- the active player's EVA balance is less than the pending rent

Accepted game-over event:

```json
{
  "type": "player_eliminated",
  "player_id": "player_2",
  "creditor_player_id": "player_1",
  "reason": "insufficient_rent",
  "space_id": "terrain_asuncion_1",
  "unpaid_rent_eva": 1,
  "transferred_balance_eva": 0.5,
  "transferred_space_ids": ["terrain_caracas_1"],
  "next_player_id": "player_1"
}
```

If the eliminated player was the next-to-last active player, the same accepted
command also emits:

```json
{
  "type": "game_ended",
  "winner_player_id": "player_1",
  "reason": "last_player_standing"
}
```

Future dynamic fields may include terrain development, money, cards, jail
state, bank accounting buckets, match-end/ranking state, and richer purchase
options.
