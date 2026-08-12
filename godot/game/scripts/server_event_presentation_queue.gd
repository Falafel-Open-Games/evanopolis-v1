# ---
# summary: Presents server gameplay events sequentially for the Godot client.
# ---
class_name ServerEventPresentationQueue
extends Node

signal busy_changed(is_busy: bool)

const BoardCameraControllerScript: GDScript = preload("res://game/scripts/board_camera_controller.gd")
const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const PawnMoveAfterDiceDelaySeconds: float = 0.15

var board_camera_controller: Variant
var dice_controller: Variant
var player_pawn_layer: Variant
var player_race_distances: Dictionary[String, int] = {}
var queue: Array[Dictionary] = []
var is_processing: bool = false
var busy: bool = false
var tiles: Node3D


func setup(
    required_tiles: Node3D,
    required_dice_controller: Variant,
    required_player_pawn_layer: Variant,
    required_board_camera_controller: Variant
) -> void:
    assert(required_tiles != null)
    assert(required_dice_controller != null)
    assert(required_player_pawn_layer != null)
    assert(required_board_camera_controller != null)

    tiles = required_tiles
    dice_controller = required_dice_controller
    player_pawn_layer = required_player_pawn_layer
    board_camera_controller = required_board_camera_controller


func enqueue_event(event_dictionary: Dictionary) -> void:
    if str(event_dictionary.get("type", "")) == "dice_rolled":
        _reserve_pawn_source_space(event_dictionary)

    queue.append(event_dictionary.duplicate(true))
    _set_busy(true)
    if is_processing:
        return

    _process_queue()


func is_busy() -> bool:
    return busy


func initialize_player_race_distances_from_snapshot(players: Array) -> void:
    for player: Variant in players:
        assert(player is Dictionary)
        var player_snapshot: Dictionary = player as Dictionary
        var player_id: String = str(player_snapshot.get("player_id", ""))
        if player_id == "" or player_race_distances.has(player_id):
            continue

        player_race_distances[player_id] = int(player_snapshot.get("position", 0))


func _process_queue() -> void:
    is_processing = true
    while not queue.is_empty():
        var event_dictionary: Dictionary = queue.pop_front()
        var event_type: String = str(event_dictionary.get("type", ""))
        if event_type == "dice_rolled":
            await _present_dice_rolled(event_dictionary)
        elif event_type == "turn_ended":
            await _present_turn_ended(event_dictionary)

    is_processing = false
    _set_busy(false)


func _present_dice_rolled(event_dictionary: Dictionary) -> void:
    _apply_race_distance_delta(event_dictionary)
    dice_controller.present_dice_roll(
        int(event_dictionary.get("die_1", 1)),
        int(event_dictionary.get("die_2", 1))
    )
    await dice_controller.presentation_finished

    if PawnMoveAfterDiceDelaySeconds > 0.0:
        await get_tree().create_timer(PawnMoveAfterDiceDelaySeconds).timeout

    var pawn_move_duration: float = _animate_pawn_move(event_dictionary)
    board_camera_controller.follow_pawn_move_to_space(
        int(event_dictionary.get("to_position", 0)),
        pawn_move_duration
    )
    var follow_duration: float = pawn_move_duration + BoardCameraControllerScript.FollowStartDelaySeconds
    if follow_duration > 0.0:
        await get_tree().create_timer(follow_duration).timeout


func _present_turn_ended(event_dictionary: Dictionary) -> void:
    var previous_player_id: String = str(event_dictionary.get("player_id", ""))
    var next_player_id: String = str(event_dictionary.get("next_player_id", ""))
    var duration: float = _estimate_turn_focus_duration(previous_player_id, next_player_id)
    _focus_next_turn_player(event_dictionary)
    if duration > 0.0:
        await get_tree().create_timer(duration).timeout


func _reserve_pawn_source_space(event_dictionary: Dictionary) -> void:
    var player_index: int = _player_index_from_id(str(event_dictionary.get("player_id", "")))
    if player_index < 0 or player_index >= player_pawn_layer.player_pawns.size():
        return

    var from_position: int = int(event_dictionary.get("from_position", -1))
    if from_position < 0:
        return

    player_pawn_layer.reserve_player_source_space(player_index, from_position)


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


func _estimate_turn_focus_duration(previous_player_id: String, next_player_id: String) -> float:
    var previous_player_index: int = _player_index_from_id(previous_player_id)
    var next_player_index: int = _player_index_from_id(next_player_id)
    if (
        previous_player_index < 0
        or previous_player_index >= player_pawn_layer.player_tile_indices.size()
        or next_player_index < 0
        or next_player_index >= player_pawn_layer.player_tile_indices.size()
    ):
        return BoardCameraControllerScript.TurnFocusMinDuration

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
    return maxf(
        BoardCameraControllerScript.TurnFocusMinDuration,
        float(maxi(space_distance, 1)) * BoardCameraControllerScript.TurnFocusDurationPerSpace
    )


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


func _set_busy(next_busy: bool) -> void:
    if busy == next_busy:
        return

    busy = next_busy
    busy_changed.emit(busy)
