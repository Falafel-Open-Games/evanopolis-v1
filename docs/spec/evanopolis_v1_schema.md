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
    "spaces": []
  }
}
```

Fields:

- `match_id`: match this definition was sent for
- `ruleset_id`: Evanopolis ruleset/version id
- `spaces`: static 36-space board definition

The definition is static metadata. It does not contain dynamic ownership,
development, pawn positions, dice, turn state, or available actions.

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
- `local_player_id`
- `active_player_id`
- `players`
- `spectators`
- `terrain_ownership`
- `pending_rent`
- `dice`
- `available_actions`

Board `spaces` are intentionally not repeated in snapshots.

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
In the current slice, paying rent clears this obligation and emits an event, but
does not mutate EVA balances yet.

### `available_actions`

After the active player rolls onto an unowned terrain, the active player's
snapshot includes:

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

The current slice records ownership only. EVA balances, affordability checks,
and money transfers are still pending.

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

Future dynamic fields may include terrain development, money, cards, jail
state, balance transfers, and richer purchase options.
