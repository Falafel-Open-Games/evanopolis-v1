# ---
# summary: Shows the local player's owned terrain and development order state.
# ---
class_name PortfolioPanel
extends PanelContainer

signal order_development_pressed(space_id: String)

const RowBackground: Color = Color(0.93, 0.90, 0.84, 1.0)
const TextColor: Color = Color(0.12, 0.112, 0.095, 1.0)
const MutedTextColor: Color = Color(0.34, 0.315, 0.275, 1.0)
const SelectedBorderColor: Color = Color(0.10, 0.34, 0.18, 1.0)

@onready var empty_state_label: Label = %EmptyStateLabel
@onready var list_container: VBoxContainer = %ListContainer
@onready var unavailable_hint_label: Label = %UnavailableHintLabel
@onready var order_button: Button = %OrderButton

var order_space_id: String = ""
var selected_space_id: String = ""
var portfolio_items: Array[Dictionary] = []
var order_available: bool = false


func _ready() -> void:
    order_button.pressed.connect(func() -> void:
        assert(order_space_id != "")
        order_development_pressed.emit(order_space_id)
    )
    set_portfolio_data({
        "items": [],
        "primary_action": "ORDER SOON",
        "primary_action_enabled": false,
        "primary_order_space_id": "",
    })


func set_portfolio_data(data: Dictionary) -> void:
    _clear_list()

    var items_value: Variant = data.get("items", [])
    assert(items_value is Array)
    order_available = bool(data.get("order_available", false))
    portfolio_items.clear()
    for item_value: Variant in items_value as Array:
        assert(item_value is Dictionary)
        portfolio_items.append(item_value as Dictionary)

    if not _has_item_for_space(selected_space_id):
        selected_space_id = ""

    empty_state_label.visible = portfolio_items.is_empty()
    list_container.visible = not portfolio_items.is_empty()
    order_button.visible = not portfolio_items.is_empty() and order_available
    unavailable_hint_label.visible = not portfolio_items.is_empty() and not order_available
    _refresh_order_button()

    for item: Dictionary in portfolio_items:
        list_container.add_child(_build_list_item(item))


func _clear_list() -> void:
    for child: Node in list_container.get_children():
        list_container.remove_child(child)
        child.free()


func _build_list_item(item: Dictionary) -> Control:
    if str(item.get("item_type", "")) == "section_header":
        return _build_section_header(item)

    return _build_item_row(item)


func _build_section_header(item: Dictionary) -> Control:
    var margin: MarginContainer = MarginContainer.new()
    margin.name = "SectionHeader"
    margin.add_theme_constant_override("margin_left", 4)
    margin.add_theme_constant_override("margin_top", 2)
    margin.add_theme_constant_override("margin_right", 4)
    margin.add_theme_constant_override("margin_bottom", 0)
    margin.mouse_filter = Control.MOUSE_FILTER_IGNORE

    var label: Label = _label(str(item.get("title", "")), 11, true, MutedTextColor)
    label.name = "SectionHeaderLabel"
    label.add_theme_constant_override("outline_size", 0)
    margin.add_child(label)

    return margin


func _build_item_row(item: Dictionary) -> Control:
    var row: PanelContainer = PanelContainer.new()
    row.name = "PortfolioRow"
    var is_special_property: bool = str(item.get("item_type", "")) == "special_property"
    row.custom_minimum_size = Vector2(0, 92 if is_special_property else 74)
    var selectable: bool = bool(item.get("selectable", true))
    row.mouse_filter = Control.MOUSE_FILTER_STOP if selectable else Control.MOUSE_FILTER_IGNORE
    row.add_theme_stylebox_override("panel", _row_style(
        str(item.get("space_id", "")) == selected_space_id,
        selectable,
        item
    ))
    row.gui_input.connect(func(event: InputEvent) -> void:
        if selectable and _is_select_input(event):
            _select_space_id(str(item.get("space_id", "")))
    )

    var margin: MarginContainer = MarginContainer.new()
    margin.name = "RowMargin"
    margin.add_theme_constant_override("margin_left", 10)
    margin.add_theme_constant_override("margin_top", 8)
    margin.add_theme_constant_override("margin_right", 10)
    margin.add_theme_constant_override("margin_bottom", 8)
    row.add_child(margin)

    var layout: HBoxContainer = HBoxContainer.new()
    layout.name = "RowLayout"
    layout.add_theme_constant_override("separation", 10)
    margin.add_child(layout)

    var color_strip: ColorRect = ColorRect.new()
    color_strip.name = "ColorStrip"
    color_strip.custom_minimum_size = Vector2(7, 0)
    color_strip.color = item.get("region_color", Color(0.64, 0.83, 0.55, 1.0))
    layout.add_child(color_strip)

    var copy_column: VBoxContainer = VBoxContainer.new()
    copy_column.name = "CopyColumn"
    copy_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    copy_column.add_theme_constant_override("separation", 2)
    layout.add_child(copy_column)

    var title_label: Label = _label(str(item.get("title", "Terrain")), 15, true, TextColor)
    title_label.name = "TitleLabel"
    copy_column.add_child(title_label)
    var subtitle_label: Label = _label(str(item.get("subtitle", "")), 11, false, MutedTextColor)
    subtitle_label.name = "SubtitleLabel"
    copy_column.add_child(subtitle_label)
    var order_status_label: Label = _label(str(item.get("order_status", "")), 11, false, MutedTextColor)
    order_status_label.name = "OrderStatusLabel"
    if is_special_property:
        _allow_wrapped_copy(order_status_label)
    copy_column.add_child(order_status_label)

    var stats_column: VBoxContainer = VBoxContainer.new()
    stats_column.name = "StatsColumn"
    stats_column.custom_minimum_size = Vector2(128, 0)
    stats_column.add_theme_constant_override("separation", 2)
    layout.add_child(stats_column)

    stats_column.add_child(_label(str(item.get("level_label", "LV %d" % int(item.get("level", 0)))), 14, true, TextColor, HORIZONTAL_ALIGNMENT_RIGHT))
    stats_column.add_child(_label(str(item.get("rent_label", "Rent %s EVA" % _format_eva_number(item.get("rent_eva", 0.0)))), 11, false, MutedTextColor, HORIZONTAL_ALIGNMENT_RIGHT))
    stats_column.add_child(_label(str(item.get("next_order", "")), 11, false, MutedTextColor, HORIZONTAL_ALIGNMENT_RIGHT))

    return row


