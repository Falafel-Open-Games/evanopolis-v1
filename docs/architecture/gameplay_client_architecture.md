# Gameplay Client Architecture

This note defines how the Godot client should be organized before real
gameplay work starts.

The core decision: Godot is a graphical client for server-authoritative game
state. It renders state, presents animations, and sends player intent. It does
not decide authoritative game events.

## Authority Boundary

The multiplayer server owns:
- match creation and lifecycle
- player identities and turn order
- dice outcomes
- player positions
- terrain and special-property ownership
- terrain development
- EVA balances and all money transfers
- cards, jail, jackpot, bankruptcy, endgame, and ranking
- validation of every player action

The Godot client owns:
- scene composition
- local input collection
- visual board presentation
- pawn, container, dice, camera, and UI animation
- rendering the latest accepted game state from the server
- showing pending/disabled controls based on server-provided action options

The Godot client may temporarily show local presentation state, such as a button
press, camera focus, hover highlight, or roll animation. That state must be
replaceable by the next server snapshot without changing the authoritative match
result.

## Launch And Lobby Boundary

For the web target, the HTML shell owns launch and lobby-style configuration:

- server URL
- match id
- client id/token
- language
- staging/debug flags

Godot receives those values and behaves as the game client. It should not become
the primary place for selecting environments or creating/joining matches unless
the product later explicitly needs an in-game lobby.

The exported Godot build starts at `res://game/bootstrap-main.tscn`. The
bootstrap scene chooses between:

- `scene=review`: `res://game/game-main.tscn`
- `scene=server-client`: `res://game/server-client-main.tscn`

The initial server-connected Godot scene reads:

- `window.EVANOPOLIS_CLIENT_CONFIG` in web builds
- URL query params in web builds
- command-line user args in local/native runs
- local defaults when neither source is present

Expected web iframe shape:

```text
game/index.html?scene=server-client&server_url=ws://127.0.0.1:8788/match&match_id=demo&client_id=browser-client&language=en&auto_join=1
```

Local Godot runs can override the same values with:

```bash
godot --path godot --scene res://game/server-client-main.tscn -- \
  --server-url=ws://127.0.0.1:8788/match \
  --match-id=demo \
  --client-id=godot-client-a \
  --language=en
```

## Client Data Flow

The target flow is:

1. Server sends a match snapshot or accepted event.
2. Client stores the snapshot in a small local view model.
3. Client applies the view model to visual layers.
4. Player input creates an intent command.
5. Client sends the command to the server.
6. Server validates, updates authoritative state, and broadcasts the result.
7. Client updates visuals from the server result.

The client should avoid direct gameplay mutations such as "buy this terrain",
"charge rent", or "move by dice total". Instead, it should send intent names
like "request_roll", "request_purchase", or "request_end_turn" and wait for the
server result.

On first snapshot hydration after loading or forced resync, the client may snap
camera presentation to the post-landing focus state when the local active player
has already rolled. This is presentation recovery only: the client does not
replay dice, synthesize events, or mutate authoritative state.

## Godot Module Responsibilities

Keep visual modules narrow:

- `GameMain`: scene composition and high-level wiring only.
- `PlayerPawnLayer`: creates pawns and places them from player position state.
- `ContainerLayer`: creates container props and places them from terrain
  development state.
- `DiceController`: presents server-provided dice values.
- `BoardCameraController`: focuses the board based on selected or active space.
- UI controllers: render action options and send player intent commands.

Do not put rule decisions in visual modules. A visual module can assert that
state is structurally valid, but it should not decide whether an action is legal.

## Property Landing Panel Boundary

The property landing panel is a reusable Godot UI component fed by server rule
metadata plus client presentation mapping. It currently reuses the original
purchase panel scene for purchase, rent, and self-owned terrain states.

The server definition owns rule facts used by the panel:
- terrain labels and localized labels
- terrain purchase prices
- development/rent rows
- container and machine-lot prices

