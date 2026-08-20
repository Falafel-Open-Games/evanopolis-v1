# ---
# summary: Applies server-authoritative property ownership state to board tile face components.
# ---
class_name PropertyTileFaceLayer
extends Node

const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const PropertyTileFaceScript: GDScript = preload("res://game/scripts/property_tile_face.gd")

var tiles_root: Node3D
var property_tile_faces_by_space_index: Dictionary[int, Node] = {}


func setup(next_tiles_root: Node3D) -> void:
    tiles_root = next_tiles_root
    _cache_property_tile_faces()


func set_property_available(space_index: int) -> void:
    assert(property_tile_faces_by_space_index.has(space_index))
    property_tile_faces_by_space_index[space_index].call("set_available_value")


func set_property_owned(space_index: int, rent_eva: float, owner_color: Color) -> void:
    assert(property_tile_faces_by_space_index.has(space_index))
    property_tile_faces_by_space_index[space_index].call("set_owned_rent_value", rent_eva, owner_color)


func _cache_property_tile_faces() -> void:
    property_tile_faces_by_space_index.clear()
    for space_index: int in range(BoardSpacesModule.get_space_count()):
        var tile_node: Node3D = BoardSpacesModule.get_tile_node(tiles_root, space_index)
        var property_tile_face: Node = _get_property_tile_face(tile_node)
        if property_tile_face != null:
            property_tile_faces_by_space_index[space_index] = property_tile_face


func _get_property_tile_face(tile_node: Node3D) -> Node:
    for child: Node in tile_node.get_children():
        if child.get_script() == PropertyTileFaceScript:
            return child

    return null
