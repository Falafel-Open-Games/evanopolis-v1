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
const PropertyDecisionPanelScene: PackedScene = preload("res://game/ui/property-decision-panel.tscn")
const RegionLabelChairControllerScript: GDScript = preload("res://game/scripts/region_label_chair_controller.gd")
const ServerEventPresentationQueueScript: GDScript = preload("res://game/scripts/server_event_presentation_queue.gd")
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
var property_panel_primary_command: String = ""
var property_decision_panel: Variant
var region_label_chair_controller: Variant
var server_overlay: CanvasLayer
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
var roll_button: Button
var end_turn_button: Button


func _ready() -> void:
    config = GameServerConfigScript.new()
    config.load_from_launch_context()
    print("Evanopolis client config: match=%s client=%s player_count=%d server=%s auto_join=%s debug_overlay=%s" % [
        config.match_id,
        config.client_id,
        config.player_count,
        config.server_url,
        str(config.auto_join),
        str(config.debug_overlay)
    ])
    view_model = GameClientViewModelScript.new()
    view_model.configure(config.match_id, config.client_id)

    _create_board_camera_controller()
    _create_dice_controller()
    _create_player_pawn_layer([0, 0, 0])
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


func _create_presentation_queue() -> void:
    presentation_queue = ServerEventPresentationQueueScript.new()
    presentation_queue.name = "ServerEventPresentationQueue"
    add_child(presentation_queue)
    presentation_queue.setup(tiles, dice_controller, player_pawn_layer, board_camera_controller)
    presentation_queue.busy_changed.connect(_on_presentation_busy_changed)
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

    var commands: HBoxContainer = HBoxContainer.new()
    commands.add_theme_constant_override("separation", 8)
    layout.add_child(commands)

    roll_button = Button.new()
    roll_button.text = "Roll"
    roll_button.pressed.connect(_on_roll_pressed)
    commands.add_child(roll_button)

    end_turn_button = Button.new()
    end_turn_button.text = "End Turn"
    end_turn_button.pressed.connect(_on_end_turn_pressed)
    commands.add_child(end_turn_button)

    _create_property_decision_panel()


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
    property_decision_panel.primary_action_pressed.connect(_on_purchase_property_pressed)
    property_decision_panel.secondary_action_pressed.connect(_on_pass_property_pressed)
    server_overlay.add_child(property_decision_panel)


func _on_server_connected() -> void:
    if has_sent_join:
        return

    has_sent_join = true
    print("Evanopolis client joining match: match=%s client=%s player_count=%d" % [
        config.match_id,
        config.client_id,
        config.player_count
    ])
    game_server_client.join_match(config.match_id, config.client_id, config.player_count)


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
    if property_decision_panel != null:
        property_decision_panel.visible = false
    _send_player_command("request_roll")


func _on_end_turn_pressed() -> void:
    if property_decision_panel != null:
        property_decision_panel.visible = false
    _send_player_command("request_end_turn")


func _on_purchase_property_pressed() -> void:
    if property_decision_panel != null:
        property_decision_panel.visible = false
    assert(property_panel_primary_command != "")
    _send_player_command(property_panel_primary_command)


func _on_pass_property_pressed() -> void:
    if property_decision_panel != null:
        property_decision_panel.visible = false


func _send_player_command(command_type: String) -> void:
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
    var command: Dictionary = view_model.build_player_command(command_type)
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
    if presentation_queue.enqueue_event(event_dictionary):
        return 0

    presentation_queue.cancel_and_resync_to_revision(presentation_queue.get_visual_revision())
    return 0


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
    roll_button.disabled = presentation_busy or not view_model.has_action("request_roll")
    end_turn_button.disabled = presentation_busy or not view_model.has_action("request_end_turn")
    _refresh_property_decision_panel(presentation_busy)


func _refresh_property_decision_panel(presentation_busy: bool) -> void:
    if property_decision_panel == null:
        return
    if presentation_busy or not view_model.has_definition() or not view_model.has_snapshot():
        property_decision_panel.visible = false
        property_panel_primary_command = ""
        return
    if not view_model.is_local_active_player():
        property_decision_panel.visible = false
        property_panel_primary_command = ""
        return

    var local_position: int = view_model.get_local_player_position()
    if local_position < 0:
        property_decision_panel.visible = false
        property_panel_primary_command = ""
        return

    var space: Dictionary = view_model.get_space_definition(local_position)
    if str(space.get("kind", "")) != "terrain":
        property_decision_panel.visible = false
        property_panel_primary_command = ""
        return

    var space_id: String = str(space.get("space_id", ""))
    var pending_rent: Dictionary = view_model.get_pending_rent()
    if (
        not pending_rent.is_empty()
        and str(pending_rent.get("space_id", "")) == space_id
        and str(pending_rent.get("payer_player_id", "")) == view_model.local_player_id
        and view_model.has_action("request_pay_rent")
    ):
        property_panel_primary_command = "request_pay_rent"
        property_decision_panel.set_property_data(_build_rent_due_panel_data(space, pending_rent))
        property_decision_panel.visible = true
        return

    var owner_player_id: String = view_model.get_owner_player_id_for_space(space_id)
    if owner_player_id == "":
        if not view_model.has_action("request_purchase_property"):
            property_decision_panel.visible = false
            property_panel_primary_command = ""
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

    property_decision_panel.visible = false
    property_panel_primary_command = ""


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
        return "%.1f" % numeric_value

    return "%.1f" % numeric_value


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
