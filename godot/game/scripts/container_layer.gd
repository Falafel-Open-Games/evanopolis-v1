# ---
# summary: Owns runtime container prop instances and positions them on board property spaces.
# ---
class_name ContainerLayer
extends Node3D

const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const ContainerPropScript: GDScript = preload("res://game/scripts/container_prop.gd")
const PlayerPawnLayerModule: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const ContainerScene: PackedScene = preload("res://game/container/container.tscn")
const ContainerMarkerOffset: Vector3 = Vector3(0.004, 0.041, 0.152)

var tiles_root: Node3D
var containers_by_space_index: Dictionary[int, Node3D] = {}


func setup(required_tiles_root: Node3D) -> void:
    assert(required_tiles_root != null)

    tiles_root = required_tiles_root
    update_container_positions()


func set_container(
    space_index: int,
    has_container: bool,
    miner_count: int,
    owner_color: Color
) -> void:
    assert(tiles_root != null)
    assert(space_index >= 0 and space_index < BoardSpacesModule.get_space_count())
    assert(miner_count >= 0 and miner_count <= ContainerPropScript.MaxMinerCount)

    if not has_container:
        clear_container(space_index)
        return

    var container: Node3D = _get_or_create_container(space_index)
    container.set("has_container", true)
    container.set("miner_count", miner_count)
    container.set("owner_color", owner_color)
    _position_container_on_space(space_index, container)


func set_container_for_player(
    space_index: int,
    has_container: bool,
    miner_count: int,
    player_index: int
) -> void:
    assert(player_index >= 0 and player_index < PlayerPawnLayerModule.PlayerColors.size())

    set_container(
        space_index,
        has_container,
        miner_count,
        PlayerPawnLayerModule.PlayerColors[player_index]
    )


func clear_container(space_index: int) -> void:
    assert(space_index >= 0 and space_index < BoardSpacesModule.get_space_count())

    if not containers_by_space_index.has(space_index):
        return

    var container: Node3D = containers_by_space_index[space_index]
    containers_by_space_index.erase(space_index)
    container.queue_free()


func clear_all_containers() -> void:
    for space_index: int in containers_by_space_index.keys():
        var container: Node3D = containers_by_space_index[space_index]
        container.queue_free()
    containers_by_space_index.clear()


func has_container(space_index: int) -> bool:
    assert(space_index >= 0 and space_index < BoardSpacesModule.get_space_count())

    return containers_by_space_index.has(space_index)


func update_container_positions() -> void:
    assert(tiles_root != null)

    for space_index: int in containers_by_space_index:
        _position_container_on_space(space_index, containers_by_space_index[space_index])


func _get_or_create_container(space_index: int) -> Node3D:
    if containers_by_space_index.has(space_index):
        return containers_by_space_index[space_index]

    var container: Node3D = ContainerScene.instantiate() as Node3D
    container.name = "Container%d" % space_index
    add_child(container)
    containers_by_space_index[space_index] = container
    return container


func _position_container_on_space(space_index: int, container: Node3D) -> void:
    var tile_node: Node3D = BoardSpacesModule.get_tile_node(tiles_root, space_index)
    var tile_center_marker: Node3D = BoardSpacesModule.get_tile_center_marker(tile_node)
    var marker_basis: Basis = tile_center_marker.global_transform.basis.orthonormalized()
    var container_basis: Basis = marker_basis * Basis(Vector3.UP, PI - PI / 2.0)
    var container_position: Vector3 = (
        tile_center_marker.global_position
        + marker_basis * ContainerMarkerOffset
    )

    container.global_transform = Transform3D(container_basis, container_position)
