# ---
# summary: Binds data and interactions for the editable property decision panel scene.
# ---
class_name PropertyDecisionPanel
extends PanelContainer

signal primary_action_pressed()
signal secondary_action_pressed()
signal details_toggled(expanded: bool)

const CollapsedWidth: float = 576.0
const ExpandedWidth: float = 856.0
const PanelHeight: float = 112.0
const EdgeMargin: float = 28.0

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
@onready var details_panel: Control = %DetailsPanel
@onready var drawer_divider: ColorRect = %DrawerDivider
@onready var level_labels: Array[Label] = [%L0, %L1, %L2, %L3, %L4, %L5]
@onready var build_labels: Array[Label] = [%L0Build, %L1Build, %L2Build, %L3Build, %L4Build, %L5Build]
@onready var rent_labels: Array[Label] = [%L0Rent, %L1Rent, %L2Rent, %L3Rent, %L4Rent, %L5Rent]
@onready var details_note: Label = %DetailsNote


func _ready() -> void:
    primary_button.pressed.connect(func() -> void:
        primary_action_pressed.emit()
    )
    secondary_button.pressed.connect(func() -> void:
        secondary_action_pressed.emit()
    )
    details_button.pressed.connect(_on_details_pressed)
    _apply_expanded_state()
    set_sample_asuncion()


func set_sample_asuncion() -> void:
    set_property_data({
        "title": "ASUNCIÓN",
        "kind": "Terrain",
        "status": "Available",
        "price": "2 EVA",
        "primary_action": "BUY FOR 2 EVA",
        "secondary_action": "PASS",
        "region_color": Color(0.64, 0.83, 0.55, 1.0),
        "development_rent_table": [
            {"level": 0, "build_label": "Empty", "rent_eva": 1.0},
            {"level": 1, "build_label": "Container", "rent_eva": 2.4},
            {"level": 2, "build_label": "+50", "rent_eva": 3.5},
            {"level": 3, "build_label": "+100", "rent_eva": 4.8},
            {"level": 4, "build_label": "+150", "rent_eva": 6.3},
            {"level": 5, "build_label": "+200", "rent_eva": 8.0},
        ],
        "details_note": "Container: 2 EVA · each lot: +1 EVA",
    })


func set_property_data(data: Dictionary) -> void:
    title_label.text = str(data.get("title", "PROPERTY"))
    kind_label.text = str(data.get("kind", "Terrain"))
    status_label.text = str(data.get("status", "Available"))
    price_label.text = str(data.get("price", "-"))
    primary_button.text = str(data.get("primary_action", "BUY"))
    secondary_button.text = str(data.get("secondary_action", "PASS"))
    secondary_button.visible = bool(data.get("secondary_action_visible", true))
    region_color = data.get("region_color", region_color)
    color_strip.color = region_color
    status_dot.modulate = data.get("status_color", region_color.darkened(0.28))
    _set_development_rent_table(data.get("development_rent_table", []))
    details_note.text = str(data.get("details_note", ""))


func _set_development_rent_table(rows_value: Variant) -> void:
    assert(rows_value is Array)
    var rows: Array = rows_value as Array
    assert(rows.size() <= level_labels.size())
    for index: int in range(level_labels.size()):
        var has_row: bool = index < rows.size()
        level_labels[index].get_parent().visible = has_row
        if not has_row:
            continue

        var row_value: Variant = rows[index]
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        level_labels[index].text = str(row.get("level", index))
        build_labels[index].text = str(row.get("build_label", ""))
        rent_labels[index].text = _format_eva_number(row.get("rent_eva", 0.0))


func _format_eva_number(value: Variant) -> String:
    var numeric_value: float = float(value)
    if is_equal_approx(numeric_value, roundf(numeric_value)):
        return "%.1f" % numeric_value

    return "%.1f" % numeric_value


func _on_details_pressed() -> void:
    expanded = not expanded
    _apply_expanded_state()
    details_toggled.emit(expanded)


func _apply_expanded_state() -> void:
    details_panel.visible = expanded
    drawer_divider.visible = expanded
    custom_minimum_size = Vector2(
        ExpandedWidth if expanded else CollapsedWidth,
        PanelHeight
    )
    offset_left = -custom_minimum_size.x - EdgeMargin
    offset_top = -custom_minimum_size.y - EdgeMargin
    details_button.text = "-" if expanded else "+"
