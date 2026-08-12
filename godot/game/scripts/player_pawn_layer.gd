# ---
# summary: Owns runtime player pawn instances and positions them on board spaces.
# ---
class_name PlayerPawnLayer
extends Node3D

const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const PawnClusterLayoutModule: GDScript = preload("res://game/scripts/pawn_cluster_layout.gd")
const PlayerPawnScale: float = 0.5
const PlayerPawnScene: PackedScene = preload("res://game/player-pawn.tscn")
const ClusterSettleDurationSeconds: float = 0.16
const SourceClusterReleaseProgress: float = 0.5
const PlayerColors: Array[Color] = [
    Color(0.909804, 0.282353, 0.333333, 1),
    Color(0.145098, 0.454902, 0.85098, 1),
    Color(0.133333, 0.596078, 0.356863, 1),
    Color(0.956863, 0.643137, 0.121569, 1),
]

var player_tile_indices: Array[int] = []
var player_pawns: Array[Node3D] = []
var animating_player_indices: Dictionary[int, int] = {}
var reserved_player_tile_indices: Dictionary[int, int] = {}
var departing_player_source_indices: Dictionary[int, int] = {}
var departing_player_movement_serials: Dictionary[int, int] = {}


func setup_players(initial_tile_indices: Array[int]) -> void:
    assert(initial_tile_indices.size() >= 1 and initial_tile_indices.size() <= 4)

    for child: Node in get_children():
        child.queue_free()

    player_tile_indices = initial_tile_indices.duplicate()
    player_pawns.clear()
    animating_player_indices.clear()
    reserved_player_tile_indices.clear()
    departing_player_source_indices.clear()
    departing_player_movement_serials.clear()

    for player_index: int in range(player_tile_indices.size()):
        var player_pawn: Node3D = PlayerPawnScene.instantiate() as Node3D
        assert(player_pawn != null)
        player_pawn.name = "PlayerPawn%d" % (player_index + 1)
        player_pawn.scale = Vector3.ONE * PlayerPawnScale
        player_pawn.set("player_color", PlayerColors[player_index])
        player_pawn.visible = true
        add_child(player_pawn)
        player_pawns.append(player_pawn)


func set_visible_player_count(player_count: int) -> void:
    assert(player_count >= 1 and player_count <= player_pawns.size())

    for player_index: int in range(player_pawns.size()):
        player_pawns[player_index].visible = player_index < player_count


func move_visible_players_to_space(space_index: int) -> void:
    assert(space_index >= 0 and space_index < BoardSpacesModule.get_space_count())

    for player_index: int in range(player_tile_indices.size()):
        if player_pawns[player_index].visible:
            player_tile_indices[player_index] = space_index


func update_pawn_positions(tiles_root: Node3D) -> void:
    var players_by_space_index: Dictionary[int, Array] = {}
    for player_index: int in range(player_pawns.size()):
        if not player_pawns[player_index].visible:
            continue
        if animating_player_indices.has(player_index):
            continue

        var space_index: int = player_tile_indices[player_index]
        if reserved_player_tile_indices.has(player_index):
            space_index = reserved_player_tile_indices[player_index]
        assert(space_index >= 0 and space_index < BoardSpacesModule.get_space_count())
        if not players_by_space_index.has(space_index):
            players_by_space_index[space_index] = []
        players_by_space_index[space_index].append(player_index)

    for player_index: int in departing_player_source_indices:
        if not player_pawns[player_index].visible:
            continue

        var source_space_index: int = departing_player_source_indices[player_index]
        assert(source_space_index >= 0 and source_space_index < BoardSpacesModule.get_space_count())
        if not players_by_space_index.has(source_space_index):
            players_by_space_index[source_space_index] = []
        if not players_by_space_index[source_space_index].has(player_index):
            players_by_space_index[source_space_index].append(player_index)

    for space_index: int in players_by_space_index:
        var player_indices: Array = players_by_space_index[space_index]
        assert(player_indices.size() <= 4)
        _position_pawns_on_space(tiles_root, space_index, player_indices)


