@tool
extends Node3D

enum LandName {
    CARACAS,
    ASSUNCION,
    CIUDAD_DEL_ESTE,
    MINSK,
    SIBERIA,
    TEXAS,
}

@export var flag_texture: Texture2D:
    set(value):
        flag_texture = value
        if is_node_ready():
            _apply_flag_texture()

@export var land_name: LandName = LandName.CARACAS:
    set(value):
        land_name = value
        if is_node_ready():
            _apply_land_data()

@onready var cloth: MeshInstance3D = $Cloth
@onready var region_name: Label3D = $RegionName
@onready var region_price: Label3D = $RegionPrice

const LandNames: Dictionary[LandName, StringName] = {
    LandName.CARACAS: &"Caracas",
    LandName.ASSUNCION: &"Asunción",
    LandName.CIUDAD_DEL_ESTE: &"Ciudad del Este",
    LandName.MINSK: &"Minsk",
    LandName.SIBERIA: &"Siberia",
    LandName.TEXAS: &"Texas",
}

const LandPrices: Dictionary[LandName, int] = {
    LandName.CARACAS: 1,
    LandName.ASSUNCION: 2,
    LandName.CIUDAD_DEL_ESTE: 2,
    LandName.MINSK: 3,
    LandName.SIBERIA: 3,
    LandName.TEXAS: 4,
}


func _ready() -> void:
    _apply_flag_texture()
    _apply_land_data()


func _apply_flag_texture() -> void:
    if flag_texture == null:
        return

    var material: StandardMaterial3D = _get_cloth_material()
    material.albedo_texture = flag_texture


func _apply_land_data() -> void:
    region_name.text = String(LandNames[land_name])
    region_price.text = "%d EVA" % LandPrices[land_name]


func _get_cloth_material() -> StandardMaterial3D:
    var override_material: Material = cloth.get_surface_override_material(0)
    assert(override_material is StandardMaterial3D)

    var typed_material: StandardMaterial3D = override_material as StandardMaterial3D
    if not typed_material.resource_local_to_scene:
        typed_material = typed_material.duplicate() as StandardMaterial3D
        typed_material.resource_local_to_scene = true
        cloth.set_surface_override_material(0, typed_material)

    return typed_material
