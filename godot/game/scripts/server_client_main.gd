# ---
# summary: Wires the approved board presentation to the server-authoritative protocol.
# ---
extends Node3D

const BoardCameraControllerScript: GDScript = preload("res://game/scripts/board_camera_controller.gd")
const ContainerLayerScript: GDScript = preload("res://game/scripts/container_layer.gd")
const DiceControllerScript: GDScript = preload("res://game/scripts/dice_controller.gd")
const GameClientViewModelScript: GDScript = preload("res://game/scripts/game_client_view_model.gd")
const GameServerClientScript: GDScript = preload("res://game/scripts/game_server_client.gd")
const GameServerConfigScript: GDScript = preload("res://game/scripts/game_server_config.gd")
const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const PropertyTileFaceLayerScript: GDScript = preload("res://game/scripts/property_tile_face_layer.gd")
const PropertyDecisionPanelScene: PackedScene = preload("res://game/ui/property-decision-panel.tscn")
const CardResolutionPanelScene: PackedScene = preload("res://game/ui/card-resolution-panel.tscn")
const PlayerStatusBarScene: PackedScene = preload("res://game/ui/player-status-bar.tscn")
const PortfolioPanelScene: PackedScene = preload("res://game/ui/portfolio-panel.tscn")
const RegionLabelChairControllerScript: GDScript = preload("res://game/scripts/region_label_chair_controller.gd")
const ServerEventPresentationQueueScript: GDScript = preload("res://game/scripts/server_event_presentation_queue.gd")
const ToastPresenterScript: GDScript = preload("res://game/scripts/toast_presenter.gd")
const LuckCardIcon: Texture2D = preload("res://assets/noun-luck-4700339-white.svg")
const DestinyCardIcon: Texture2D = preload("res://assets/noun-illuminati-6660364-white.svg")
const StatusBarPropertyFocusAlpha: float = 0.16
const TerrainAccentColors: Dictionary[String, Color] = {
    "caracas": Color(0.63, 0.80, 0.96, 1.0),
    "asuncion": Color(0.64, 0.83, 0.55, 1.0),
    "ciudad_del_este": Color(0.78, 0.73, 0.33, 1.0),
    "minsk": Color(0.74, 0.46, 0.22, 1.0),
    "siberia": Color(0.80, 0.30, 0.30, 1.0),
    "texas": Color(0.62, 0.42, 0.78, 1.0),
}

var board_camera_controller: Variant
var client_status: String = "not_started"
var config: Variant
var container_layer: Variant
var dice_controller: Variant
var has_hydrated_snapshot_camera: bool = false
var game_server_client: Variant
var has_sent_join: bool = false
var is_synchronizing: bool = false
var player_pawn_layer: Variant
var presentation_queue: Variant
var card_panel_primary_command: String = ""
var card_resolution_panel: Variant
var property_panel_primary_command: String = ""
var property_decision_panel: Variant
var property_tile_face_layer: Variant
var player_status_bar: Variant
var portfolio_panel: Variant
var region_label_chair_controller: Variant
var server_overlay: CanvasLayer
var toast_presenter: Object
var view_model: Variant

@onready var tiles: Node3D = $BoardRoot/Tiles
@onready var pawns: Node3D = $BoardRoot/Pawns
@onready var containers: Node3D = $BoardRoot/Containers
@onready var flags: Node3D = $BoardRoot/Flags
@onready var dice_root: Node3D = $BoardRoot/Dices
@onready var die_a: Node3D = $BoardRoot/Dices/D6A
@onready var die_b: Node3D = $BoardRoot/Dices/D6B
@onready var camera_rig: Node3D = $CameraRig
@onready var camera: Camera3D = $CameraRig/Camera3D

var status_label: Label
var overlay_panel: PanelContainer


func _ready() -> void:
    config = GameServerConfigScript.new()
    config.load_from_launch_context()
    print("Evanopolis client config: match=%s client=%s player_count=%d buy_in=%d server=%s auto_join=%s debug_overlay=%s" % [
        config.match_id,
        config.client_id,
        config.player_count,
        config.room_buy_in_eva,
        config.server_url,
        str(config.auto_join),
        str(config.debug_overlay)
    ])
    view_model = GameClientViewModelScript.new()
    view_model.configure(config.match_id, config.client_id)

    _create_board_camera_controller()
    _create_dice_controller()
    _create_player_pawn_layer([0, 0, 0])
    _create_property_tile_face_layer()
    _create_presentation_queue()
    _create_container_layer()
    _create_region_label_chair_controller()
    _create_overlay()
    _create_server_client()

    player_pawn_layer.update_pawn_positions(tiles)
    board_camera_controller.focus_on_space(0, true)
    _refresh_overlay()

    if config.auto_join:
        game_server_client.connect_to_server(config.server_url)


func _create_board_camera_controller() -> void:
    board_camera_controller = BoardCameraControllerScript.new()
    board_camera_controller.name = "BoardCameraController"
    add_child(board_camera_controller)
    board_camera_controller.setup(tiles, camera_rig, camera)


func _create_dice_controller() -> void:
    dice_controller = DiceControllerScript.new()
    dice_controller.name = "DiceController"
    add_child(dice_controller)
    dice_controller.setup(dice_root, die_a, die_b, camera)


func _create_player_pawn_layer(initial_tile_indices: Array[int]) -> void:
    player_pawn_layer = PlayerPawnLayerScript.new()
    player_pawn_layer.name = "ServerPlayerPawns"
    pawns.add_child(player_pawn_layer)
    player_pawn_layer.setup_players(initial_tile_indices)


func _create_property_tile_face_layer() -> void:
    property_tile_face_layer = PropertyTileFaceLayerScript.new()
    property_tile_face_layer.name = "PropertyTileFaceLayer"
    add_child(property_tile_face_layer)
    property_tile_face_layer.setup(tiles)


func _create_presentation_queue() -> void:
    presentation_queue = ServerEventPresentationQueueScript.new()
    presentation_queue.name = "ServerEventPresentationQueue"
    add_child(presentation_queue)
    presentation_queue.setup(tiles, dice_controller, player_pawn_layer, board_camera_controller)
    presentation_queue.busy_changed.connect(_on_presentation_busy_changed)
    presentation_queue.event_presented.connect(_on_presentation_event_presented)
    presentation_queue.resync_started.connect(_on_presentation_resync_started)


