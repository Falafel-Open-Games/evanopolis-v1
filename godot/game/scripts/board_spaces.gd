# ---
# summary: Maps logical board space indices to imported tile nodes and their placement markers.
# ---
class_name BoardSpaces
extends RefCounted

const TileNodeNames: Array[StringName] = [
    &"tile_000",
    &"tile_001",
    &"tile_002",
    &"tile_003",
    &"tile_004",
    &"tile_005",
    &"tile_006",
    &"tile_007",
    &"tile_008",
    &"tile_009",
    &"tile_010",
    &"tile_011",
    &"tile_012",
    &"tile_013",
    &"tile_014",
    &"tile_015",
    &"tile_016",
    &"tile_017",
    &"tile_018",
    &"tile_019",
    &"tile_020",
    &"tile_021",
    &"tile_022",
    &"tile_023",
    &"tile_024",
    &"tile_025",
    &"tile_027",
    &"tile_028",
    &"tile_029",
    &"tile_030",
    &"tile_031",
    &"tile_032",
    &"tile_033",
    &"tile_034",
    &"tile_035",
    &"tile_036",
]


static func get_space_count() -> int:
    return TileNodeNames.size()


static func get_tile_node(tiles_root: Node, space_index: int) -> Node3D:
    assert(space_index >= 0 and space_index < TileNodeNames.size())

    var tile_node_name: StringName = TileNodeNames[space_index]
    var tile_node_path: NodePath = NodePath(tile_node_name)
    var tile_node: Node = tiles_root.get_node_or_null(tile_node_path)
    assert(tile_node is Node3D, "Missing board tile: %s" % String(tile_node_name))
    return tile_node as Node3D


static func get_tile_center_marker(tile_node: Node3D) -> Node3D:
    for child: Node in tile_node.get_children():
        if child.name.begins_with("space_center"):
            assert(child is Node3D)
            return child as Node3D

    assert(false, "Missing center marker for board tile: %s" % tile_node.name)
    return tile_node
