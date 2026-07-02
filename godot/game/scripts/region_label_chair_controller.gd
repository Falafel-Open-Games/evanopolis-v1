# ---
# summary: Keeps region flag and label groups facing the current board camera yaw as rigid 3D chairs.
# ---
class_name RegionLabelChairController
extends Node

const RegionNameNodePath: NodePath = ^"RegionName"
const RegionPriceNodePath: NodePath = ^"RegionPrice"

var label_chairs: Array[Node3D] = []
var label_chair_transforms: Array[Transform3D] = []
var initial_camera_yaw: float = 0.0
var flags: Node3D
var camera_rig: Node3D


func setup(required_flags: Node3D, required_camera_rig: Node3D) -> void:
    flags = required_flags
    camera_rig = required_camera_rig
    _cache_label_chairs()
    update_label_chairs()


func _process(_delta: float) -> void:
    update_label_chairs()


func update_label_chairs() -> void:
    if camera_rig == null:
        return

    var yaw_delta: float = camera_rig.rotation.y - initial_camera_yaw
    var chair_rotation: Basis = Basis(Vector3.UP, yaw_delta)

    for region_index: int in range(label_chairs.size()):
        var initial_transform: Transform3D = label_chair_transforms[region_index]
        label_chairs[region_index].global_transform = Transform3D(
            chair_rotation * initial_transform.basis,
            initial_transform.origin
        )


func _cache_label_chairs() -> void:
    assert(flags != null)
    assert(camera_rig != null)

    label_chairs.clear()
    label_chair_transforms.clear()
    initial_camera_yaw = camera_rig.rotation.y

    for flag_pivot: Node in flags.get_children():
        for flag_node: Node in flag_pivot.get_children():
            var region_name_node: Node = flag_node.get_node_or_null(RegionNameNodePath)
            var region_price_node: Node = flag_node.get_node_or_null(RegionPriceNodePath)
            if region_name_node == null or region_price_node == null:
                continue

            assert(flag_node is Node3D)
            assert(region_name_node is Label3D)
            assert(region_price_node is Label3D)

            var flag_node_3d: Node3D = flag_node as Node3D
            label_chairs.append(flag_node_3d)
            label_chair_transforms.append(flag_node_3d.global_transform)
