# ---
# summary: Shows the local player's owned terrain and development order state.
# ---
class_name PortfolioPanel
extends PanelContainer

signal close_pressed()

const RowBackground: Color = Color(0.93, 0.90, 0.84, 1.0)
const TextColor: Color = Color(0.12, 0.112, 0.095, 1.0)
const MutedTextColor: Color = Color(0.34, 0.315, 0.275, 1.0)

@onready var close_button: Button = %CloseButton
@onready var balance_label: Label = %BalanceLabel
@onready var empty_state_label: Label = %EmptyStateLabel
@onready var list_container: VBoxContainer = %ListContainer
@onready var order_button: Button = %OrderButton


func _ready() -> void:
    close_button.pressed.connect(func() -> void:
        close_pressed.emit()
    )
    order_button.disabled = true
    set_portfolio_data({
        "balance_eva": 50,
        "items": [],
    })


func set_portfolio_data(data: Dictionary) -> void:
    balance_label.text = "BALANCE: %s EVA" % _format_eva_number(data.get("balance_eva", 0.0))
    _clear_list()

    var items_value: Variant = data.get("items", [])
    assert(items_value is Array)
    var items: Array = items_value as Array
    empty_state_label.visible = items.is_empty()
    list_container.visible = not items.is_empty()
    order_button.visible = not items.is_empty()

    for item_value: Variant in items:
        assert(item_value is Dictionary)
        list_container.add_child(_build_item_row(item_value as Dictionary))


func _clear_list() -> void:
    for child: Node in list_container.get_children():
        child.queue_free()


func _build_item_row(item: Dictionary) -> Control:
    var row: PanelContainer = PanelContainer.new()
    row.custom_minimum_size = Vector2(0, 74)
    row.add_theme_stylebox_override("panel", _row_style())

    var margin: MarginContainer = MarginContainer.new()
    margin.add_theme_constant_override("margin_left", 10)
    margin.add_theme_constant_override("margin_top", 8)
    margin.add_theme_constant_override("margin_right", 10)
    margin.add_theme_constant_override("margin_bottom", 8)
    row.add_child(margin)

    var layout: HBoxContainer = HBoxContainer.new()
    layout.add_theme_constant_override("separation", 10)
    margin.add_child(layout)

    var color_strip: ColorRect = ColorRect.new()
    color_strip.custom_minimum_size = Vector2(7, 0)
    color_strip.color = item.get("region_color", Color(0.64, 0.83, 0.55, 1.0))
    layout.add_child(color_strip)

    var copy_column: VBoxContainer = VBoxContainer.new()
    copy_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    copy_column.add_theme_constant_override("separation", 2)
    layout.add_child(copy_column)

    copy_column.add_child(_label(str(item.get("title", "Terrain")), 15, true, TextColor))
    copy_column.add_child(_label(str(item.get("subtitle", "")), 11, false, MutedTextColor))
    copy_column.add_child(_label(str(item.get("order_status", "")), 11, false, MutedTextColor))

    var stats_column: VBoxContainer = VBoxContainer.new()
    stats_column.custom_minimum_size = Vector2(128, 0)
    stats_column.add_theme_constant_override("separation", 2)
    layout.add_child(stats_column)

    stats_column.add_child(_label("LV %d" % int(item.get("level", 0)), 14, true, TextColor, HORIZONTAL_ALIGNMENT_RIGHT))
    stats_column.add_child(_label("Rent %s EVA" % _format_eva_number(item.get("rent_eva", 0.0)), 11, false, MutedTextColor, HORIZONTAL_ALIGNMENT_RIGHT))
    stats_column.add_child(_label(str(item.get("next_order", "")), 11, false, MutedTextColor, HORIZONTAL_ALIGNMENT_RIGHT))

    return row


func _row_style() -> StyleBoxFlat:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = RowBackground
    style.corner_radius_top_left = 6
    style.corner_radius_top_right = 6
    style.corner_radius_bottom_right = 6
    style.corner_radius_bottom_left = 6
    style.border_width_left = 1
    style.border_width_top = 1
    style.border_width_right = 1
    style.border_width_bottom = 1
    style.border_color = Color(0.46, 0.435, 0.38, 0.24)
    return style


func _label(
    text_value: String,
    font_size: int,
    bold: bool,
    color: Color,
    alignment: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT
) -> Label:
    var label: Label = Label.new()
    label.text = text_value
    label.add_theme_color_override("font_color", color)
    label.add_theme_font_size_override("font_size", font_size)
    if bold:
        label.add_theme_font_override("font", preload("res://fonts/Montserrat/Montserrat-Bold.otf"))
    label.horizontal_alignment = alignment
    label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
    return label


func _format_eva_number(value: Variant) -> String:
    var numeric_value: float = float(value)
    if is_equal_approx(numeric_value, roundf(numeric_value)):
        return "%d" % int(roundf(numeric_value))

    return "%.1f" % numeric_value
