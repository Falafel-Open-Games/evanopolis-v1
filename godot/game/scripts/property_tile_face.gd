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

@export var land_name: LandName = LandName.CARACAS:
    set(value):
        land_name = value
        _apply_land_data()

@onready var title: Label3D = $Title
@onready var value: Label3D = $Value
@onready var color: MeshInstance3D = $Color

const LandNames: Dictionary[LandName, StringName] = {
    LandName.CARACAS: &"Caracas",
    LandName.ASSUNCION: &"Asunción",
    LandName.CIUDAD_DEL_ESTE: &"Ciudad del Este",
    LandName.MINSK: &"Minsk",
    LandName.SIBERIA: &"Siberia",
    LandName.TEXAS: &"Texas",
}

const LandColors: Dictionary[LandName, Color] = {
    LandName.CARACAS: Color("4A90E2"),
    LandName.ASSUNCION: Color("6BBF59"),
    LandName.CIUDAD_DEL_ESTE: Color("F2C94C"),
    LandName.MINSK: Color("F2994A"),
    LandName.SIBERIA: Color("E85D5A"),
    LandName.TEXAS: Color("C77DFF"),
}

const LandPrices: Dictionary[LandName, float] = {
    LandName.CARACAS: 1.0,
    LandName.ASSUNCION: 2.0,
    LandName.CIUDAD_DEL_ESTE: 2.0,
    LandName.MINSK: 3.0,
    LandName.SIBERIA: 3.0,
    LandName.TEXAS: 4.0,
}


func _ready() -> void:
    _apply_land_data()


func _apply_land_data() -> void:
    if not is_node_ready():
        return

    title.text = String(LandNames[land_name])
    value.text = "%d EVA" % int(round(LandPrices[land_name]))

    var material: StandardMaterial3D = _get_color_material()
    material.albedo_color = LandColors[land_name]


func _get_color_material() -> StandardMaterial3D:
    var override_material: Material = color.get_surface_override_material(0)
    assert(override_material is StandardMaterial3D)

    var typed_material: StandardMaterial3D = override_material as StandardMaterial3D
    if not typed_material.resource_local_to_scene:
        typed_material = typed_material.duplicate() as StandardMaterial3D
        typed_material.resource_local_to_scene = true
        color.set_surface_override_material(0, typed_material)

    return typed_material
