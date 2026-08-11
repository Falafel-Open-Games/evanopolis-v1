# ---
# summary: Wires the approved board presentation to the server-authoritative protocol.
# ---
extends Node3D

const BoardCameraControllerScript: GDScript = preload("res://game/scripts/board_camera_controller.gd")
const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const ContainerLayerScript: GDScript = preload("res://game/scripts/container_layer.gd")
const DiceControllerScript: GDScript = preload("res://game/scripts/dice_controller.gd")
const GameClientViewModelScript: GDScript = preload("res://game/scripts/game_client_view_model.gd")
const GameServerClientScript: GDScript = preload("res://game/scripts/game_server_client.gd")
const GameServerConfigScript: GDScript = preload("res://game/scripts/game_server_config.gd")
const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const RegionLabelChairControllerScript: GDScript = preload("res://game/scripts/region_label_chair_controller.gd")

const PawnMoveAfterDiceDelaySeconds: float = 0.15

var board_camera_controller: Variant
var client_status: String = "not_started"
var config: Variant
var container_layer: Variant
var dice_controller: Variant
var game_server_client: Variant
var has_sent_join: bool = false
var player_pawn_layer: Variant
var player_race_distances: Dictionary[String, int] = {}
var pending_dice_move: Dictionary = {}
var pending_dice_move_serial: int = 0
var region_label_chair_controller: Variant
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
var roll_button: Button
var end_turn_button: Button


func _ready() -> void:
    config = GameServerConfigScript.new()
    config.load_from_launch_context()
    print("Evanopolis client config: match=%s client=%s player_count=%d server=%s auto_join=%s" % [
        config.match_id,
        config.client_id,
        config.player_count,
        config.server_url,
        str(config.auto_join)
    ])
    view_model = GameClientViewModelScript.new()
    view_model.configure(config.match_id, config.client_id)

    _create_board_camera_controller()
    _create_dice_controller()
    _create_player_pawn_layer([0, 0, 0])
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
    dice_controller.presentation_finished.connect(_on_dice_presentation_finished)


func _create_player_pawn_layer(initial_tile_indices: Array[int]) -> void:
    player_pawn_layer = PlayerPawnLayerScript.new()
    player_pawn_layer.name = "ServerPlayerPawns"
    pawns.add_child(player_pawn_layer)
    player_pawn_layer.setup_players(initial_tile_indices)


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
    var overlay: CanvasLayer = CanvasLayer.new()
    overlay.name = "ServerClientOverlay"
    add_child(overlay)

    var panel: PanelContainer = PanelContainer.new()
    panel.position = Vector2(12, 12)
    panel.custom_minimum_size = Vector2(360, 132)
    overlay.add_child(panel)

    var margin: MarginContainer = MarginContainer.new()
    margin.add_theme_constant_override("margin_left", 10)
    margin.add_theme_constant_override("margin_top", 10)
    margin.add_theme_constant_override("margin_right", 10)
    margin.add_theme_constant_override("margin_bottom", 10)
    panel.add_child(margin)

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


func _on_server_message_received(message: Dictionary) -> void:
    _print_server_message(message)
    view_model.apply_server_message(message)
    _apply_event_to_presentation(message)
    _apply_snapshot_to_presentation()
    _refresh_overlay()


func _on_roll_pressed() -> void:
    _send_player_command("request_roll")


func _on_end_turn_pressed() -> void:
    _send_player_command("request_end_turn")


func _send_player_command(command_type: String) -> void:
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


func _apply_snapshot_to_presentation() -> void:
    if not view_model.has_snapshot():
        return

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
    _initialize_player_race_distances_from_snapshot()

    var dice: Dictionary = view_model.get_dice()
    if not dice.is_empty() and not dice_controller.is_presenting():
        dice_controller.set_dice_values(int(dice["die_1"]), int(dice["die_2"]))


func _apply_event_to_presentation(message: Dictionary) -> void:
    if str(message.get("type", "")) != "match_event":
        return

    var event: Variant = message.get("event", {})
    if not event is Dictionary:
        return

    var event_dictionary: Dictionary = event as Dictionary
    if str(event_dictionary.get("type", "")) == "dice_rolled":
        _queue_pawn_move_after_dice(event_dictionary)
        _apply_race_distance_delta(event_dictionary)
        dice_controller.present_dice_roll(
            int(event_dictionary.get("die_1", 1)),
            int(event_dictionary.get("die_2", 1))
        )
    elif str(event_dictionary.get("type", "")) == "turn_ended":
        _focus_next_turn_player(event_dictionary)


func _queue_pawn_move_after_dice(event_dictionary: Dictionary) -> void:
    var player_index: int = _player_index_from_id(str(event_dictionary.get("player_id", "")))
    if player_index < 0 or player_index >= player_pawn_layer.player_pawns.size():
        return

    var from_position: int = int(event_dictionary.get("from_position", -1))
    var to_position: int = int(event_dictionary.get("to_position", -1))
    if from_position < 0 or to_position < 0:
        return

    pending_dice_move_serial += 1
    pending_dice_move = {
        "serial": pending_dice_move_serial,
        "event": event_dictionary.duplicate(true)
    }
    player_pawn_layer.reserve_player_source_space(player_index, from_position)


