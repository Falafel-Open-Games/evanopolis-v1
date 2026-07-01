# ---
# summary: Renders a special property tile face and toggles the matching icon for its property type.
# ---
@tool
extends Node3D

const SpecialPropertyDataModule: GDScript = preload("res://game/scripts/special_property_data.gd")

@export var special_property: SpecialPropertyDataModule.SpecialProperty = SpecialPropertyDataModule.SpecialProperty.IMPORTADORA_1:
    set(value):
        special_property = value
        _apply_special_property_data()

@onready var title: Label3D = $Title
@onready var value: Label3D = $Value
@onready var icons: Node3D = $Icons


func _ready() -> void:
    _apply_special_property_data()


func _apply_special_property_data() -> void:
    if not is_node_ready():
        return

    title.text = String(SpecialPropertyDataModule.Names[special_property])
    value.text = "%d EVA" % SpecialPropertyDataModule.Prices[special_property]

    var visible_icon_name: StringName = SpecialPropertyDataModule.IconNodeNames[special_property]
    for icon_node: Node in icons.get_children():
        assert(icon_node is Sprite3D)
        icon_node.visible = icon_node.name == visible_icon_name
