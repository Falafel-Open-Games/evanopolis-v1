# Portfolio And Terrain Development Plan

Date: 2026-09-13

## Goal

Turn the disabled `Portfolio` button into the player's owned-property surface
and support developing owned terrain with one container plus up to four mining
machine lots.

## Source Rules

From the normalized V1 rules:

- Each terrain can have one hydro container costing `2 EVA`.
- Each terrain can have up to four machine lots, each costing `1 EVA`.
- Machine lots require the container first.
- Development levels are:
  - Level 0: empty terrain
  - Level 1: container
  - Level 2: container + 1 machine lot
  - Level 3: container + 2 machine lots
  - Level 4: container + 3 machine lots
  - Level 5: container + 4 machine lots
- Rent uses the terrain's development rent table for the current level.

## Temporary V1 Decisions

These should be reviewed with the client, but should not block playable demo
progress.

- Players can open the portfolio panel at any time.
- Portfolio actions create development orders and debit the player's EVA
  immediately.
- Ordered development is paid/in transit; it does not affect rent or board
  containers until delivered.
- At the start of a player's turn, before rolling, the server automatically
  delivers that player's valid paid orders.
- Delivery is installation only; no affordability check is needed at delivery
  time because payment already happened when the order was placed.
- After delivery resolves, the normal roll action becomes available.
- Players can place new development orders any time except during their own
  post-roll turn-resolution phase.
- During a player's own pre-roll phase, they may place new orders before
  rolling, but those newly placed orders are for a future delivery cycle and do
  not deliver immediately.
- After a player rolls, development ordering is unavailable until their turn
  ends, so rent/card/property decisions keep their current pace.
- One development step increments one terrain by exactly one level.
- Level 0 to 1 buys the container for `container_price_eva`.
- Level 1 to 5 buys one machine lot for `machine_lot_price_eva`.
- For this first implementation, do not require an owned Importadora before
  development. The Importadora gate and commissions become a later economy slice.
- If the player cannot afford an order, the server rejects the order immediately
  and does not create a debt/game-over path.
- If an order becomes invalid before delivery because the player no longer owns
  that terrain, cancel and refund the order in the delivery step.
- V1 does not allow voluntary cancellation of development orders.
- Developed terrain keeps its level when transferred through current game-over
  property transfer behavior.
- Special properties remain out of scope for this portfolio slice.

## Client Approval Questions

- Can players develop remotely from the portfolio, or only when standing on a
  property or a special shop/importadora space?
- Is development truly one increment per action, or can a player buy multiple
  machine lots at once?
- If an ordered development becomes invalid because ownership changed, should
  the invalid order be refunded as assumed here, transferred with the terrain,
  or delivered to the new owner?
- Must Importadora ownership unlock equipment purchases before anyone can
  develop?
- If Importadora commissions exist, are they paid before or after bank purchase
  splits?
- Should transferred terrain keep development after bankruptcy/game over?

## Protocol Shape

### Snapshot

Add `terrain_developments` and `development_orders`:

```json
{
  "terrain_developments": [
    {
      "space_id": "terrain_asuncion_1",
      "level": 2,
      "has_container": true,
      "machine_lot_count": 1
    }
  ],
  "development_orders": [
    {
      "order_id": "order_1",
      "player_id": "player_1",
      "space_id": "terrain_asuncion_1",
      "development_kind": "container",
      "price_eva": 2,
      "target_level": 1,
      "created_revision": 9
    }
  ]
}
```

Only non-zero terrain development rows need to be present. Missing terrain means
level `0`. Development order rows represent paid, not-yet-installed equipment
and are ordered per player.

### Available Actions

Keep global `available_actions` simple:

- include `request_order_development` when the local player can add at least one
  valid affordable owned terrain step to their orders
- include `request_roll` only after the active player's start-of-turn delivery
  has completed

The server remains authoritative and validates the requested `space_id`.

`request_order_development` is valid when:

- the match is active
- the player is active, not `game_over`
- the player owns the requested terrain
- the terrain can accept the next development step
- the player can afford the next order immediately
- the player is either not the active turn player, or is the active player
  before rolling

`request_order_development` is invalid during that player's own post-roll
resolution phase, including pending rent/card/property decisions and the normal
end-turn window.

### Command

```json
{
  "type": "request_order_development",
  "match_id": "demo",
  "client_id": "browser-1234",
  "player_id": "player_1",
  "seen_revision": 9,
  "payload": {
    "space_id": "terrain_asuncion_1"
  }
}
```