func _create_container_layer() -> void:
    container_layer = ContainerLayerScript.new()
    container_layer.name = "ServerPropertyContainers"
    containers.add_child(container_layer)
    container_layer.setup(tiles)


func _create_region_label_chair_controller() -> void:
    region_label_chair_controller = RegionLabelChairControllerScript.new()
    region_label_chair_controller.name = "RegionLabelChairController"
    add_child(region_label_chair_controller)
    region_label_chair_controller.setup(flags, camera_rig)


func _create_server_client() -> void:
    game_server_client = GameServerClientScript.new()
    game_server_client.name = "GameServerClient"
    add_child(game_server_client)
    game_server_client.connected.connect(_on_server_connected)
    game_server_client.disconnected.connect(_on_server_disconnected)
    game_server_client.status_changed.connect(_on_server_status_changed)
    game_server_client.message_received.connect(_on_server_message_received)
    game_server_client.protocol_error.connect(_on_server_protocol_error)


func _create_overlay() -> void:
    server_overlay = CanvasLayer.new()
    server_overlay.name = "ServerClientOverlay"
    add_child(server_overlay)

    overlay_panel = PanelContainer.new()
    overlay_panel.position = Vector2(12, 12)
    server_overlay.add_child(overlay_panel)

    var margin: MarginContainer = MarginContainer.new()
    margin.add_theme_constant_override("margin_left", 10)
    margin.add_theme_constant_override("margin_top", 10)
    margin.add_theme_constant_override("margin_right", 10)
    margin.add_theme_constant_override("margin_bottom", 10)
    overlay_panel.add_child(margin)

    var layout: VBoxContainer = VBoxContainer.new()
    layout.add_theme_constant_override("separation", 8)
    margin.add_child(layout)

    status_label = Label.new()
    status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    layout.add_child(status_label)

    _create_player_status_bar()
    _create_portfolio_panel()
    _create_property_decision_panel()
    _create_card_resolution_panel()
    _create_toast_presenter()


func _create_player_status_bar() -> void:
    player_status_bar = PlayerStatusBarScene.instantiate()
    assert(player_status_bar != null)
    player_status_bar.name = "PlayerStatusBar"
    player_status_bar.anchor_left = 1.0
    player_status_bar.anchor_top = 0.0
    player_status_bar.anchor_right = 1.0
    player_status_bar.anchor_bottom = 0.0
    player_status_bar.offset_left = -448.0
    player_status_bar.offset_top = 18.0
    player_status_bar.offset_right = -28.0
    player_status_bar.offset_bottom = 76.0
    player_status_bar.visible = false
    player_status_bar.primary_command_pressed.connect(_on_player_status_bar_command_pressed)
    player_status_bar.portfolio_pressed.connect(_on_portfolio_pressed)
    server_overlay.add_child(player_status_bar)


func _create_portfolio_panel() -> void:
    portfolio_panel = PortfolioPanelScene.instantiate()
    assert(portfolio_panel != null)
    portfolio_panel.name = "PortfolioPanel"
    portfolio_panel.anchor_left = 1.0
    portfolio_panel.anchor_top = 0.0
    portfolio_panel.anchor_right = 1.0
    portfolio_panel.anchor_bottom = 0.0
    portfolio_panel.offset_left = -448.0
    portfolio_panel.offset_top = 84.0
    portfolio_panel.offset_right = -28.0
    portfolio_panel.offset_bottom = 434.0
    portfolio_panel.visible = false
    portfolio_panel.order_development_pressed.connect(_on_portfolio_order_development_pressed)
    server_overlay.add_child(portfolio_panel)


func _create_property_decision_panel() -> void:
    property_decision_panel = PropertyDecisionPanelScene.instantiate()
    assert(property_decision_panel != null)
    property_decision_panel.name = "PropertyDecisionPanel"
    property_decision_panel.anchor_left = 1.0
    property_decision_panel.anchor_top = 1.0
    property_decision_panel.anchor_right = 1.0
    property_decision_panel.anchor_bottom = 1.0
    property_decision_panel.offset_right = -28.0
    property_decision_panel.offset_bottom = -28.0
    property_decision_panel.visible = false
    property_decision_panel.primary_action_pressed.connect(_on_property_primary_action_pressed)
    property_decision_panel.secondary_action_pressed.connect(_on_property_secondary_action_pressed)
    server_overlay.add_child(property_decision_panel)


func _create_card_resolution_panel() -> void:
    card_resolution_panel = CardResolutionPanelScene.instantiate()
    assert(card_resolution_panel != null)
    card_resolution_panel.name = "CardResolutionPanel"
    card_resolution_panel.anchor_left = 1.0
    card_resolution_panel.anchor_top = 1.0
    card_resolution_panel.anchor_right = 1.0
    card_resolution_panel.anchor_bottom = 1.0
    card_resolution_panel.offset_left = -632.0
    card_resolution_panel.offset_top = -188.0
    card_resolution_panel.offset_right = -28.0
    card_resolution_panel.offset_bottom = -28.0
    card_resolution_panel.visible = false
    card_resolution_panel.primary_action_pressed.connect(_on_card_resolution_pressed)
    server_overlay.add_child(card_resolution_panel)


func _create_toast_presenter() -> void:
    toast_presenter = ToastPresenterScript.new()
    toast_presenter.call("setup", server_overlay)


func _on_server_connected() -> void:
    if has_sent_join:
        return

    has_sent_join = true
    print("Evanopolis client joining match: match=%s client=%s player_count=%d buy_in=%d seed=%s" % [
        config.match_id,
        config.client_id,
        config.player_count,
        config.room_buy_in_eva,
        config.random_seed
    ])
    game_server_client.join_match(
        config.match_id,
        config.client_id,
        config.player_count,
        config.room_buy_in_eva,
        config.random_seed
    )


func _on_server_disconnected() -> void:
    _refresh_overlay()