func _select_space_id(space_id: String) -> void:
    assert(space_id != "")
    if not _is_selectable_space(space_id):
        return

    selected_space_id = "" if selected_space_id == space_id else space_id
    _rebuild_rows()
    _refresh_order_button()


func _is_select_input(event: InputEvent) -> bool:
    if event is InputEventMouseButton:
        var mouse_event: InputEventMouseButton = event as InputEventMouseButton
        return mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed
    if event is InputEventScreenTouch:
        var touch_event: InputEventScreenTouch = event as InputEventScreenTouch
        return touch_event.pressed

    return false


func _rebuild_rows() -> void:
    _clear_list()
    for item: Dictionary in portfolio_items:
        list_container.add_child(_build_list_item(item))


func _refresh_order_button() -> void:
    if not order_available:
        order_space_id = ""
        order_button.text = "SELECT TERRAIN"
        order_button.disabled = true
        return

    var selected_item: Dictionary = _selected_item()
    if selected_item.is_empty():
        order_space_id = ""
        order_button.text = "SELECT TERRAIN"
        order_button.disabled = true
        return

    order_space_id = selected_space_id
    order_button.text = str(selected_item.get("primary_action", "ORDER SOON"))
    order_button.disabled = not bool(selected_item.get("primary_action_enabled", false))


func _selected_item() -> Dictionary:
    for item: Dictionary in portfolio_items:
        if str(item.get("item_type", "")) == "section_header":
            continue
        if str(item.get("space_id", "")) == selected_space_id and bool(item.get("selectable", true)):
            return item

    return {}


func _has_item_for_space(space_id: String) -> bool:
    if space_id == "":
        return false

    for item: Dictionary in portfolio_items:
        if str(item.get("item_type", "")) == "section_header":
            continue
        if str(item.get("space_id", "")) == space_id and bool(item.get("selectable", true)):
            return true

    return false


func _is_selectable_space(space_id: String) -> bool:
    for item: Dictionary in portfolio_items:
        if str(item.get("item_type", "")) == "section_header":
            continue
        if str(item.get("space_id", "")) == space_id:
            return bool(item.get("selectable", true))

    return false


func _row_style(selected: bool, selectable: bool, item: Dictionary) -> StyleBoxFlat:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    var effective_selected: bool = selected and selectable
    var row_background_color: Color = item.get("row_background_color", RowBackground)
    var row_border_color: Color = item.get("row_border_color", Color(0.46, 0.435, 0.38, 0.24))
    style.bg_color = Color(0.96, 0.94, 0.89, 1.0) if effective_selected else row_background_color
    style.corner_radius_top_left = 6
    style.corner_radius_top_right = 6
    style.corner_radius_bottom_right = 6
    style.corner_radius_bottom_left = 6
    style.border_width_left = 5 if effective_selected else 2
    style.border_width_top = 2 if effective_selected else 1
    style.border_width_right = 2 if effective_selected else 1
    style.border_width_bottom = 2 if effective_selected else 1
    style.border_color = SelectedBorderColor if effective_selected else row_border_color
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


func _allow_wrapped_copy(label: Label) -> void:
    label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    label.text_overrun_behavior = TextServer.OVERRUN_NO_TRIMMING


func _format_eva_number(value: Variant) -> String:
    var numeric_value: float = float(value)
    if is_equal_approx(numeric_value, roundf(numeric_value)):
        return "%d" % int(roundf(numeric_value))

    return "%.1f" % numeric_value
