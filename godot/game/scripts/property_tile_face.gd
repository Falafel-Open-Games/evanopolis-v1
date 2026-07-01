# ---
# summary: Renders a standard property tile face from land data such as name, color, and price.
# ---
@tool
extends Node3D

const LandDataModule: GDScript = preload("res://game/scripts/land_data.gd")

@export var land_name: LandDataModule.LandName = LandDataModule.LandName.CARACAS:
    set(value):
        land_name = value
        _apply_land_data()

@onready var title: Label3D = $Title
@onready var value: Label3D = $Value
@onready var color: MeshInstance3D = $Color


func _ready() -> void:
    _apply_land_data()


func _apply_land_data() -> void:
    if not is_node_ready():
        return

    title.text = String(LandDataModule.Names[land_name])
    value.text = "%d EVA" % LandDataModule.Prices[land_name]

    var material: StandardMaterial3D = _get_color_material()
    material.albedo_color = LandDataModule.Colors[land_name]


func _get_color_material() -> StandardMaterial3D:
    var override_material: Material = color.get_surface_override_material(0)
    assert(override_material is StandardMaterial3D)

    var typed_material: StandardMaterial3D = override_material as StandardMaterial3D
    if not typed_material.resource_local_to_scene:
        typed_material = typed_material.duplicate() as StandardMaterial3D
        typed_material.resource_local_to_scene = true
        color.set_surface_override_material(0, typed_material)

    return typed_material
