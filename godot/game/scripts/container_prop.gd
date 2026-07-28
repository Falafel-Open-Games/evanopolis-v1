# ---
# summary: Controls a reusable container prop with a variable number of tinted miners.
# ---
class_name ContainerProp
extends Node3D

const MaxMinerCount: int = 4
const MinerMeshPath: NodePath = ^"world_001/geometry_0_001"
const MinerRowCenterOffset: Vector3 = Vector3(0.055, 0.0, 0.0)
const MinerOffsets: Array[Vector3] = [
    MinerRowCenterOffset + Vector3(-0.06, 0.0, 0.0),
    MinerRowCenterOffset + Vector3(-0.02, 0.0, 0.0),
    MinerRowCenterOffset + Vector3(0.02, 0.0, 0.0),
    MinerRowCenterOffset + Vector3(0.06, 0.0, 0.0),
]

@export var has_container: bool = true:
    set(value):
        has_container = value
        _apply_container_state()

@export_range(0, MaxMinerCount) var miner_count: int = 1:
    set(value):
        miner_count = value
        _apply_container_state()

@export var owner_color: Color = Color(0.909804, 0.282353, 0.333333, 1):
    set(value):
        owner_color = value
        _apply_container_state()

var miner_template: MeshInstance3D
var miner_base_transform: Transform3D
var miner_instances: Array[MeshInstance3D] = []
var miner_material: StandardMaterial3D


func _ready() -> void:
    _setup_miners()
    _apply_container_state()


func configure(required_has_container: bool, required_miner_count: int, required_owner_color: Color) -> void:
    assert(required_miner_count >= 0 and required_miner_count <= MaxMinerCount)

    has_container = required_has_container
    miner_count = required_miner_count
    owner_color = required_owner_color
    _apply_container_state()


func _setup_miners() -> void:
    if miner_instances.size() > 0:
        return

    var miner_node: Node = get_node(MinerMeshPath)
    assert(miner_node is MeshInstance3D)
    miner_template = miner_node as MeshInstance3D
    miner_base_transform = miner_template.transform
    miner_material = _get_local_miner_material(miner_template)
    miner_instances.append(miner_template)

    var miner_parent: Node = miner_template.get_parent()
    assert(miner_parent != null)
    for miner_index: int in range(1, MaxMinerCount):
        var miner_instance: MeshInstance3D = miner_template.duplicate() as MeshInstance3D
        miner_instance.name = "Miner%d" % (miner_index + 1)
        miner_instance.set_surface_override_material(0, miner_material)
        miner_parent.add_child(miner_instance)
        miner_instances.append(miner_instance)


func _apply_container_state() -> void:
    visible = has_container
    if not is_node_ready():
        return

    assert(miner_count >= 0 and miner_count <= MaxMinerCount)
    _setup_miners()

    miner_material.albedo_color = owner_color
    var active_offsets: Array[Vector3] = _get_active_miner_offsets(miner_count)
    for miner_index: int in range(miner_instances.size()):
        var miner_instance: MeshInstance3D = miner_instances[miner_index]
        miner_instance.visible = miner_index < miner_count
        if miner_instance.visible:
            miner_instance.transform = miner_base_transform.translated(active_offsets[miner_index])


func _get_active_miner_offsets(required_miner_count: int) -> Array[Vector3]:
    if required_miner_count == 1:
        return [MinerRowCenterOffset]
    if required_miner_count == 2:
        return [
            MinerRowCenterOffset + Vector3(-0.03, 0.0, 0.0),
            MinerRowCenterOffset + Vector3(0.03, 0.0, 0.0),
        ]
    if required_miner_count == 3:
        return [
            MinerRowCenterOffset + Vector3(-0.04, 0.0, 0.0),
            MinerRowCenterOffset,
            MinerRowCenterOffset + Vector3(0.04, 0.0, 0.0),
        ]

    return MinerOffsets


func _get_local_miner_material(miner_instance: MeshInstance3D) -> StandardMaterial3D:
    var override_material: Material = miner_instance.get_surface_override_material(0)
    assert(override_material is StandardMaterial3D)

    var typed_material: StandardMaterial3D = override_material as StandardMaterial3D
    typed_material = typed_material.duplicate() as StandardMaterial3D
    typed_material.resource_local_to_scene = true
    miner_instance.set_surface_override_material(0, typed_material)
    return typed_material