func _on_server_status_changed(next_status: String) -> void:
    client_status = next_status
    _refresh_overlay()


func _on_server_protocol_error(reason: String) -> void:
    view_model.last_error = reason
    _refresh_overlay()


func _on_presentation_busy_changed(_is_busy: bool) -> void:
    if not presentation_queue.is_busy():
        _apply_snapshot_to_presentation(false)
    _refresh_overlay()


func _on_presentation_event_presented(event_dictionary: Dictionary) -> void:
    if str(event_dictionary.get("type", "")) == "start_bonus_collected":
        _show_toast_for_event(event_dictionary)


func _on_presentation_resync_started() -> void:
    is_synchronizing = true
    _refresh_overlay()


func _on_server_message_received(message: Dictionary) -> void:
    _print_server_message(message)
    view_model.apply_server_message(message)
    var forced_snapshot_revision: int = _apply_event_to_presentation(message)
    _apply_snapshot_to_presentation(_should_force_snapshot_sync(message, forced_snapshot_revision))
    _refresh_overlay()


func _on_roll_pressed() -> void:
    _hide_interaction_panels()
    _send_player_command("request_roll")


func _on_player_status_bar_command_pressed(command_type: String) -> void:
    assert(command_type == "request_roll" or command_type == "request_end_turn")
    _hide_interaction_panels()
    _send_player_command(command_type)


func _on_portfolio_pressed() -> void:
    assert(portfolio_panel != null)
    portfolio_panel.visible = not portfolio_panel.visible
    if portfolio_panel.visible:
        _refresh_portfolio_panel()


func _on_portfolio_order_development_pressed(space_id: String) -> void:
    assert(space_id != "")
    _send_player_command_with_payload("request_order_development", {
        "space_id": space_id,
    })


func _on_end_turn_pressed() -> void:
    _hide_interaction_panels()
    _send_player_command("request_end_turn")


func _on_property_primary_action_pressed() -> void:
    var command_type: String = property_panel_primary_command
    _hide_property_decision_panel()
    assert(command_type != "")
    _send_player_command(command_type)


func _on_card_resolution_pressed() -> void:
    var command_type: String = card_panel_primary_command
    _hide_card_resolution_panel()
    assert(command_type != "")
    _send_player_command(command_type)


func _on_property_secondary_action_pressed() -> void:
    _hide_property_decision_panel()
    if view_model.has_action("request_end_turn"):
        _send_player_command("request_end_turn")


func _hide_interaction_panels() -> void:
    _hide_property_decision_panel()
    _hide_card_resolution_panel()


func _hide_property_decision_panel() -> void:
    if property_decision_panel != null:
        property_decision_panel.visible = false
    property_panel_primary_command = ""


func _hide_card_resolution_panel() -> void:
    if card_resolution_panel != null:
        card_resolution_panel.visible = false
    card_panel_primary_command = ""


func _send_player_command(command_type: String) -> void:
    _send_player_command_with_payload(command_type, {})


func _send_player_command_with_payload(command_type: String, payload: Dictionary) -> void:
    if presentation_queue.is_busy():
        view_model.last_error = "presentation_busy:%s" % command_type
        print("Evanopolis client skipped command while presenting: %s" % command_type)
        _refresh_overlay()
        return

    if not view_model.has_action(command_type):
        view_model.last_error = "action_not_available:%s" % command_type
        print("Evanopolis client skipped command: %s actions=%s" % [
            command_type,
            view_model.get_available_actions_text()
        ])
        _refresh_overlay()
        return

    view_model.last_sent_command = command_type
    view_model.last_sent_command_payload = payload.duplicate(true)
    var command: Dictionary = view_model.build_player_command(command_type, payload)
    print("Evanopolis client sending command: %s revision=%d player=%s" % [
        command_type,
        view_model.revision,
        view_model.local_player_id
    ])
    game_server_client.send_command(command)
    _refresh_overlay()


func _apply_snapshot_to_presentation(force_immediate: bool) -> void:
    if not view_model.has_snapshot():
        return

    var snapshot_revision: int = int(view_model.snapshot.get("revision", 0))
    if not force_immediate and presentation_queue.is_busy():
        return
    if not force_immediate and snapshot_revision < presentation_queue.get_target_revision():
        return

    if force_immediate:
        presentation_queue.cancel_and_resync_to_revision(snapshot_revision)

    var positions: Array[int] = view_model.get_player_positions()
    if positions.is_empty():
        return

    if player_pawn_layer.player_pawns.size() != positions.size():
        player_pawn_layer.setup_players(positions)
    else:
        player_pawn_layer.player_tile_indices = positions.duplicate()

    var visible_player_count: int = clampi(view_model.get_joined_player_count(), 1, positions.size())
    player_pawn_layer.set_visible_player_count(visible_player_count)
    player_pawn_layer.update_pawn_positions(tiles)
    _refresh_property_tile_faces_from_snapshot()
    _refresh_containers_from_snapshot()
    _hydrate_camera_from_snapshot(force_immediate)

    if force_immediate:
        presentation_queue.reset_player_race_distances_from_snapshot(view_model.snapshot.get("players", []))
    else:
        presentation_queue.initialize_player_race_distances_from_snapshot(view_model.snapshot.get("players", []))
        presentation_queue.set_visual_revision(snapshot_revision)

    var dice: Dictionary = view_model.get_dice()
    if not dice.is_empty() and not dice_controller.is_presenting():
        dice_controller.set_dice_values(int(dice["die_1"]), int(dice["die_2"]))

    is_synchronizing = false


func _focus_active_player_from_snapshot() -> void:
    var active_player_index: int = _player_index_from_id(view_model.active_player_id)
    if active_player_index < 0 or active_player_index >= player_pawn_layer.player_tile_indices.size():
        return

    var active_space_index: int = player_pawn_layer.player_tile_indices[active_player_index]
    board_camera_controller.focus_on_space(active_space_index, true)


