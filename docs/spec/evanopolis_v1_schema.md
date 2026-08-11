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
  "purchase_price_eva": 1
}
```

Terrain-specific fields:

- `group_id`: city/terrain group id
- `group_label`: approved board/spec group label
- `group_labels`: localized city/group labels
- `terrain_index`: 1-based terrain number within the city group
- `purchase_price_eva`: static purchase price in EVA

Terrain display labels repeat the city/group name. Use `space_id` and
`terrain_index` when a unique terrain reference is required.

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
- `dice`
- `available_actions`

Board `spaces` are intentionally not repeated in snapshots.

Future dynamic fields may include ownership, terrain development, money,
cards, jail state, rent decisions, and purchase options.
