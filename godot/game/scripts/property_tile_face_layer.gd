# ---
# summary: Applies server-authoritative property ownership state to board tile face components.
# ---
class_name PropertyTileFaceLayer
extends Node

const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")
const PropertyTileFaceScript: GDScript = preload("res://game/scripts/property_tile_face.gd")
const SpecialPropertyTileFaceScript: GDScript = preload("res://game/scripts/special_property_tile_face.gd")
const SpecialPropertyDataScript: GDScript = preload("res://game/scripts/special_property_data.gd")

var tiles_root: Node3D
var property_tile_faces_by_space_index: Dictionary[int, Node] = {}
var special_property_tile_faces_by_property_id: Dictionary[String, Node] = {}


func setup(next_tiles_root: Node3D) -> void:
    tiles_root = next_tiles_root
    _cache_property_tile_faces()


func set_property_available(space_index: int, price_micro: int) -> void:
    assert(property_tile_faces_by_space_index.has(space_index))
    property_tile_faces_by_space_index[space_index].call("set_available_value", price_micro)


func set_property_owned(space_index: int, rent_micro: int, owner_color: Color) -> void:
    assert(property_tile_faces_by_space_index.has(space_index))
    property_tile_faces_by_space_index[space_index].call("set_owned_rent_value", rent_micro, owner_color)


func set_special_property_available(property_id: String, price_micro: int) -> void:
    assert(special_property_tile_faces_by_property_id.has(property_id))
    special_property_tile_faces_by_property_id[property_id].call("set_available", price_micro)


func set_special_property_owned(property_id: String, owner_color: Color) -> void:
    assert(special_property_tile_faces_by_property_id.has(property_id))
    special_property_tile_faces_by_property_id[property_id].call("set_owned", owner_color)


func _cache_property_tile_faces() -> void:
    property_tile_faces_by_space_index.clear()
    special_property_tile_faces_by_property_id.clear()
    for space_index: int in range(BoardSpacesModule.get_space_count()):
        var tile_node: Node3D = BoardSpacesModule.get_tile_node(tiles_root, space_index)
        var property_tile_face: Node = _get_property_tile_face(tile_node)
        if property_tile_face != null:
            property_tile_faces_by_space_index[space_index] = property_tile_face
    for tile_node: Node in tiles_root.get_children():
        var special_property_tile_face: Node = _get_special_property_tile_face(tile_node as Node3D)
        if special_property_tile_face != null:
            var special_property: int = int(special_property_tile_face.get("special_property"))
            var property_id: String = SpecialPropertyDataScript.Ids[special_property]
            assert(not special_property_tile_faces_by_property_id.has(property_id))
            special_property_tile_faces_by_property_id[property_id] = special_property_tile_face

    assert(special_property_tile_faces_by_property_id.size() == SpecialPropertyDataScript.Ids.size())


func _get_property_tile_face(tile_node: Node3D) -> Node:
    for child: Node in tile_node.get_children():
        if child.get_script() == PropertyTileFaceScript:
            return child

    return null


func _get_special_property_tile_face(tile_node: Node3D) -> Node:
    for child: Node in tile_node.get_children():
        if child.get_script() == SpecialPropertyTileFaceScript or child.has_method("set_owned"):
            return child

    return null
