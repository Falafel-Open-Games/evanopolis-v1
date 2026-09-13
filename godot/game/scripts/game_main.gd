# ---
# summary: Composes the board scene, runtime pawn layer, and temporary debug controls.
# ---
extends Node3D

const DebugTileKey: Key = KEY_T
const DebugTileNextKey: Key = KEY_Y
const DebugZoomKey: Key = KEY_Z
const DebugRollKey: Key = KEY_SPACE
const DebugContainerToggleKey: Key = KEY_C
const DebugContainerMinerKey: Key = KEY_V
const DebugContainerOwnerKey: Key = KEY_B
const DebugPropertyDecisionPanelKey: Key = KEY_P
const DebugCardResolutionPanelKey: Key = KEY_X
const DebugToastKey: Key = KEY_N
const PlayerPawnsNodeName: StringName = &"PlayerPawns"
const PlayerPawnsNodePath: NodePath = ^"PlayerPawns"
const PropertyContainersNodeName: StringName = &"PropertyContainers"
const PropertyContainersNodePath: NodePath = ^"PropertyContainers"
const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const BoardCameraControllerScript: GDScript = preload("res://game/scripts/board_camera_controller.gd")
const ContainerLayerScript: GDScript = preload("res://game/scripts/container_layer.gd")
const DiceControllerScript: GDScript = preload("res://game/scripts/dice_controller.gd")
const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const PropertyDecisionPanelScene: PackedScene = preload("res://game/ui/property-decision-panel.tscn")
const CardResolutionPanelScene: PackedScene = preload("res://game/ui/card-resolution-panel.tscn")
const RegionLabelChairControllerScript: GDScript = preload("res://game/scripts/region_label_chair_controller.gd")
const ToastPresenterScript: GDScript = preload("res://game/scripts/toast_presenter.gd")

var debug_shared_space_index: int = 0
var debug_shared_space_player_count: int = 4
var debug_card_panel_mode: int = 0
var debug_toast_mode: int = 0
var debug_container_miner_counts: Dictionary[int, int] = {}
var debug_container_owner_indices: Dictionary[int, int] = {}
var board_camera_controller: Variant
var card_resolution_panel: Variant
var debug_dice_rng: RandomNumberGenerator = RandomNumberGenerator.new()
var container_layer: Variant
var dice_controller: Variant
var player_pawn_layer: Variant
var property_decision_panel: Variant
var region_label_chair_controller: Variant
var toast_presenter: Object

@onready var tiles: Node3D = $BoardRoot/Tiles
@onready var pawns: Node3D = $BoardRoot/Pawns
@onready var containers: Node3D = $BoardRoot/Containers
@onready var flags: Node3D = $BoardRoot/Flags
@onready var dice_root: Node3D = $BoardRoot/Dices
@onready var die_a: Node3D = $BoardRoot/Dices/D6A
@onready var die_b: Node3D = $BoardRoot/Dices/D6B
@onready var camera_rig: Node3D = $CameraRig
@onready var camera: Camera3D = $CameraRig/Camera3D


func _ready() -> void:
    debug_dice_rng.randomize()
    _create_board_camera_controller()
    _create_dice_controller()
    _create_player_pawn_layer([0, 0, 0, 0])
    _create_container_layer()
    player_pawn_layer.update_pawn_positions(tiles)
    board_camera_controller.focus_on_space(debug_shared_space_index, true)
    _create_region_label_chair_controller()
    _create_property_decision_panel()
    _create_toast_presenter()


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
    elif key_event.keycode == DebugContainerToggleKey:
        _toggle_debug_container()
    elif key_event.keycode == DebugContainerMinerKey:
        _cycle_debug_container_miner_count()
    elif key_event.keycode == DebugContainerOwnerKey:
        _cycle_debug_container_owner()
    elif key_event.keycode == DebugPropertyDecisionPanelKey:
        _toggle_property_decision_panel()
    elif key_event.keycode == DebugCardResolutionPanelKey:
        _cycle_card_resolution_panel()
    elif key_event.keycode == DebugToastKey:
        _cycle_debug_toast()


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
    var existing_player_pawns: Node = pawns.get_node_or_null(PlayerPawnsNodePath)
    if existing_player_pawns != null:
        existing_player_pawns.queue_free()

    player_pawn_layer = PlayerPawnLayerScript.new()
    player_pawn_layer.name = PlayerPawnsNodeName
    pawns.add_child(player_pawn_layer)
    player_pawn_layer.setup_players(initial_tile_indices)