func cancel_all_animations() -> void:
    for player_pawn: Node3D in player_pawns:
        player_pawn.call("stop_movement_animation")

    animating_player_indices.clear()
    reserved_player_tile_indices.clear()
    departing_player_source_indices.clear()
    departing_player_movement_serials.clear()


func animate_player_path(tiles_root: Node3D, player_index: int, from_space_index: int, to_space_index: int) -> void:
    assert(player_index >= 0 and player_index < player_pawns.size())
    assert(from_space_index >= 0 and from_space_index < BoardSpacesModule.get_space_count())
    assert(to_space_index >= 0 and to_space_index < BoardSpacesModule.get_space_count())

    var path: Array[int] = _forward_space_path(from_space_index, to_space_index)
    if path.is_empty():
        return

    reserved_player_tile_indices.erase(player_index)
    departing_player_source_indices[player_index] = from_space_index
    animating_player_indices[player_index] = to_space_index
    var step_positions: Array[Vector3] = []
    for step_index: int in range(path.size()):
        var space_index: int = path[step_index]
        if step_index == path.size() - 1:
            player_tile_indices[player_index] = to_space_index
            step_positions.append(get_player_space_position(tiles_root, player_index, space_index))
        else:
            step_positions.append(get_space_position(tiles_root, space_index))

    var player_pawn: Node3D = player_pawns[player_index]
    var move_duration: float = float(
        player_pawn.call("estimate_global_positions_duration", path.size())
    )
    var movement_serial: int = int(player_pawn.call("animate_global_positions", step_positions))
    departing_player_movement_serials[player_index] = movement_serial
    player_pawn.connect(
        "movement_finished",
        _on_player_path_finished.bind(movement_serial, tiles_root, player_index, to_space_index),
        Object.CONNECT_ONE_SHOT
    )
    _release_source_cluster_after_delay(
        movement_serial,
        tiles_root,
        player_index,
        from_space_index,
        move_duration * SourceClusterReleaseProgress
    )


func reserve_player_source_space(player_index: int, from_space_index: int) -> void:
    assert(player_index >= 0 and player_index < player_pawns.size())
    assert(from_space_index >= 0 and from_space_index < BoardSpacesModule.get_space_count())

    reserved_player_tile_indices[player_index] = from_space_index


func estimate_player_path_duration(player_index: int, from_space_index: int, to_space_index: int) -> float:
    assert(player_index >= 0 and player_index < player_pawns.size())
    assert(from_space_index >= 0 and from_space_index < BoardSpacesModule.get_space_count())
    assert(to_space_index >= 0 and to_space_index < BoardSpacesModule.get_space_count())

    var path_step_count: int = _forward_space_path(from_space_index, to_space_index).size()
    return float(player_pawns[player_index].call("estimate_global_positions_duration", path_step_count))


func get_space_position(tiles_root: Node3D, space_index: int) -> Vector3:
    var tile_node: Node3D = BoardSpacesModule.get_tile_node(tiles_root, space_index)
    var tile_center_marker: Node3D = BoardSpacesModule.get_tile_center_marker(tile_node)
    return tile_center_marker.global_position


func get_player_space_position(tiles_root: Node3D, player_index: int, space_index: int) -> Vector3:
    var player_indices: Array = []
    for candidate_index: int in range(player_tile_indices.size()):
        if player_tile_indices[candidate_index] == space_index:
            player_indices.append(candidate_index)

    if not player_indices.has(player_index):
        player_indices.append(player_index)

    player_indices.sort()
    var player_offset_index: int = player_indices.find(player_index)
    assert(player_offset_index >= 0)

    var tile_node: Node3D = BoardSpacesModule.get_tile_node(tiles_root, space_index)
    var tile_center_marker: Node3D = BoardSpacesModule.get_tile_center_marker(tile_node)
    var right: Vector3 = tile_center_marker.global_transform.basis.x
    var forward: Vector3 = tile_center_marker.global_transform.basis.z
    right.y = 0.0
    forward.y = 0.0
    right = right.normalized()
    forward = forward.normalized()

    var offsets: Array[Vector2] = PawnClusterLayoutModule.get_offsets(player_indices.size())
    var offset: Vector2 = offsets[player_offset_index]
    return tile_center_marker.global_position + right * offset.x + forward * offset.y


