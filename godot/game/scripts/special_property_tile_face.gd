@tool
extends Node3D

enum SpecialProperty {
    IMPORTADORA_1,
    IMPORTADORA_2,
    SUBESTACION_1,
    SUBESTACION_2,
    TALLER_PROPIO,
    COOLING_PLANT,
}

@export var special_property: SpecialProperty = SpecialProperty.IMPORTADORA_1:
    set(value):
        special_property = value
        _apply_special_property_data()

@onready var title: Label3D = $Title
@onready var value: Label3D = $Value
@onready var icons: Node3D = $Icons

const SpecialPropertyNodeNames: Dictionary[SpecialProperty, StringName] = {
    SpecialProperty.IMPORTADORA_1: &"IMPORTADORA_1",
    SpecialProperty.IMPORTADORA_2: &"IMPORTADORA_2",
    SpecialProperty.SUBESTACION_1: &"SUBESTACION_1",
    SpecialProperty.SUBESTACION_2: &"SUBESTACION_2",
    SpecialProperty.TALLER_PROPIO: &"TALLER_PROPIO",
    SpecialProperty.COOLING_PLANT: &"COOLING_PLANT",
}

const SpecialPropertyNames: Dictionary[SpecialProperty, StringName] = {
    SpecialProperty.IMPORTADORA_1: &"Importadora 1",
    SpecialProperty.IMPORTADORA_2: &"Importadora 2",
    SpecialProperty.SUBESTACION_1: &"Subestacion 1",
    SpecialProperty.SUBESTACION_2: &"Subestacion 2",
    SpecialProperty.TALLER_PROPIO: &"Taller Propio",
    SpecialProperty.COOLING_PLANT: &"Cooling Plant",
}

const SpecialPropertyPrices: Dictionary[SpecialProperty, int] = {
    SpecialProperty.IMPORTADORA_1: 5,
    SpecialProperty.IMPORTADORA_2: 5,
    SpecialProperty.SUBESTACION_1: 6,
    SpecialProperty.SUBESTACION_2: 6,
    SpecialProperty.TALLER_PROPIO: 8,
    SpecialProperty.COOLING_PLANT: 10,
}


func _ready() -> void:
    _apply_special_property_data()


func _apply_special_property_data() -> void:
    if not is_node_ready():
        return

    title.text = String(SpecialPropertyNames[special_property])
    value.text = "%d EVA" % SpecialPropertyPrices[special_property]

    var visible_icon_name: StringName = SpecialPropertyNodeNames[special_property]
    for icon_node: Node in icons.get_children():
        assert(icon_node is Sprite3D)
        icon_node.visible = icon_node.name == visible_icon_name
