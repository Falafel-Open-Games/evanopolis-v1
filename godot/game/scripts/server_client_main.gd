# ---
# summary: Wires the approved board presentation to the server-authoritative protocol.
# ---
extends Node3D

const BoardCameraControllerScript: GDScript = preload("res://game/scripts/board_camera_controller.gd")
const CardResolutionPresenterScript: GDScript = preload("res://game/scripts/card_resolution_presenter.gd")
const ContainerLayerScript: GDScript = preload("res://game/scripts/container_layer.gd")
const DiceControllerScript: GDScript = preload("res://game/scripts/dice_controller.gd")
const GameClientViewModelScript: GDScript = preload("res://game/scripts/game_client_view_model.gd")
const GameServerClientScript: GDScript = preload("res://game/scripts/game_server_client.gd")
const GameServerConfigScript: GDScript = preload("res://game/scripts/game_server_config.gd")
const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const PortfolioPresenterScript: GDScript = preload("res://game/scripts/portfolio_presenter.gd")
const PropertyDecisionPresenterScript: GDScript = preload("res://game/scripts/property_decision_presenter.gd")
const PropertyTileFaceLayerScript: GDScript = preload("res://game/scripts/property_tile_face_layer.gd")
const PropertyDecisionPanelScene: PackedScene = preload("res://game/ui/property-decision-panel.tscn")
const CardResolutionPanelScene: PackedScene = preload("res://game/ui/card-resolution-panel.tscn")
const PlayerStatusBarScene: PackedScene = preload("res://game/ui/player-status-bar.tscn")
const PortfolioPanelScene: PackedScene = preload("res://game/ui/portfolio-panel.tscn")
const RegionLabelChairControllerScript: GDScript = preload("res://game/scripts/region_label_chair_controller.gd")
const ServerEventPresentationQueueScript: GDScript = preload("res://game/scripts/server_event_presentation_queue.gd")
const ToastPresenterScript: GDScript = preload("res://game/scripts/toast_presenter.gd")
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
var portfolio_presenter: Variant
var presentation_queue: Variant
var card_resolution_presenter: Variant
var card_panel_primary_command: String = ""
var card_resolution_panel: Variant
var property_decision_presenter: Variant
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
    portfolio_presenter = PortfolioPresenterScript.new()
    portfolio_presenter.configure(view_model, config.language)
    card_resolution_presenter = CardResolutionPresenterScript.new()
    property_decision_presenter = PropertyDecisionPresenterScript.new()

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
    player_status_bar.offset_left = -608.0
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
    if _should_show_toast_after_presentation(event_dictionary):
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
        var space_index: int = int(space.get("index", -1))
        var space_kind: String = str(space.get("kind", ""))
        if space_kind == "terrain":
            var owner_player_id: String = view_model.get_owner_player_id_for_space(str(space.get("space_id", "")))
            if owner_player_id == "":
                property_tile_face_layer.set_property_available(space_index)
            else:
                property_tile_face_layer.set_property_owned(
                    space_index,
                    _effective_rent_for_space(space, owner_player_id),
                    _player_color_for_id(owner_player_id)
                )
        elif space_kind == "special_property":
            var special_owner_player_id: String = view_model.get_owner_player_id_for_special_property(str(space.get("space_id", "")))
            if special_owner_player_id == "":
                property_tile_face_layer.set_special_property_available(space_index)
            else:
                property_tile_face_layer.set_special_property_owned(
                    space_index,
                    _player_color_for_id(special_owner_player_id)
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
    if not _should_show_toast_after_presentation(event_dictionary):
        _show_toast_for_event(event_dictionary)
    if presentation_queue.enqueue_event(event_dictionary):
        return 0

    presentation_queue.cancel_and_resync_to_revision(presentation_queue.get_visual_revision())
    return 0


func _should_show_toast_after_presentation(event_dictionary: Dictionary) -> bool:
    var event_type: String = str(event_dictionary.get("type", ""))
    return event_type == "start_bonus_collected" or event_type == "player_jailed"


func _show_toast_for_event(event_dictionary: Dictionary) -> void:
    var event_type: String = str(event_dictionary.get("type", ""))
    if event_type == "start_bonus_collected":
        _show_start_bonus_toast(event_dictionary)
    elif event_type == "card_resolved":
        _show_card_resolved_toast(event_dictionary)
    elif event_type == "property_purchased":
        _show_property_purchased_toast(event_dictionary)
    elif event_type == "rent_paid":
        _show_rent_paid_toast(event_dictionary)
    elif event_type == "player_jailed":
        _show_player_jailed_toast(event_dictionary)
    elif event_type == "jail_sentence_served":
        _show_jail_sentence_served_toast(event_dictionary)
    elif event_type == "player_eliminated":
        _show_player_eliminated_toast(event_dictionary)


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


func _show_rent_paid_toast(event_dictionary: Dictionary) -> void:
    if str(event_dictionary.get("payer_player_id", "")) == view_model.local_player_id:
        return

    var payer_label_text: String = _player_label(str(event_dictionary.get("payer_player_id", ""))).to_upper()
    var owner_label_text: String = _player_label(str(event_dictionary.get("owner_player_id", ""))).to_upper()
    var space_label_text: String = _space_label(str(event_dictionary.get("space_id", ""))).to_upper()
    var rent_eva: float = float(event_dictionary.get("rent_eva", 0.0))
    var message: String = "%s paid %s EVA rent to %s for %s" % [
        payer_label_text,
        _format_eva_number(rent_eva),
        owner_label_text,
        space_label_text,
    ]
    toast_presenter.call("show", message)


func _show_player_jailed_toast(event_dictionary: Dictionary) -> void:
    if str(event_dictionary.get("player_id", "")) == view_model.local_player_id:
        return

    var player_label_text: String = _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
    var message: String = "%s landed in JAIL and will skip a turn" % player_label_text
    toast_presenter.call("show", message)


func _show_jail_sentence_served_toast(event_dictionary: Dictionary) -> void:
    if str(event_dictionary.get("player_id", "")) == view_model.local_player_id:
        return

    var player_label_text: String = _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
    var message: String = "%s served their jail sentence" % player_label_text
    toast_presenter.call("show", message)


func _show_player_eliminated_toast(event_dictionary: Dictionary) -> void:
    var player_label_text: String = _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
    var creditor_label_text: String = _player_label(str(event_dictionary.get("creditor_player_id", ""))).to_upper()
    var message: String = "%s is out of the game" % player_label_text
    if creditor_label_text != "":
        message = "%s is out of the game. Assets transfer to %s" % [
            player_label_text,
            creditor_label_text,
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

    if property_decision_panel.visible:
        player_status_bar.visible = false
        return

    var player_index: int = view_model.get_local_player_index()
    assert(player_index >= 0 and player_index < PlayerPawnLayerScript.PlayerColors.size())
    player_status_bar.visible = true
    player_status_bar.modulate = Color(1.0, 1.0, 1.0, 1.0)
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
        var end_turn_label: String = _get_status_end_turn_label()
        player_status_bar.set_primary_command("request_end_turn", end_turn_label, true, presentation_busy)
        return

    player_status_bar.set_primary_command("request_roll", "ROLL", false, presentation_busy)


func _get_status_end_turn_label() -> String:
    if view_model.get_local_player_is_serving_jail_sentence():
        return "SERVE SENTENCE"
    if view_model.get_local_player_is_accepting_jail_time():
        return "ACCEPT JAIL TIME"

    return "END TURN"


func _refresh_portfolio_panel() -> void:
    if portfolio_panel == null or not portfolio_panel.visible:
        return
    if not view_model.has_definition() or not view_model.has_snapshot():
        _hide_portfolio_panel()
        return

    portfolio_panel.set_portfolio_data(portfolio_presenter.build_panel_data())


func _hide_portfolio_panel() -> void:
    if portfolio_panel != null:
        portfolio_panel.visible = false


func _rent_for_development_level(space: Dictionary, level: int) -> float:
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        if int(row.get("level", 0)) == level:
            return float(row.get("rent_eva", 0.0))

    return _base_rent_for_space(space)


func _effective_rent_for_space(space: Dictionary, owner_player_id: String) -> float:
    var space_id: String = str(space.get("space_id", ""))
    var delivered_level: int = int(view_model.get_terrain_development(space_id).get("level", 0))
    var base_rent: float = _rent_for_development_level(space, delivered_level)
    var monopoly_multiplier: float = 2.0 if _has_full_level_five_city_monopoly(str(space.get("group_id", "")), owner_player_id) else 1.0

    return _round_tenths(base_rent * _special_property_rent_multiplier(owner_player_id) * monopoly_multiplier)


func _special_property_rent_multiplier(owner_player_id: String) -> float:
    var bonus: float = 0.0
    var owns_substation_1: bool = _player_owns_special_property(owner_player_id, "substation_1")
    var owns_substation_2: bool = _player_owns_special_property(owner_player_id, "substation_2")
    if owns_substation_1 and owns_substation_2:
        bonus += 0.3
    elif owns_substation_1 or owns_substation_2:
        bonus += 0.1
    if _player_owns_special_property(owner_player_id, "private_workshop"):
        bonus += 0.1
    if _player_owns_special_property(owner_player_id, "cooling_plant"):
        bonus += 0.1

    return 1.0 + bonus


func _player_owns_special_property(owner_player_id: String, special_property_id: String) -> bool:
    if owner_player_id == "":
        return false

    var special_property_ownership: Array = view_model.snapshot.get("special_property_ownership", [])
    for ownership_value: Variant in special_property_ownership:
        assert(ownership_value is Dictionary)
        var ownership: Dictionary = ownership_value as Dictionary
        if str(ownership.get("owner_player_id", "")) != owner_player_id:
            continue

        var space: Dictionary = view_model.get_space_definition_by_id(str(ownership.get("space_id", "")))
        if str(space.get("special_property_id", "")) == special_property_id:
            return true

    return false


func _round_tenths(value: float) -> float:
    return roundf(value * 10.0) / 10.0


func _has_full_level_five_city_monopoly(group_id: String, owner_player_id: String) -> bool:
    if group_id == "" or owner_player_id == "":
        return false

    var city_terrain_count: int = 0
    var spaces: Array = view_model.definition.get("spaces", [])
    for space_value: Variant in spaces:
        assert(space_value is Dictionary)
        var space: Dictionary = space_value as Dictionary
        if str(space.get("kind", "")) != "terrain" or str(space.get("group_id", "")) != group_id:
            continue

        city_terrain_count += 1
        var space_id: String = str(space.get("space_id", ""))
        if view_model.get_owner_player_id_for_space(space_id) != owner_player_id:
            return false
        if int(view_model.get_terrain_development(space_id).get("level", 0)) != 5:
            return false

    return city_terrain_count == 4


func _refresh_card_resolution_panel(presentation_busy: bool) -> void:
    if card_resolution_panel == null:
        return

    var panel_state: Dictionary = card_resolution_presenter.build_panel_state(view_model, presentation_busy)
    if not bool(panel_state.get("visible", false)):
        _hide_card_resolution_panel()
        return

    card_panel_primary_command = str(panel_state.get("command", ""))
    card_resolution_panel.set_card_data(panel_state.get("data", {}))
    card_resolution_panel.visible = true


func _refresh_property_decision_panel(presentation_busy: bool) -> void:
    if property_decision_panel == null:
        return

    var panel_state: Dictionary = property_decision_presenter.build_panel_state(
        view_model,
        presentation_busy,
        config.language
    )
    if not bool(panel_state.get("visible", false)):
        _hide_property_decision_panel()
        return

    property_panel_primary_command = str(panel_state.get("command", ""))
    property_decision_panel.set_property_data(panel_state.get("data", {}))
    property_decision_panel.visible = true


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
