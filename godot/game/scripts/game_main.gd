# ---
# summary: Composes the board scene, runtime pawn layer, and temporary debug controls.
# ---
extends Node3D

const DebugTileKey: Key = KEY_T
const DebugTileNextKey: Key = KEY_Y
const DebugZoomKey: Key = KEY_Z
const PlayerPawnsNodeName: StringName = &"PlayerPawns"
const PlayerPawnsNodePath: NodePath = ^"PlayerPawns"
const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const BoardCameraControllerScript: GDScript = preload("res://game/scripts/board_camera_controller.gd")
const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const RegionLabelChairControllerScript: GDScript = preload("res://game/scripts/region_label_chair_controller.gd")

var debug_shared_space_index: int = 0
var debug_shared_space_player_count: int = 4
var board_camera_controller: Variant
var player_pawn_layer: Variant
var region_label_chair_controller: Variant

@onready var tiles: Node3D = $BoardRoot/Tiles
@onready var pawns: Node3D = $BoardRoot/Pawns
@onready var flags: Node3D = $BoardRoot/Flags
@onready var camera_rig: Node3D = $CameraRig
@onready var camera: Camera3D = $CameraRig/Camera3D


func _ready() -> void:
    _create_board_camera_controller()
    _create_player_pawn_layer([0, 0, 0, 0])
    player_pawn_layer.update_pawn_positions(tiles)
    board_camera_controller.focus_on_space(debug_shared_space_index, true)
    _create_region_label_chair_controller()


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
    elif key_event.keycode == DebugZoomKey:
        board_camera_controller.toggle_zoom()


func _create_board_camera_controller() -> void:
    board_camera_controller = BoardCameraControllerScript.new()
    board_camera_controller.name = "BoardCameraController"
    add_child(board_camera_controller)
    board_camera_controller.setup(tiles, camera_rig, camera)


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
    board_camera_controller.focus_on_space(debug_shared_space_index, false)


func _create_region_label_chair_controller() -> void:
    region_label_chair_controller = RegionLabelChairControllerScript.new()
    region_label_chair_controller.name = "RegionLabelChairController"
    add_child(region_label_chair_controller)
    region_label_chair_controller.setup(flags, camera_rig)