func _refresh_property_tile_faces_from_snapshot() -> void:
    var spaces: Array = view_model.definition.get("spaces", [])
    for space_value: Variant in spaces:
        assert(space_value is Dictionary)
        var space: Dictionary = space_value as Dictionary
        if str(space.get("kind", "")) != "terrain":
            continue

        var space_index: int = int(space.get("index", -1))
        var owner_player_id: String = view_model.get_owner_player_id_for_space(str(space.get("space_id", "")))
        if owner_player_id == "":
            property_tile_face_layer.set_property_available(space_index)
        else:
            property_tile_face_layer.set_property_owned(
                space_index,
                _rent_for_development_level(
                    space,
                    int(view_model.get_terrain_development(str(space.get("space_id", ""))).get("level", 0))
                ),
                _player_color_for_id(owner_player_id)
            )


func _refresh_containers_from_snapshot() -> void:
    container_layer.clear_all_containers()

    var developments: Array = view_model.snapshot.get("terrain_developments", [])
    for development_value: Variant in developments:
        assert(development_value is Dictionary)
        var development: Dictionary = development_value as Dictionary
        var level: int = int(development.get("level", 0))
        if level <= 0:
            continue

        var space_id: String = str(development.get("space_id", ""))
        var owner_player_id: String = view_model.get_owner_player_id_for_space(space_id)
        if owner_player_id == "":
            continue

        var space: Dictionary = view_model.get_space_definition_by_id(space_id)
        if space.is_empty():
            continue

        var space_index: int = int(space.get("index", -1))
        if space_index < 0:
            continue

        var machine_lot_count: int = int(development.get("machine_lot_count", max(0, level - 1)))
        container_layer.set_container(
            space_index,
            bool(development.get("has_container", true)),
            machine_lot_count,
            _player_color_for_id(owner_player_id)
        )


func _hydrate_camera_from_snapshot(force_immediate: bool) -> void:
    if force_immediate:
        has_hydrated_snapshot_camera = false

    if has_hydrated_snapshot_camera:
        return

    has_hydrated_snapshot_camera = true
    if _should_snap_to_post_landing_snapshot_camera():
        var active_player_index: int = _player_index_from_id(view_model.active_player_id)
        assert(active_player_index >= 0 and active_player_index < player_pawn_layer.player_tile_indices.size())
        var active_space_index: int = player_pawn_layer.player_tile_indices[active_player_index]
        board_camera_controller.snap_to_post_landing_focus(active_space_index)
        return

    if force_immediate:
        _focus_active_player_from_snapshot()


func _should_snap_to_post_landing_snapshot_camera() -> bool:
    if not view_model.is_local_active_player():
        return false

    if not (
        view_model.has_action("request_end_turn")
        or view_model.has_action("request_purchase_property")
        or view_model.has_action("request_pay_rent")
        or view_model.has_action("request_resolve_card")
        or view_model.has_action("request_accept_game_over")
    ):
        return false

    var local_position: int = view_model.get_local_player_position()
    return local_position > 0


func _apply_event_to_presentation(message: Dictionary) -> int:
    if str(message.get("type", "")) != "match_event":
        return 0

    var event: Variant = message.get("event", {})
    if not event is Dictionary:
        return 0

    var event_dictionary: Dictionary = event as Dictionary
    event_dictionary["revision"] = int(message.get("revision", event_dictionary.get("revision", 0)))
    if str(event_dictionary.get("type", "")) != "start_bonus_collected":
        _show_toast_for_event(event_dictionary)
    if presentation_queue.enqueue_event(event_dictionary):
        return 0

    presentation_queue.cancel_and_resync_to_revision(presentation_queue.get_visual_revision())
    return 0


func _show_toast_for_event(event_dictionary: Dictionary) -> void:
    var event_type: String = str(event_dictionary.get("type", ""))
    if event_type == "start_bonus_collected":
        _show_start_bonus_toast(event_dictionary)
    elif event_type == "card_resolved":
        _show_card_resolved_toast(event_dictionary)
    elif event_type == "property_purchased":
        _show_property_purchased_toast(event_dictionary)


func _show_start_bonus_toast(event_dictionary: Dictionary) -> void:
    var amount_eva: float = float(event_dictionary.get("amount_eva", 0.0))
    var exact_landing: bool = bool(event_dictionary.get("exact_landing", false))
    var player_label_text: String = _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
    var message: String = ""
    if exact_landing:
        message = "%s landed on SALIDA and collected +%s EVA" % [
            player_label_text,
            _format_eva_number(amount_eva)
        ]
    else:
        message = "%s passed SALIDA and collected +%s EVA" % [
            player_label_text,
            _format_eva_number(amount_eva)
        ]
    toast_presenter.call("show", message)


func _show_card_resolved_toast(event_dictionary: Dictionary) -> void:
    if str(event_dictionary.get("player_id", "")) == view_model.local_player_id:
        return
    if str(event_dictionary.get("effect_type", "")) != "eva_delta":
        return

    var amount_eva: float = float(event_dictionary.get("amount_eva", 0.0))
    if is_zero_approx(amount_eva):
        return

    var player_label_text: String = _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
    var deck_label_text: String = _deck_label(str(event_dictionary.get("deck_id", "")))
    var message: String = ""
    if amount_eva > 0.0:
        message = "%s gained +%s EVA from %s" % [
            player_label_text,
            _format_eva_number(amount_eva),
            deck_label_text,
        ]
    else:
        message = "%s paid %s EVA from %s" % [
            player_label_text,
            _format_eva_number(absf(amount_eva)),
            deck_label_text,
        ]

    toast_presenter.call("show", message)


func _show_property_purchased_toast(event_dictionary: Dictionary) -> void:
    if str(event_dictionary.get("player_id", "")) == view_model.local_player_id:
        return

    var player_label_text: String = _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
    var space_label_text: String = _space_label(str(event_dictionary.get("space_id", ""))).to_upper()
    var price_eva: float = float(event_dictionary.get("price_eva", 0.0))
    var message: String = "%s bought %s for %s EVA" % [
        player_label_text,
        space_label_text,
        _format_eva_number(price_eva),
    ]
    toast_presenter.call("show", message)


