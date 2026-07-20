# ---
# summary: Composes the board scene, runtime pawn layer, and temporary debug controls.
# ---
extends Node3D

const DebugTileKey: Key = KEY_T
const DebugTileNextKey: Key = KEY_Y
const DebugZoomKey: Key = KEY_Z
const DebugRollKey: Key = KEY_SPACE
const PlayerPawnsNodeName: StringName = &"PlayerPawns"
const PlayerPawnsNodePath: NodePath = ^"PlayerPawns"
const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const BoardCameraControllerScript: GDScript = preload("res://game/scripts/board_camera_controller.gd")
const DiceControllerScript: GDScript = preload("res://game/scripts/dice_controller.gd")
const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const RegionLabelChairControllerScript: GDScript = preload("res://game/scripts/region_label_chair_controller.gd")

var debug_shared_space_index: int = 0
var debug_shared_space_player_count: int = 4
var board_camera_controller: Variant
var debug_dice_rng: RandomNumberGenerator = RandomNumberGenerator.new()
var dice_controller: Variant
var player_pawn_layer: Variant
var region_label_chair_controller: Variant

@onready var tiles: Node3D = $BoardRoot/Tiles
@onready var pawns: Node3D = $BoardRoot/Pawns
@onready var flags: Node3D = $BoardRoot/Flags
@onready var die_a: Node3D = $BoardRoot/Dices/D6A
@onready var die_b: Node3D = $BoardRoot/Dices/D6B
@onready var camera_rig: Node3D = $CameraRig
@onready var camera: Camera3D = $CameraRig/Camera3D


func _ready() -> void:
    debug_dice_rng.randomize()
    _create_board_camera_controller()
    _create_dice_controller()
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
    elif key_event.keycode == DebugTileNextKey and key_event.shift_pressed:
        _move_debug_shared_space(-1)
    elif key_event.keycode == DebugTileNextKey:
        _move_debug_shared_space(1)
    elif key_event.keycode == DebugZoomKey:
        board_camera_controller.toggle_zoom()
    elif key_event.keycode == DebugRollKey:
        _present_debug_dice_roll()


func _create_board_camera_controller() -> void:
    board_camera_controller = BoardCameraControllerScript.new()
    board_camera_controller.name = "BoardCameraController"
    add_child(board_camera_controller)
    board_camera_controller.setup(tiles, camera_rig, camera)


func _create_dice_controller() -> void:
    dice_controller = DiceControllerScript.new()
    dice_controller.name = "DiceController"
    add_child(dice_controller)
    dice_controller.setup(die_a, die_b)


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


func _move_debug_shared_space(index_delta: int) -> void:
    debug_shared_space_index = wrapi(
        debug_shared_space_index + index_delta,
        0,
        BoardSpacesModule.get_space_count()
    )
    _apply_debug_shared_space_state()


func _present_debug_dice_roll() -> void:
    if dice_controller.is_presenting():
        return

    var die_1: int = debug_dice_rng.randi_range(1, 6)
    var die_2: int = debug_dice_rng.randi_range(1, 6)
    dice_controller.present_dice_roll(die_1, die_2)


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
