@tool
extends Node3D

@export var player_color: Color = Color("E84855"):
    set(value):
        player_color = value
        _apply_player_color()

@onready var body: MeshInstance3D = $Body
@onready var head: MeshInstance3D = $Head


func _ready() -> void:
    _apply_player_color()


func _apply_player_color() -> void:
    if not is_node_ready():
        return

    _set_mesh_color(body, player_color)
    _set_mesh_color(head, player_color.lightened(0.18))


func _set_mesh_color(mesh_instance: MeshInstance3D, color: Color) -> void:
    var override_material: Material = mesh_instance.get_surface_override_material(0)
    assert(override_material is StandardMaterial3D)

    var typed_material: StandardMaterial3D = override_material as StandardMaterial3D
    if not typed_material.resource_local_to_scene:
        typed_material = typed_material.duplicate() as StandardMaterial3D
        typed_material.resource_local_to_scene = true
        mesh_instance.set_surface_override_material(0, typed_material)

    typed_material.albedo_color = color