func _should_force_snapshot_sync(message: Dictionary, forced_snapshot_revision: int) -> bool:
    if forced_snapshot_revision > 0:
        return true

    if str(message.get("type", "")) != "match_snapshot":
        return false

    var next_snapshot: Variant = message.get("snapshot", {})
    if not next_snapshot is Dictionary:
        return false

    var snapshot_dictionary: Dictionary = next_snapshot as Dictionary
    var snapshot_revision: int = int(snapshot_dictionary.get("revision", 0))
    return (
        is_synchronizing
        or presentation_queue.has_pending_revision_before(snapshot_revision)
    )


func _player_index_from_id(player_id: String) -> int:
    if not player_id.begins_with("player_"):
        return -1

    var player_number: int = int(player_id.trim_prefix("player_"))
    if player_number <= 0:
        return -1

    return player_number - 1


func _print_server_message(message: Dictionary) -> void:
    var message_type: String = str(message.get("type", ""))
    if message_type == "match_snapshot":
        var next_snapshot: Variant = message.get("snapshot", {})
        if next_snapshot is Dictionary:
            var snapshot_dictionary: Dictionary = next_snapshot as Dictionary
            print("Evanopolis client received snapshot: revision=%d phase=%s active=%s actions=%s" % [
                int(snapshot_dictionary.get("revision", 0)),
                str(snapshot_dictionary.get("phase", "")),
                str(snapshot_dictionary.get("active_player_id", "")),
                ", ".join(snapshot_dictionary.get("available_actions", []))
            ])
        return

    if message_type == "match_event":
        var event: Variant = message.get("event", {})
        if event is Dictionary:
            var event_dictionary: Dictionary = event as Dictionary
            if str(event_dictionary.get("type", "")) == "dice_rolled":
                print("Evanopolis client received event: dice_rolled@%d die_1=%d die_2=%d total=%d from=%d to=%d player=%s" % [
                    int(message.get("revision", 0)),
                    int(event_dictionary.get("die_1", 0)),
                    int(event_dictionary.get("die_2", 0)),
                    int(event_dictionary.get("total", 0)),
                    int(event_dictionary.get("from_position", -1)),
                    int(event_dictionary.get("to_position", -1)),
                    str(event_dictionary.get("player_id", ""))
                ])
                return

            print("Evanopolis client received event: %s@%d" % [
                str(event_dictionary.get("type", "")),
                int(message.get("revision", 0))
            ])
        return

    if message_type == "command_rejected":
        print("Evanopolis client command rejected: %s" % str(message.get("reason", "")))
        return

    print("Evanopolis client received message: %s" % message_type)


func _refresh_overlay() -> void:
    if status_label == null:
        return

    overlay_panel.custom_minimum_size = Vector2(360, 132) if config.debug_overlay else Vector2.ZERO
    status_label.visible = config.debug_overlay or is_synchronizing
    if config.debug_overlay:
        _refresh_debug_overlay_text()
    else:
        status_label.text = "Synchronizing..." if is_synchronizing else ""

    var presentation_busy: bool = presentation_queue.is_busy() or is_synchronizing
    overlay_panel.visible = config.debug_overlay or is_synchronizing
    _refresh_card_resolution_panel(presentation_busy)
    _refresh_property_decision_panel(presentation_busy)
    _refresh_player_status_bar(presentation_busy)
    _refresh_portfolio_panel()


func _refresh_player_status_bar(presentation_busy: bool) -> void:
    if player_status_bar == null:
        return

    if view_model.local_player_id == "":
        player_status_bar.visible = false
        _hide_portfolio_panel()
        return

    var player_index: int = view_model.get_local_player_index()
    assert(player_index >= 0 and player_index < PlayerPawnLayerScript.PlayerColors.size())
    player_status_bar.visible = true
    _set_player_status_bar_alpha(StatusBarPropertyFocusAlpha if property_decision_panel.visible else 1.0)
    player_status_bar.set_player_summary(
        _player_label(view_model.local_player_id).to_upper(),
        PlayerPawnLayerScript.PlayerColors[player_index],
        view_model.get_local_player_eva_balance(),
        view_model.get_local_player_owned_property_count()
    )
    if view_model.get_local_player_status() == "game_over":
        player_status_bar.set_game_over_state(true)
        _hide_portfolio_panel()
        return

    if view_model.is_local_winner():
        player_status_bar.set_winner_state(true)
        _hide_portfolio_panel()
        return

    if view_model.has_action("request_roll"):
        player_status_bar.set_primary_command("request_roll", "ROLL", true, presentation_busy)
        return

    if (
        view_model.has_action("request_end_turn")
        and not property_decision_panel.visible
        and not card_resolution_panel.visible
    ):
        player_status_bar.set_primary_command("request_end_turn", "END TURN", true, presentation_busy)
        return

    player_status_bar.set_primary_command("request_roll", "ROLL", false, presentation_busy)


func _set_player_status_bar_alpha(alpha: float) -> void:
    var status_bar_color: Color = player_status_bar.modulate
    status_bar_color.a = alpha
    player_status_bar.modulate = status_bar_color


func _refresh_portfolio_panel() -> void:
    if portfolio_panel == null or not portfolio_panel.visible:
        return
    if not view_model.has_definition() or not view_model.has_snapshot():
        _hide_portfolio_panel()
        return

    portfolio_panel.set_portfolio_data(_build_portfolio_panel_data())


func _hide_portfolio_panel() -> void:
    if portfolio_panel != null:
        portfolio_panel.visible = false