func _on_player_path_finished(
    finished_movement_serial: int,
    expected_movement_serial: int,
    tiles_root: Node3D,
    player_index: int,
    to_space_index: int
) -> void:
    if finished_movement_serial != expected_movement_serial:
        return

    animating_player_indices.erase(player_index)
    departing_player_source_indices.erase(player_index)
    departing_player_movement_serials.erase(player_index)
    _settle_space_cluster(tiles_root, to_space_index)


func _release_source_cluster_after_delay(
    expected_movement_serial: int,
    tiles_root: Node3D,
    player_index: int,
    from_space_index: int,
    delay_seconds: float
) -> void:
    if delay_seconds > 0.0:
        await get_tree().create_timer(delay_seconds).timeout

    if not departing_player_movement_serials.has(player_index):
        return
    if departing_player_movement_serials[player_index] != expected_movement_serial:
        return
    if not departing_player_source_indices.has(player_index):
        return
    if departing_player_source_indices[player_index] != from_space_index:
        return

    departing_player_source_indices.erase(player_index)
    departing_player_movement_serials.erase(player_index)
    _settle_space_cluster(tiles_root, from_space_index)


func _position_pawns_on_space(tiles_root: Node3D, space_index: int, player_indices: Array) -> void:
    var tile_node: Node3D = BoardSpacesModule.get_tile_node(tiles_root, space_index)
    var tile_center_marker: Node3D = BoardSpacesModule.get_tile_center_marker(tile_node)
    var right: Vector3 = tile_center_marker.global_transform.basis.x
    var forward: Vector3 = tile_center_marker.global_transform.basis.z
    right.y = 0.0
    forward.y = 0.0
    right = right.normalized()
    forward = forward.normalized()

    var offsets: Array[Vector2] = PawnClusterLayoutModule.get_offsets(player_indices.size())
    for offset_index: int in range(player_indices.size()):
        var player_index: int = player_indices[offset_index]
        var offset: Vector2 = offsets[offset_index]
        if player_pawns[player_index].call("is_animating"):
            continue
        player_pawns[player_index].global_position = (
            tile_center_marker.global_position
            + right * offset.x
            + forward * offset.y
        )


func _settle_space_cluster(tiles_root: Node3D, space_index: int) -> void:
    var player_indices: Array = []
    for player_index: int in range(player_pawns.size()):
        if not player_pawns[player_index].visible:
            continue
        if animating_player_indices.has(player_index):
            continue
        if player_tile_indices[player_index] == space_index:
            player_indices.append(player_index)

    player_indices.sort()
    for player_index: int in player_indices:
        var target_position: Vector3 = get_player_space_position(tiles_root, player_index, space_index)
        if player_pawns[player_index].global_position.is_equal_approx(target_position):
            continue
        var tween: Tween = player_pawns[player_index].create_tween()
        tween.tween_property(
            player_pawns[player_index],
            "global_position",
            target_position,
            ClusterSettleDurationSeconds
        ).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


func _forward_space_path(from_space_index: int, to_space_index: int) -> Array[int]:
    var path: Array[int] = []
    if from_space_index == to_space_index:
        return path

    var space_count: int = BoardSpacesModule.get_space_count()
    var current_space_index: int = from_space_index
    for _step: int in range(space_count):
        current_space_index = (current_space_index + 1) % space_count
        path.append(current_space_index)
        if current_space_index == to_space_index:
            return path

    path.clear()
    return path