func _on_dice_presentation_finished(_die_1: int, _die_2: int) -> void:
    if pending_dice_move.is_empty():
        return

    var move_serial: int = int(pending_dice_move.get("serial", 0))
    _start_pending_dice_move_after_delay(move_serial)


func _start_pending_dice_move_after_delay(move_serial: int) -> void:
    if PawnMoveAfterDiceDelaySeconds > 0.0:
        await get_tree().create_timer(PawnMoveAfterDiceDelaySeconds).timeout

    if pending_dice_move.is_empty() or int(pending_dice_move.get("serial", 0)) != move_serial:
        return

    var event: Variant = pending_dice_move.get("event", {})
    pending_dice_move = {}
    if not event is Dictionary:
        return

    var event_dictionary: Dictionary = event as Dictionary
    var pawn_move_duration: float = _animate_pawn_move(event_dictionary)
    board_camera_controller.follow_pawn_move_to_space(
        int(event_dictionary.get("to_position", 0)),
        pawn_move_duration
    )


func _animate_pawn_move(event_dictionary: Dictionary) -> float:
    var player_index: int = _player_index_from_id(str(event_dictionary.get("player_id", "")))
    if player_index < 0 or player_index >= player_pawn_layer.player_pawns.size():
        return 0.0

    var from_position: int = int(event_dictionary.get("from_position", -1))
    var to_position: int = int(event_dictionary.get("to_position", -1))
    if from_position < 0 or to_position < 0:
        return 0.0

    var move_duration: float = player_pawn_layer.estimate_player_path_duration(
        player_index,
        from_position,
        to_position
    )
    player_pawn_layer.animate_player_path(tiles, player_index, from_position, to_position)
    return move_duration


func _initialize_player_race_distances_from_snapshot() -> void:
    var players: Array = view_model.snapshot.get("players", [])
    for player: Variant in players:
        assert(player is Dictionary)
        var player_snapshot: Dictionary = player as Dictionary
        var player_id: String = str(player_snapshot.get("player_id", ""))
        if player_id == "" or player_race_distances.has(player_id):
            continue

        player_race_distances[player_id] = int(player_snapshot.get("position", 0))


func _apply_race_distance_delta(event_dictionary: Dictionary) -> void:
    var player_id: String = str(event_dictionary.get("player_id", ""))
    if player_id == "":
        return

    var current_distance: int = int(player_race_distances.get(player_id, 0))
    player_race_distances[player_id] = current_distance + int(event_dictionary.get("total", 0))


func _focus_next_turn_player(event_dictionary: Dictionary) -> void:
    var previous_player_id: String = str(event_dictionary.get("player_id", ""))
    var next_player_id: String = str(event_dictionary.get("next_player_id", ""))
    var previous_player_index: int = _player_index_from_id(previous_player_id)
    var next_player_index: int = _player_index_from_id(next_player_id)
    if (
        previous_player_index < 0
        or previous_player_index >= player_pawn_layer.player_tile_indices.size()
        or next_player_index < 0
        or next_player_index >= player_pawn_layer.player_tile_indices.size()
    ):
        return

    var previous_space_index: int = player_pawn_layer.player_tile_indices[previous_player_index]
    var next_space_index: int = player_pawn_layer.player_tile_indices[next_player_index]
    var previous_distance: int = int(player_race_distances.get(previous_player_id, previous_space_index))
    var next_distance: int = int(player_race_distances.get(next_player_id, next_space_index))
    var board_direction: int = _turn_focus_board_direction(previous_distance, next_distance)
    var space_distance: int = _turn_focus_space_distance(
        previous_space_index,
        next_space_index,
        board_direction
    )
    board_camera_controller.focus_on_turn_player(next_space_index, board_direction, space_distance)


func _turn_focus_board_direction(previous_distance: int, next_distance: int) -> int:
    if previous_distance < next_distance:
        return 1
    if previous_distance > next_distance:
        return -1

    return 0


func _turn_focus_space_distance(from_space_index: int, to_space_index: int, board_direction: int) -> int:
    var forward_distance: int = _forward_space_distance(from_space_index, to_space_index)
    if board_direction > 0:
        return forward_distance
    if board_direction < 0:
        return _forward_space_distance(to_space_index, from_space_index)

    return mini(forward_distance, _forward_space_distance(to_space_index, from_space_index))


func _forward_space_distance(from_space_index: int, to_space_index: int) -> int:
    var space_count: int = BoardSpacesModule.get_space_count()
    assert(from_space_index >= 0 and from_space_index < space_count)
    assert(to_space_index >= 0 and to_space_index < space_count)

    return (to_space_index - from_space_index + space_count) % space_count


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

    var definition_state: String = "loaded" if view_model.has_definition() else "pending"
    status_label.text = (
        (
            "Server: %s\nMatch: %s  Client: %s\nRole: %s  Player: %s  Active: %s\n"
            + "Revision: %d  Phase: %s\nActions: %s\nDefinition: %s  Last: %s  Event: %s\n"
            + "Sent: %s  Error: %s"
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
            view_model.last_error
        ]
    )

    roll_button.disabled = not view_model.has_action("request_roll")
    end_turn_button.disabled = not view_model.has_action("request_end_turn")
