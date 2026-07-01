# ---
# summary: Owns runtime player pawn instances and positions them on board spaces.
# ---
class_name PlayerPawnLayer
extends Node3D

const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const PawnClusterLayoutModule: GDScript = preload("res://game/scripts/pawn_cluster_layout.gd")
const PlayerPawnScale: float = 0.5
const PlayerPawnScene: PackedScene = preload("res://game/player-pawn.tscn")
const PlayerColors: Array[Color] = [
    Color(0.909804, 0.282353, 0.333333, 1),
    Color(0.145098, 0.454902, 0.85098, 1),
    Color(0.133333, 0.596078, 0.356863, 1),
    Color(0.956863, 0.643137, 0.121569, 1),
]

var player_tile_indices: Array[int] = []
var player_pawns: Array[Node3D] = []


func setup_players(initial_tile_indices: Array[int]) -> void:
    assert(initial_tile_indices.size() >= 1 and initial_tile_indices.size() <= 4)

    for child: Node in get_children():
        child.queue_free()

    player_tile_indices = initial_tile_indices.duplicate()
    player_pawns.clear()

    for player_index: int in range(player_tile_indices.size()):
        var player_pawn: Node3D = PlayerPawnScene.instantiate() as Node3D
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

        var space_index: int = player_tile_indices[player_index]
        assert(space_index >= 0 and space_index < BoardSpacesModule.get_space_count())
        if not players_by_space_index.has(space_index):
            players_by_space_index[space_index] = []
        players_by_space_index[space_index].append(player_index)

    for space_index: int in players_by_space_index:
        var player_indices: Array = players_by_space_index[space_index]
        assert(player_indices.size() <= 4)
        _position_pawns_on_space(tiles_root, space_index, player_indices)


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
        player_pawns[player_index].global_position = (
            tile_center_marker.global_position
            + right * offset.x
            + forward * offset.y
        )
