# ---
# summary: Renders a regional flag marker with texture, region name, and region price labels.
# ---
@tool
extends Node3D

const LandDataModule: GDScript = preload("res://game/scripts/land_data.gd")

@export var flag_texture: Texture2D:
    set(value):
        flag_texture = value
        if is_node_ready():
            _apply_flag_texture()

@export var land_name: LandDataModule.LandName = LandDataModule.LandName.CARACAS:
    set(value):
        land_name = value
        if is_node_ready():
            _apply_land_data()

@onready var cloth: MeshInstance3D = $Cloth
@onready var region_name: Label3D = $RegionName
@onready var region_price: Label3D = $RegionPrice


func _ready() -> void:
    _apply_flag_texture()
    _apply_land_data()


func _apply_flag_texture() -> void:
    if flag_texture == null:
        return

    var material: StandardMaterial3D = _get_cloth_material()
    material.albedo_texture = flag_texture


func _apply_land_data() -> void:
    region_name.text = String(LandDataModule.Names[land_name])
    region_price.text = "%d EVA" % LandDataModule.Prices[land_name]


func _get_cloth_material() -> StandardMaterial3D:
    var override_material: Material = cloth.get_surface_override_material(0)
    assert(override_material is StandardMaterial3D)

    var typed_material: StandardMaterial3D = override_material as StandardMaterial3D
    if not typed_material.resource_local_to_scene:
        typed_material = typed_material.duplicate() as StandardMaterial3D
        typed_material.resource_local_to_scene = true
        cloth.set_surface_override_material(0, typed_material)

    return typed_material
