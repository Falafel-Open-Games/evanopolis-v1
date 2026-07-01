# ---
# summary: Composes the board scene, runtime pawn layer, and temporary debug controls.
# ---
extends Node3D

const DebugTileKey: Key = KEY_T
const DebugTileNextKey: Key = KEY_Y
const PlayerPawnsNodeName: StringName = &"PlayerPawns"
const PlayerPawnsNodePath: NodePath = ^"PlayerPawns"
const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")

var debug_shared_space_index: int = 0
var debug_shared_space_player_count: int = 4
var player_pawn_layer: Variant

@onready var tiles: Node3D = $BoardRoot/Tiles
@onready var pawns: Node3D = $BoardRoot/Pawns


func _ready() -> void:
    _create_player_pawn_layer([0, 0, 0, 0])
    player_pawn_layer.update_pawn_positions(tiles)


func _unhandled_input(event: InputEvent) -> void:
    if not event is InputEventKey:
        return

    var key_event: InputEventKey = event as InputEventKey
    if not key_event.pressed or key_event.echo:
        return

    if key_event.keycode == DebugTileKey:
        _cycle_debug_shared_space_player_count()
    elif key_event.keycode == DebugTileNextKey:
        _advance_debug_shared_space()


func _create_player_pawn_layer(initial_tile_indices: Array[int]) -> void:
    var existing_player_pawns: Node = pawns.get_node_or_null(PlayerPawnsNodePath)
    if existing_player_pawns != null:
        existing_player_pawns.queue_free()

    player_pawn_layer = PlayerPawnLayerScript.new()
    player_pawn_layer.name = PlayerPawnsNodeName
    pawns.add_child(player_pawn_layer)
    player_pawn_layer.setup_players(initial_tile_indices)


func _cycle_debug_shared_space_player_count() -> void:
    debug_shared_space_player_count = wrapi(debug_shared_space_player_count, 0, 4) + 1
    _apply_debug_shared_space_state()


func _advance_debug_shared_space() -> void:
    debug_shared_space_index = wrapi(
        debug_shared_space_index + 1,
        0,
        BoardSpacesModule.get_space_count()
    )
    _apply_debug_shared_space_state()


func _apply_debug_shared_space_state() -> void:
    player_pawn_layer.set_visible_player_count(debug_shared_space_player_count)
    player_pawn_layer.move_visible_players_to_space(debug_shared_space_index)
    player_pawn_layer.update_pawn_positions(tiles)