func _build_portfolio_panel_data() -> Dictionary:
    var items: Array[Dictionary] = []
    var balance_eva: float = view_model.get_local_player_eva_balance()
    var can_order_development: bool = view_model.has_action("request_order_development")
    var owned_space_ids: Array[String] = view_model.get_local_player_owned_terrain_space_ids()
    owned_space_ids.sort_custom(_sort_space_ids_by_board_index)
    for space_id: String in owned_space_ids:
        var space: Dictionary = view_model.get_space_definition_by_id(space_id)
        if space.is_empty():
            continue

        var development: Dictionary = view_model.get_terrain_development(space_id)
        var orders: Array[Dictionary] = view_model.get_development_orders_for_space(space_id)
        var delivered_level: int = int(development.get("level", 0))
        var ordered_count: int = orders.size()
        var pending_level: int = delivered_level + ordered_count
        var next_order_price: float = _portfolio_next_order_price(space, pending_level)
        var is_orderable: bool = (
            can_order_development
            and pending_level < 5
            and balance_eva >= next_order_price
        )
        var item: Dictionary = {
            "space_id": space_id,
            "title": _localized_label(space).to_upper(),
            "subtitle": _portfolio_development_subtitle(delivered_level, development),
            "order_status": _portfolio_order_status(orders),
            "level": delivered_level,
            "rent_eva": _rent_for_development_level(space, delivered_level),
            "next_order": _portfolio_next_order_label(space, pending_level),
            "region_color": _accent_color_for_space(space),
            "primary_action": _portfolio_order_button_label(space, pending_level),
            "primary_action_enabled": is_orderable,
        }
        if not is_orderable and pending_level >= 5:
            item["primary_action"] = "MAXED"
        elif not is_orderable and next_order_price > balance_eva:
            item["primary_action"] = "NEED %s EVA" % _format_eva_number(next_order_price)
        elif not can_order_development:
            item["primary_action"] = "ORDER UNAVAILABLE"

        items.append(item)

    return {
        "balance_eva": balance_eva,
        "items": items,
        "order_available": can_order_development,
    }


func _sort_space_ids_by_board_index(left_space_id: String, right_space_id: String) -> bool:
    var left_space: Dictionary = view_model.get_space_definition_by_id(left_space_id)
    var right_space: Dictionary = view_model.get_space_definition_by_id(right_space_id)
    return int(left_space.get("index", 0)) < int(right_space.get("index", 0))


func _portfolio_development_subtitle(level: int, development: Dictionary) -> String:
    if level <= 0:
        return "No delivered development"

    var machine_lot_count: int = int(development.get("machine_lot_count", max(0, level - 1)))
    if level == 1:
        return "Container delivered"

    return "Container + %d machine lot%s" % [
        machine_lot_count,
        "" if machine_lot_count == 1 else "s"
    ]


func _portfolio_order_status(orders: Array[Dictionary]) -> String:
    if orders.is_empty():
        return "No orders in transit"

    var pending_container: bool = false
    var pending_lot_count: int = 0
    for order: Dictionary in orders:
        var development_kind: String = str(order.get("development_kind", ""))
        if development_kind == "container":
            pending_container = true
        elif development_kind == "machine_lot":
            pending_lot_count += 1

    var parts: Array[String] = []
    if pending_container:
        parts.append("container")
    if pending_lot_count > 0:
        parts.append("%d lot%s" % [
            pending_lot_count,
            "" if pending_lot_count == 1 else "s"
        ])
    if parts.is_empty():
        parts.append("%d order%s" % [
            orders.size(),
            "" if orders.size() == 1 else "s"
        ])

    return "In transit: %s" % " + ".join(parts)


func _portfolio_next_order_label(space: Dictionary, pending_level: int) -> String:
    if pending_level >= 5:
        return "Maxed"
    if pending_level <= 0:
        return "Next: container"

    return "Next: lot #%d" % pending_level


func _portfolio_order_button_label(space: Dictionary, pending_level: int) -> String:
    if pending_level <= 0:
        return "ORDER CONTAINER (%s EVA)" % _format_eva_number(space.get("container_price_eva", 0.0))

    return "ORDER LOT #%d (%s EVA)" % [
        pending_level,
        _format_eva_number(space.get("machine_lot_price_eva", 0.0))
    ]


func _portfolio_next_order_price(space: Dictionary, pending_level: int) -> float:
    if pending_level >= 5:
        return INF
    if pending_level <= 0:
        return float(space.get("container_price_eva", 0.0))

    return float(space.get("machine_lot_price_eva", 0.0))


func _rent_for_development_level(space: Dictionary, level: int) -> float:
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        if int(row.get("level", 0)) == level:
            return float(row.get("rent_eva", 0.0))

    return _base_rent_for_space(space)


func _refresh_card_resolution_panel(presentation_busy: bool) -> void:
    if card_resolution_panel == null:
        return
    if presentation_busy or not view_model.has_snapshot():
        _hide_card_resolution_panel()
        return
    if not view_model.is_local_active_player():
        _hide_card_resolution_panel()
        return

    var pending_card: Dictionary = view_model.get_pending_card_resolution()
    if pending_card.is_empty():
        if view_model.has_action("request_end_turn") and _is_local_player_on_card_space():
            card_panel_primary_command = "request_end_turn"
            card_resolution_panel.set_card_data(_build_resolved_card_panel_data())
            card_resolution_panel.visible = true
            return

        _hide_card_resolution_panel()
        return

    if str(pending_card.get("player_id", "")) != view_model.local_player_id:
        _hide_card_resolution_panel()
        return

    if view_model.has_action("request_resolve_card"):
        card_panel_primary_command = "request_resolve_card"
        card_resolution_panel.set_card_data(_build_card_panel_data(pending_card, false))
        card_resolution_panel.visible = true
        return

    if view_model.has_action("request_accept_game_over"):
        card_panel_primary_command = "request_accept_game_over"
        card_resolution_panel.set_card_data(_build_card_panel_data(pending_card, true))
        card_resolution_panel.visible = true
        return

    _hide_card_resolution_panel()