The Godot client owns presentation choices:
- mapping terrain `group_id` to the board-matched accent color
- mapping player ids to pawn colors for ownership status dots
- panel layout, typography, and button styling
- when to reveal or hide the visual drawer around server event presentation

For the current playable-demo slice, the server-connected Godot client shows
the panel after the local active player has rolled, pawn movement presentation
has completed, and the landing space is a terrain with a relevant server
action.

Current terrain panel modes:

- Unowned terrain: status `Available`, primary action `BUY`, secondary action
  `PASS`. Pressing BUY sends `request_purchase_property`; PASS only hides the
  local panel while `request_end_turn` remains available.
- Terrain owned by another player: status `Owned by Player N`, owner-colored
  status dot, primary action `PAY RENT`, secondary action hidden. Pressing PAY
  RENT sends `request_pay_rent`; `request_end_turn` is unavailable until the
  server clears `pending_rent`.
- Terrain owned by the local active player: headline `Your terrain`, base-rent
  status line, owner-colored status dot, primary action `END TURN`, secondary
  action hidden. No extra acknowledgement command is introduced.

The current slice records terrain ownership and rent obligations. It does not
yet enforce EVA balances, affordability, or money transfers.

## Client-Side State Shape

The Godot client should keep a compact mirror of server state for rendering:

- `match_id`
- `ruleset_id`
- `revision`
- `local_player_id`
- `active_player_id`
- `phase`
- `players`
- static `spaces` from `match_definition`
- `terrain_developments`
- `terrain_ownership`
- `pending_rent`
- `special_property_ownership`
- `dice`
- `available_actions`

The `revision` lets the client ignore stale messages and attach commands to the
state the player saw when they acted.

## Intents, Not Events

Client-to-server messages should describe player intent:

- `request_roll`
- `request_purchase_property`
- `request_purchase_container`
- `request_purchase_machine_lot`
- `request_card_choice`
- `request_end_turn`

Server-to-client messages should describe accepted results:

- `match_definition`
- `match_snapshot`
- `match_event` payloads such as `dice_rolled`, `player_moved`,
  `property_purchased`, `terrain_developed`, `rent_paid`, `card_resolved`, and
  `turn_ended`

Names can change later, but the distinction should remain: the client requests,
the server decides.

## Debug Mode

Current debug controls directly mutate visible pawns, dice, and containers. That
is acceptable while validating presentation, but those controls should stay
clearly separate from real gameplay.

Debug shortcuts are temporary development tools, not client features. They do
not need backward compatibility, and they can be deleted or replaced as the real
client architecture takes shape.

As real gameplay starts, debug controls should evolve toward one of these forms:
- load a canned server snapshot fixture
- replay a canned server event sequence
- send fake intent commands to a local mock server adapter
- expose isolated visual tuning controls for development builds

Avoid making debug controls the foundation for real rules. Debug tooling should
be decoupled enough to turn off for production builds without changing the main
client flow.

## Suggested Next Refactor

The first code refactor should split `game_main.gd` into composition plus a
non-authoritative presentation adapter:

- `game_client_view_model.gd`: stores the latest server-shaped render state.
- `game_presentation_controller.gd`: applies that state to pawn, container,
  dice, camera, and UI layers.
- `debug_presentation_driver.gd`: keeps current keyboard debug behavior isolated
  from production gameplay wiring until it is deleted or replaced by fixture
  playback.

This lets the existing visual work continue while creating a clean place for
future network snapshots and server event playback.

## Rules Policy

The normalized rules spec remains the source for game intent. Any unresolved
rule must not become hidden client behavior.

Use these tags when needed:
- `CLIENT_DECISION_REQUIRED`
- `TEMPORARY_V1_ASSUMPTION`
- `NOT_IMPLEMENTED`

Authoritative rule implementation belongs on the server. The Godot client can
mirror enough of the rule vocabulary to render state and label actions, but it
should not be trusted to enforce game outcomes.