func _create_container_layer() -> void:
    var existing_containers: Node = containers.get_node_or_null(PropertyContainersNodePath)
    if existing_containers != null:
        existing_containers.queue_free()

    container_layer = ContainerLayerScript.new()
    container_layer.name = PropertyContainersNodeName
    containers.add_child(container_layer)
    container_layer.setup(tiles)


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


func _toggle_debug_container() -> void:
    if container_layer.has_container(debug_shared_space_index):
        container_layer.clear_container(debug_shared_space_index)
        return

    _apply_debug_container_state(debug_shared_space_index)


func _cycle_debug_container_miner_count() -> void:
    var miner_count: int = _get_debug_container_miner_count(debug_shared_space_index)
    debug_container_miner_counts[debug_shared_space_index] = wrapi(miner_count + 1, 0, 5)
    _apply_debug_container_state(debug_shared_space_index)


func _cycle_debug_container_owner() -> void:
    var owner_index: int = _get_debug_container_owner_index(debug_shared_space_index)
    debug_container_owner_indices[debug_shared_space_index] = wrapi(
        owner_index + 1,
        0,
        PlayerPawnLayerScript.PlayerColors.size()
    )
    _apply_debug_container_state(debug_shared_space_index)


func _apply_debug_container_state(space_index: int) -> void:
    var miner_count: int = _get_debug_container_miner_count(space_index)
    var owner_index: int = _get_debug_container_owner_index(space_index)
    container_layer.set_container_for_player(space_index, true, miner_count, owner_index)


func _get_debug_container_miner_count(space_index: int) -> int:
    if not debug_container_miner_counts.has(space_index):
        debug_container_miner_counts[space_index] = 1

    return debug_container_miner_counts[space_index]


func _get_debug_container_owner_index(space_index: int) -> int:
    if not debug_container_owner_indices.has(space_index):
        debug_container_owner_indices[space_index] = 0

    return debug_container_owner_indices[space_index]


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


func _create_property_decision_panel() -> void:
    var overlay: CanvasLayer = CanvasLayer.new()
    overlay.name = "ApprovalUiOverlay"
    add_child(overlay)

    property_decision_panel = PropertyDecisionPanelScene.instantiate()
    assert(property_decision_panel != null)
    property_decision_panel.name = "PropertyDecisionPanel"
    property_decision_panel.anchor_left = 1.0
    property_decision_panel.anchor_top = 1.0
    property_decision_panel.anchor_right = 1.0
    property_decision_panel.anchor_bottom = 1.0
    property_decision_panel.offset_left = -648.0
    property_decision_panel.offset_top = -148.0
    property_decision_panel.offset_right = -28.0
    property_decision_panel.offset_bottom = -28.0
    property_decision_panel.visible = false
    overlay.add_child(property_decision_panel)

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
    overlay.add_child(card_resolution_panel)


func _create_toast_presenter() -> void:
    var overlay: CanvasLayer = get_node("ApprovalUiOverlay") as CanvasLayer
    assert(overlay != null)

    toast_presenter = ToastPresenterScript.new()
    toast_presenter.call("setup", overlay)


func _toggle_property_decision_panel() -> void:
    property_decision_panel.visible = not property_decision_panel.visible
    if property_decision_panel.visible:
        debug_card_panel_mode = 0
        card_resolution_panel.visible = false


func _cycle_card_resolution_panel() -> void:
    debug_card_panel_mode = wrapi(debug_card_panel_mode + 1, 0, 4)
    property_decision_panel.visible = false

    if debug_card_panel_mode == 0:
        card_resolution_panel.visible = false
    elif debug_card_panel_mode == 1:
        card_resolution_panel.set_sample_destiny()
        card_resolution_panel.visible = true
    elif debug_card_panel_mode == 2:
        card_resolution_panel.set_sample_luck()
        card_resolution_panel.visible = true
    else:
        card_resolution_panel.set_sample_game_over()
        card_resolution_panel.visible = true


func _cycle_debug_toast() -> void:
    var messages: Array[String] = [
        "PLAYER 1 passed SALIDA and collected +2 EVA",
        "PLAYER 2 bought ASUNCION for 2 EVA",
        "PLAYER 3 paid 1 EVA rent to PLAYER 1 for CARACAS",
        "PLAYER 4 drew DESTINO",
        "PLAYER 4 gained +1 EVA",
        "PLAYER 2 is out of the game",
        "PLAYER 1 wins",
    ]
    toast_presenter.call("show", messages[debug_toast_mode])
    debug_toast_mode = wrapi(debug_toast_mode + 1, 0, messages.size())