func _refresh_property_decision_panel(presentation_busy: bool) -> void:
    if property_decision_panel == null:
        return
    if presentation_busy or not view_model.has_definition() or not view_model.has_snapshot():
        _hide_property_decision_panel()
        return
    if not view_model.is_local_active_player():
        _hide_property_decision_panel()
        return

    var pending_card: Dictionary = view_model.get_pending_card_resolution()
    if not pending_card.is_empty() and str(pending_card.get("player_id", "")) == view_model.local_player_id:
        _hide_property_decision_panel()
        return
    if view_model.has_action("request_end_turn") and _is_local_player_on_card_space():
        _hide_property_decision_panel()
        return

    var local_position: int = view_model.get_local_player_position()
    if local_position < 0:
        _hide_property_decision_panel()
        return

    var space: Dictionary = view_model.get_space_definition(local_position)
    if str(space.get("kind", "")) != "terrain":
        _hide_property_decision_panel()
        return

    var space_id: String = str(space.get("space_id", ""))
    var pending_rent: Dictionary = view_model.get_pending_rent()
    if (
        not pending_rent.is_empty()
        and str(pending_rent.get("space_id", "")) == space_id
        and str(pending_rent.get("payer_player_id", "")) == view_model.local_player_id
    ):
        if view_model.has_action("request_pay_rent"):
            property_panel_primary_command = "request_pay_rent"
            property_decision_panel.set_property_data(_build_rent_due_panel_data(space, pending_rent))
            property_decision_panel.visible = true
            return
        if view_model.has_action("request_accept_game_over"):
            property_panel_primary_command = "request_accept_game_over"
            property_decision_panel.set_property_data(_build_unaffordable_rent_panel_data(space, pending_rent))
            property_decision_panel.visible = true
            return

    var owner_player_id: String = view_model.get_owner_player_id_for_space(space_id)
    if owner_player_id == "":
        if not view_model.has_action("request_purchase_property"):
            if not view_model.has_action("request_end_turn"):
                _hide_property_decision_panel()
                return
            property_panel_primary_command = "request_end_turn"
            property_decision_panel.set_property_data(_build_unaffordable_property_panel_data(space))
            property_decision_panel.visible = true
            return
        property_panel_primary_command = "request_purchase_property"
        property_decision_panel.set_property_data(_build_available_property_panel_data(space))
        property_decision_panel.visible = true
        return

    if owner_player_id == view_model.local_player_id and view_model.has_action("request_end_turn"):
        property_panel_primary_command = "request_end_turn"
        property_decision_panel.set_property_data(_build_self_owned_property_panel_data(space, owner_player_id))
        property_decision_panel.visible = true
        return

    if owner_player_id != "" and view_model.has_action("request_end_turn"):
        property_panel_primary_command = "request_end_turn"
        property_decision_panel.set_property_data(_build_rent_paid_panel_data(space, owner_player_id))
        property_decision_panel.visible = true
        return

    _hide_property_decision_panel()


func _build_card_panel_data(pending_card: Dictionary, danger: bool) -> Dictionary:
    var deck_id: String = str(pending_card.get("deck_id", "destiny"))
    var card_id: String = str(pending_card.get("card_id", ""))
    var effect: Dictionary = _card_effect(pending_card)
    var amount_eva: float = float(effect.get("amount_eva", 0.0))
    var effect_text: String = _format_card_effect_text(amount_eva)
    if danger:
        effect_text = "INSUFFICIENT EVA"

    return {
        "deck_id": deck_id,
        "deck_label": _card_deck_label(deck_id),
        "title": _card_title(card_id),
        "body": _card_body(card_id, amount_eva, danger),
        "effect_text": effect_text,
        "primary_action": "ACCEPT GAME OVER" if danger else "APPLY CARD",
        "danger": danger,
        "icon": LuckCardIcon if deck_id == "luck" else DestinyCardIcon,
    }


func _build_resolved_card_panel_data() -> Dictionary:
    var event: Dictionary = _latest_card_resolved_event_for_local_player()
    var deck_id: String = str(event.get("deck_id", _deck_id_for_local_card_space()))
    var card_id: String = str(event.get("card_id", ""))
    var amount_eva: float = float(event.get("amount_eva", 0.0))
    var effect_text: String = "CARD RESOLVED" if event.is_empty() else _format_card_effect_text(amount_eva)
    return {
        "deck_id": deck_id,
        "deck_label": _card_deck_label(deck_id),
        "title": "Card Resolved" if card_id == "" else _card_title(card_id),
        "body": _resolved_card_body(card_id),
        "effect_text": effect_text,
        "primary_action": "END TURN",
        "icon": LuckCardIcon if deck_id == "luck" else DestinyCardIcon,
    }


func _latest_card_resolved_event_for_local_player() -> Dictionary:
    var event: Variant = view_model.latest_event.get("event", {})
    if not event is Dictionary:
        return {}

    var event_dictionary: Dictionary = event as Dictionary
    if (
        str(event_dictionary.get("type", "")) == "card_resolved"
        and str(event_dictionary.get("player_id", "")) == view_model.local_player_id
    ):
        return event_dictionary

    return {}


func _resolved_card_body(card_id: String) -> String:
    if card_id == "":
        return "The card effect has been applied. End your turn when ready."

    return "The card effect has been applied. End your turn when ready."


func _card_effect(pending_card: Dictionary) -> Dictionary:
    var effect: Variant = pending_card.get("effect", {})
    if effect is Dictionary:
        return effect as Dictionary

    return {}


func _card_deck_label(deck_id: String) -> String:
    if deck_id == "luck":
        return "SUERTE"

    return "DESTINO"


func _card_title(card_id: String) -> String:
    if card_id == "luck_mining_bonus":
        return "Mining Bonus"
    if card_id == "luck_unexpected_client":
        return "Unexpected Client"
    if card_id == "luck_market_rally":
        return "Market Rally"
    if card_id == "destiny_operating_tax":
        return "Operating Tax"
    if card_id == "destiny_urgent_maintenance":
        return "Urgent Maintenance"
    if card_id == "destiny_favorable_market":
        return "Favorable Market"

    return "Card Drawn"


func _card_body(card_id: String, amount_eva: float, danger: bool) -> String:
    if danger:
        return "The payment is larger than your available EVA balance."
    if card_id == "luck_mining_bonus":
        return "A lucky production window pays out from the bank."
    if card_id == "luck_unexpected_client":
        return "A new client pays a small bonus from the bank."
    if card_id == "luck_market_rally":
        return "A market rally improves your EVA position."
    if card_id == "destiny_operating_tax":
        return "A scheduled operating tax is due before your turn can end."
    if card_id == "destiny_urgent_maintenance":
        return "Urgent maintenance costs must be paid now."
    if card_id == "destiny_favorable_market":
        return "A favorable market event pays out from the bank."
    if amount_eva < 0.0:
        return "Pay EVA to resolve this card."

    return "Receive EVA from the bank."


