# ---
# summary: Binds data and interactions for the editable property decision panel scene.
# ---
class_name PropertyDecisionPanel
extends PanelContainer

signal primary_action_pressed()
signal secondary_action_pressed()
signal details_toggled(expanded: bool)

var expanded: bool = false
var region_color: Color = Color(0.66, 0.86, 0.56, 1.0)

@onready var color_strip: ColorRect = %ColorStrip
@onready var title_label: Label = %TitleLabel
@onready var kind_label: Label = %KindLabel
@onready var status_dot: Sprite2D = %StatusDot
@onready var status_label: Label = %StatusLabel
@onready var price_label: Label = %PriceLabel
@onready var primary_button: Button = %PrimaryButton
@onready var secondary_button: Button = %SecondaryButton
@onready var details_button: Button = %DetailsButton
@onready var details_panel: VBoxContainer = %DetailsPanel


func _ready() -> void:
    primary_button.pressed.connect(func() -> void:
        primary_action_pressed.emit()
    )
    secondary_button.pressed.connect(func() -> void:
        secondary_action_pressed.emit()
    )
    details_button.pressed.connect(_on_details_pressed)
    set_sample_asuncion()


func set_sample_asuncion() -> void:
    set_property_data({
        "title": "ASUNCION",
        "kind": "Terrain",
        "status": "Available",
        "price": "2 EVA",
        "primary_action": "BUY FOR 2 EVA",
        "secondary_action": "PASS",
        "region_color": Color(0.64, 0.83, 0.55, 1.0),
    })


func set_property_data(data: Dictionary) -> void:
    title_label.text = str(data.get("title", "PROPERTY"))
    kind_label.text = str(data.get("kind", "Terrain"))
    status_label.text = str(data.get("status", "Available"))
    price_label.text = str(data.get("price", "-"))
    primary_button.text = str(data.get("primary_action", "BUY"))
    secondary_button.text = str(data.get("secondary_action", "PASS"))
    region_color = data.get("region_color", region_color)
    color_strip.color = region_color
    status_dot.modulate = region_color.darkened(0.28)


func _on_details_pressed() -> void:
    expanded = not expanded
    details_panel.visible = expanded
    details_button.text = "▲" if expanded else "▼"
    details_toggled.emit(expanded)