```json
{
### Event

```json
{
  "type": "development_ordered",
  "player_id": "player_1",
  "order_id": "order_1",
  "space_id": "terrain_asuncion_1",
  "development_kind": "container",
  "price_eva": 2,
  "target_level": 1
}
```

```json
{
  "type": "development_order_delivered",
  "player_id": "player_1",
  "space_id": "terrain_asuncion_1",
  "from_level": 1,
  "to_level": 2,
  "development_kind": "machine_lot",
  "price_eva": 1,
  "rent_eva": 2.8
}
```

`development_kind` values:

- `container`
- `machine_lot`

If delivery cancels an invalid paid order, emit:

```json
{
  "type": "development_order_cancelled",
  "player_id": "player_1",
  "order_id": "order_3",
  "space_id": "terrain_texas_1",
  "reason": "property_not_owned",
  "refunded_eva": 2
}
```

### Rejections

Expected server rejection reasons:

- `player_game_over`
- `not_order_owner`
- `rent_payment_required`
- `card_resolution_required`
- `space_not_terrain`
- `property_not_owned`
- `development_maxed`
- `insufficient_eva`
- `invalid_payload`

## Server Work

1. Add `EvanopolisTerrainDevelopment` and `EvanopolisDevelopmentOrder` state
   and snapshot types.
2. Initialize `terrain_developments` as an empty array.
3. Initialize `development_orders` as an empty array.
4. Add helpers:
   - current development for `space_id`
   - next development price/kind
   - rent for terrain at current development level
   - owned developable terrain for a player
5. Add `request_order_development` command handling.
6. Trigger delivery automatically at the start of a player's turn before
   allowing `request_roll`.
7. Update `pendingRentForLanding` to use current development level instead of
   always level `0`.
8. Include development and order state in snapshots.
9. Keep existing `terrain_ownership` shape unchanged for now.
10. Add focused tests for:
   - ordering owned terrain while not active
   - ordering owned terrain while active before roll
   - cannot order during own post-roll resolution phase
   - own pre-roll orders do not deliver until the next turn
   - ordering debits EVA immediately
   - cannot order without enough EVA
   - delivering ordered level 0 to 1 before roll
   - delivering ordered level 1 to 2 before roll
   - rent does not change until delivery
   - invalid orders caused by ownership transfer are refunded on delivery
   - rent uses the developed level
   - cannot order unowned/opponent terrain
   - cannot order beyond level 5

## Godot Client Work

1. Enable the existing `Portfolio` button.
2. Create a dedicated `PortfolioPanel` scene rather than reusing the property
   decision panel.
3. Panel sections:
   - owned terrain list grouped by city
   - selected terrain details
   - current level, container status, machine lot count
   - current rent and next rent
   - next development cost
   - primary develop button
   - close button
4. Wire the portfolio button to open/close the panel for the local player.
5. Allow adding ordered steps when `request_order_development` is available.
6. Show ordered steps separately from already-built development.
7. Disable order buttons when:
   - the tile is maxed
   - balance is insufficient
   - the tile is not owned by the local player
8. Show paid in-transit orders separately from installed development.
9. Send `request_order_development`.
10. Refresh board containers from `terrain_developments`:
   - level 0: no container
   - level 1: container with 0 machine lots
   - level 2-5: container with 1-4 lots
11. Update tile rent labels/faces to show current development rent.

## Suggested Slices

### 0013 - Terrain Development Protocol

Server-only. Add development state, paid order state, order command, automatic
pre-roll delivery, rent calculation, schema docs, and tests. No Godot UI yet.

### 0014 - Portfolio Panel Mockup

Godot-only. Enable the Portfolio button and show a local panel using snapshot
data, including built development and ordered development. No command dispatch
yet.

### 0015 - Portfolio Development Integration

Wire the panel to order commands, update board containers, update
rent labels, and add Godot tests.

### 0016 - Development Polish And Client Questions

Improve panel layout, empty states, maxed states, insufficient-EVA states, and
capture client decisions about Importadora gating/commissions.

## Risks

- This touches turn flow, rent calculation, dynamic board rendering, and a new
  UI surface, so it should not be one giant commit.
- If we implement Importadora gates now, special-property ownership must be
  implemented first, expanding scope significantly.
- Rent values are decimal EVA, so all new money logic must continue using the
  existing one-decimal rounding policy.
- The current `server_client_main.gd` is already large; the portfolio panel
  should own its own rendering and interaction logic where possible.