func _format_card_effect_text(amount_eva: float) -> String:
    var prefix: String = "+" if amount_eva >= 0.0 else "-"
    if is_equal_approx(amount_eva, roundf(amount_eva)):
        return "%s%d EVA" % [
            prefix,
            int(absf(amount_eva))
        ]

    return "%s%s EVA" % [
        prefix,
        _format_eva_number(absf(amount_eva))
    ]


func _is_local_player_on_card_space() -> bool:
    return _deck_id_for_local_card_space() != ""


func _deck_id_for_local_card_space() -> String:
    var local_position: int = view_model.get_local_player_position()
    if local_position < 0:
        return ""

    var space: Dictionary = view_model.get_space_definition(local_position)
    var space_kind: String = str(space.get("kind", ""))
    if space_kind == "luck":
        return "luck"
    if space_kind == "destiny":
        return "destiny"

    return ""


func _build_available_property_panel_data(space: Dictionary) -> Dictionary:
    var purchase_price: int = int(space.get("purchase_price_eva", 0))
    var terrain_label: String = _localized_label(space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Available",
        "price": "%d EVA" % purchase_price,
        "primary_action": "BUY FOR %d EVA" % purchase_price,
        "secondary_action": "PASS",
        "secondary_action_visible": true,
        "region_color": _accent_color_for_space(space),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "Container: %d EVA · each lot: +%d EVA" % [
            int(space.get("container_price_eva", 0)),
            int(space.get("machine_lot_price_eva", 0))
        ],
    }


func _build_unaffordable_property_panel_data(space: Dictionary) -> Dictionary:
    var purchase_price: int = int(space.get("purchase_price_eva", 0))
    var terrain_label: String = _localized_label(space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Available",
        "price": "Can't afford",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "Insufficient balance",
    }


func _build_rent_due_panel_data(space: Dictionary, pending_rent: Dictionary) -> Dictionary:
    var owner_player_id: String = str(pending_rent.get("owner_player_id", ""))
    var terrain_label: String = _localized_label(space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "Rent: %s EVA" % _format_eva_number(pending_rent.get("rent_eva", 0.0)),
        "primary_action": "PAY RENT",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "Base rent due now",
    }


func _build_unaffordable_rent_panel_data(space: Dictionary, pending_rent: Dictionary) -> Dictionary:
    var owner_player_id: String = str(pending_rent.get("owner_player_id", ""))
    var terrain_label: String = _localized_label(space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "Game over",
        "primary_action": "ACCEPT",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "Rent: %s EVA · insufficient balance" % _format_eva_number(pending_rent.get("rent_eva", 0.0)),
    }


func _build_rent_paid_panel_data(space: Dictionary, owner_player_id: String) -> Dictionary:
    var terrain_label: String = _localized_label(space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "Rent paid",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "No rent due",
    }


func _build_self_owned_property_panel_data(space: Dictionary, owner_player_id: String) -> Dictionary:
    var terrain_label: String = _localized_label(space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Base rent: %s EVA" % _format_eva_number(_base_rent_for_space(space)),
        "price": "Your terrain",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "No rent due",
    }


func _development_rows_for_panel(space: Dictionary) -> Array[Dictionary]:
    var rows: Array[Dictionary] = []
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        rows.append({
            "level": int(row.get("level", 0)),
            "build_label": str(row.get("build_label", "")),
            "rent_eva": float(row.get("rent_eva", 0.0)),
        })

    return rows


func _base_rent_for_space(space: Dictionary) -> float:
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        if int(row.get("level", 0)) == 0:
            return float(row.get("rent_eva", 0.0))

    return 0.0


func _format_eva_number(value: Variant) -> String:
    var numeric_value: float = float(value)
    if is_equal_approx(numeric_value, roundf(numeric_value)):
        return "%d" % int(roundf(numeric_value))

    return "%.1f" % numeric_value


func _deck_label(deck_id: String) -> String:
    if deck_id == "luck":
        return "SUERTE"
    if deck_id == "destiny":
        return "DESTINO"

    return deck_id.to_upper()


func _space_label(space_id: String) -> String:
    var space: Dictionary = view_model.get_space_definition_by_id(space_id)
    if space.is_empty():
        return space_id

    return _localized_label(space)


func _localized_label(space: Dictionary) -> String:
    var labels_value: Variant = space.get("labels", {})
    if labels_value is Dictionary:
        var labels: Dictionary = labels_value as Dictionary
        var localized_value: Variant = labels.get(config.language, labels.get("en", space.get("label", "")))
        return str(localized_value)

    return str(space.get("label", ""))


func _accent_color_for_space(space: Dictionary) -> Color:
    var group_id: String = str(space.get("group_id", ""))
    assert(TerrainAccentColors.has(group_id))
    return TerrainAccentColors[group_id]


func _player_label(player_id: String) -> String:
    var player_index: int = _player_index_from_id(player_id)
    if player_index < 0:
        return player_id

    return "Player %d" % (player_index + 1)


func _player_color_for_id(player_id: String) -> Color:
    var player_index: int = _player_index_from_id(player_id)
    if player_index < 0 or player_index >= PlayerPawnLayerScript.PlayerColors.size():
        return Color(0.12, 0.112, 0.095, 1.0)

    return PlayerPawnLayerScript.PlayerColors[player_index]


func _refresh_debug_overlay_text() -> void:
    var definition_state: String = "loaded" if view_model.has_definition() else "pending"
    status_label.text = (
        (
            "Server: %s\nMatch: %s  Client: %s\nRole: %s  Player: %s  Active: %s\n"
            + "Revision: %d  Phase: %s\nActions: %s\nDefinition: %s  Last: %s  Event: %s\n"
            + "Sent: %s  Error: %s%s"
        )
        % [
            client_status,
            config.match_id,
            config.client_id,
            view_model.role,
            view_model.local_player_id,
            view_model.active_player_id,
            view_model.revision,
            view_model.phase,
            view_model.get_available_actions_text(),
            definition_state,
            view_model.last_message_type,
            view_model.get_latest_event_text(),
            view_model.last_sent_command,
            view_model.last_error,
            "\nSynchronizing..." if is_synchronizing else ""
        ]
    )
