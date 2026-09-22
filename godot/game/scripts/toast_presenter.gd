# ---
# summary: Presents non-blocking toast notifications for gameplay feedback.
# ---
class_name ToastPresenter
extends RefCounted

signal replay_requested(event: Dictionary)
signal music_toggled(enabled: bool)

const MusicIcon: Texture2D = preload("res://assets/1-bit_Pixel_Icons/Sprites_Cropped/Media_Musical_Note_Quaver.png")

const HistoryIconSvg: String = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="none" stroke="#f4ecd8" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7"><path d="M3.1 6.3a6.3 6.3 0 1 1-.4 4.3"/><path d="M3.1 2.8v3.5h3.5"/><path d="M9 5.5V9l2.5 1.7"/></g></svg>'
const PreviousIconSvg: String = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="m11.5 3.5-5 5.5 5 5.5" fill="none" stroke="#f4ecd8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>'
const NextIconSvg: String = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="m6.5 3.5 5 5.5-5 5.5" fill="none" stroke="#f4ecd8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>'
const ListIconSvg: String = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="#f4ecd8"><circle cx="3" cy="4" r="1.2"/><circle cx="3" cy="9" r="1.2"/><circle cx="3" cy="14" r="1.2"/></g><g fill="none" stroke="#f4ecd8" stroke-linecap="round" stroke-width="1.8"><path d="M6 4h9M6 9h9M6 14h9"/></g></svg>'

const HiddenOffsetBottom: float = -10.0
const HiddenOffsetTop: float = -60.0
const LeftOffset: float = 24.0
const RightOffset: float = 464.0
const SlideSeconds: float = 0.18
const TextFontSize: int = 15
const VisibleOffsetBottom: float = -72.0
const VisibleOffsetTop: float = -122.0
const VisibleSeconds: float = 3.0

var label: Label
var panel: PanelContainer
var history_events: Array[Dictionary] = []
var history_index: int = -1
var history_button: Button
var previous_button: Button
var next_button: Button
var history_count_label: Label
var event_log_button: Button
var event_log_panel: PanelContainer
var event_log_list: VBoxContainer
var music_button: Button
var serial: int = 0
var tween: Tween


func setup(parent_overlay: CanvasLayer) -> void:
    assert(parent_overlay != null)

    panel = PanelContainer.new()
    panel.name = "ToastPanel"
    panel.anchor_left = 0.0
    panel.anchor_top = 1.0
    panel.anchor_right = 0.0
    panel.anchor_bottom = 1.0
    panel.grow_vertical = Control.GROW_DIRECTION_BEGIN
    panel.offset_left = LeftOffset
    panel.offset_top = VisibleOffsetTop
    panel.offset_right = RightOffset
    panel.offset_bottom = VisibleOffsetBottom
    panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
    panel.visible = false

    var panel_style: StyleBoxFlat = StyleBoxFlat.new()
    panel_style.bg_color = Color(0.09, 0.085, 0.075, 0.88)
    panel_style.corner_radius_top_left = 6
    panel_style.corner_radius_top_right = 6
    panel_style.corner_radius_bottom_left = 6
    panel_style.corner_radius_bottom_right = 6
    panel.add_theme_stylebox_override("panel", panel_style)

    var margin: MarginContainer = MarginContainer.new()
    margin.name = "ToastMargin"
    margin.add_theme_constant_override("margin_left", 14)
    margin.add_theme_constant_override("margin_top", 8)
    margin.add_theme_constant_override("margin_right", 14)
    margin.add_theme_constant_override("margin_bottom", 8)
    panel.add_child(margin)

    label = Label.new()
    label.name = "ToastLabel"
    label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
    label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    label.add_theme_color_override("font_color", Color(1.0, 0.96, 0.84, 1.0))
    label.add_theme_font_size_override("font_size", TextFontSize)
    margin.add_child(label)
    parent_overlay.add_child(panel)
    _setup_history_controls(parent_overlay)


func _setup_history_controls(parent_overlay: CanvasLayer) -> void:
    var controls: HBoxContainer = HBoxContainer.new()
    controls.name = "ToastHistoryControls"
    controls.anchor_top = 1.0
    controls.anchor_bottom = 1.0
    controls.offset_left = LeftOffset
    controls.offset_right = LeftOffset + 182.0
    controls.offset_top = -60.0
    controls.offset_bottom = -26.0
    controls.add_theme_constant_override("separation", 2)
    parent_overlay.add_child(controls)

    previous_button = Button.new()
    previous_button.name = "PreviousEventButton"
    previous_button.icon = _icon_texture(PreviousIconSvg)
    previous_button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
    previous_button.tooltip_text = "Previous event"
    previous_button.custom_minimum_size = Vector2(30.0, 32.0)
    previous_button.pressed.connect(_on_previous_pressed)
    controls.add_child(previous_button)

    next_button = Button.new()
    next_button.name = "NextEventButton"
    next_button.icon = _icon_texture(NextIconSvg)
    next_button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
    next_button.tooltip_text = "Next event"
    next_button.custom_minimum_size = Vector2(30.0, 32.0)
    next_button.pressed.connect(_on_next_pressed)
    controls.add_child(next_button)

    history_button = Button.new()
    history_button.name = "HistoryButton"
    history_button.icon = _icon_texture(HistoryIconSvg)
    history_button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
    history_button.tooltip_text = "Replay latest event"
    history_button.custom_minimum_size = Vector2(34.0, 32.0)
    history_button.pressed.connect(_on_history_pressed)
    controls.add_child(history_button)

    event_log_button = Button.new()
    event_log_button.name = "EventLogButton"
    event_log_button.icon = _icon_texture(ListIconSvg)
    event_log_button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
    event_log_button.tooltip_text = "Show event log"
    event_log_button.custom_minimum_size = Vector2(34.0, 32.0)
    event_log_button.toggle_mode = true
    event_log_button.toggled.connect(_on_event_log_toggled)
    controls.add_child(event_log_button)

    history_count_label = Label.new()
    history_count_label.name = "HistoryCountLabel"
    history_count_label.add_theme_font_size_override("font_size", 12)
    controls.add_child(history_count_label)

    _setup_event_log_panel(parent_overlay)
    _setup_music_button(parent_overlay)
    _refresh_history_controls()


func _setup_event_log_panel(parent_overlay: CanvasLayer) -> void:
    event_log_panel = PanelContainer.new()
    event_log_panel.name = "EventLogPanel"
    event_log_panel.anchor_top = 1.0
    event_log_panel.anchor_bottom = 1.0
    event_log_panel.offset_left = LeftOffset
    event_log_panel.offset_top = -500.0
    event_log_panel.offset_right = RightOffset
    event_log_panel.offset_bottom = -72.0
    event_log_panel.visible = false

    var panel_style: StyleBoxFlat = StyleBoxFlat.new()
    panel_style.bg_color = Color(0.09, 0.085, 0.075, 0.96)
    panel_style.corner_radius_top_left = 6
    panel_style.corner_radius_top_right = 6
    panel_style.corner_radius_bottom_left = 6
    panel_style.corner_radius_bottom_right = 6
    event_log_panel.add_theme_stylebox_override("panel", panel_style)

    var margin: MarginContainer = MarginContainer.new()
    margin.add_theme_constant_override("margin_left", 14)
    margin.add_theme_constant_override("margin_top", 12)
    margin.add_theme_constant_override("margin_right", 14)
    margin.add_theme_constant_override("margin_bottom", 12)
    event_log_panel.add_child(margin)

    var layout: VBoxContainer = VBoxContainer.new()
    layout.add_theme_constant_override("separation", 8)
    margin.add_child(layout)

    var title: Label = Label.new()
    title.text = "EVENT LOG"
    title.add_theme_font_size_override("font_size", 16)
    layout.add_child(title)

    var scroll: ScrollContainer = ScrollContainer.new()
    scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
    scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
    layout.add_child(scroll)

    event_log_list = VBoxContainer.new()
    event_log_list.name = "EventLogList"
    event_log_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    event_log_list.add_theme_constant_override("separation", 4)
    scroll.add_child(event_log_list)
    parent_overlay.add_child(event_log_panel)


func _setup_music_button(parent_overlay: CanvasLayer) -> void:
    music_button = Button.new()
    music_button.name = "MusicToggleButton"
    music_button.anchor_left = 1.0
    music_button.anchor_top = 1.0
    music_button.anchor_right = 1.0
    music_button.anchor_bottom = 1.0
    music_button.offset_left = -26.0
    music_button.offset_top = -60.0
    music_button.offset_right = -2.0
    music_button.offset_bottom = -28.0
    music_button.icon = MusicIcon
    music_button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
    music_button.custom_minimum_size = Vector2(24.0, 32.0)
    music_button.flat = true
    music_button.toggle_mode = true
    music_button.button_pressed = true
    music_button.toggled.connect(_on_music_toggled)
    parent_overlay.add_child(music_button)
    _refresh_music_button()


func _icon_texture(svg_markup: String) -> Texture2D:
    var icon_image: Image = Image.new()
    var load_error: Error = icon_image.load_svg_from_string(svg_markup)
    assert(load_error == OK)
    return ImageTexture.create_from_image(icon_image)


func _on_music_toggled(enabled: bool) -> void:
    _refresh_music_button()
    music_toggled.emit(enabled)


func _refresh_music_button() -> void:
    music_button.tooltip_text = "Mute music" if music_button.button_pressed else "Play music"
    music_button.modulate = Color.WHITE if music_button.button_pressed else Color(1.0, 1.0, 1.0, 0.45)


func set_history(events: Array[Dictionary]) -> void:
    var was_at_latest: bool = history_index == history_events.size() - 1
    var selected_event: Dictionary = {}
    if history_index >= 0 and history_index < history_events.size():
        selected_event = history_events[history_index]
    history_events = events.duplicate(true)
    if history_events.is_empty():
        history_index = -1
    elif was_at_latest or history_index < 0:
        history_index = history_events.size() - 1
    else:
        var retained_index: int = history_events.find(selected_event)
        history_index = retained_index if retained_index >= 0 else 0
    _refresh_history_controls()
    _refresh_event_log()


func _refresh_event_log() -> void:
    for child: Node in event_log_list.get_children():
        event_log_list.remove_child(child)
        child.queue_free()
    for reverse_index: int in range(history_events.size() - 1, -1, -1):
        var entry: Dictionary = history_events[reverse_index]
        var row: Button = Button.new()
        row.name = "EventLogRow%d" % reverse_index
        row.text = str(entry.get("display_text", "Event"))
        row.alignment = HORIZONTAL_ALIGNMENT_LEFT
        row.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
        row.custom_minimum_size = Vector2(0.0, 44.0)
        row.pressed.connect(_on_event_log_row_pressed.bind(reverse_index))
        event_log_list.add_child(row)


func _refresh_history_controls() -> void:
    history_button.disabled = history_events.is_empty()
    event_log_button.disabled = history_events.is_empty()
    previous_button.disabled = history_index <= 0
    next_button.disabled = history_index >= history_events.size() - 1
    history_count_label.text = "0/0" if history_events.is_empty() else "%d/%d" % [history_index + 1, history_events.size()]
    if history_events.is_empty() and event_log_panel.visible:
        event_log_button.button_pressed = false


func _on_event_log_toggled(opened: bool) -> void:
    event_log_panel.visible = opened
    event_log_button.tooltip_text = "Hide event log" if opened else "Show event log"


func _on_event_log_row_pressed(selected_index: int) -> void:
    history_index = selected_index
    event_log_button.button_pressed = false
    _replay_selected()


func _on_history_pressed() -> void:
    if history_events.is_empty():
        return
    history_index = history_events.size() - 1
    _replay_selected()


func _on_previous_pressed() -> void:
    if history_index <= 0:
        return
    history_index -= 1
    _replay_selected()


func _on_next_pressed() -> void:
    if history_index >= history_events.size() - 1:
        return
    history_index += 1
    _replay_selected()


func _replay_selected() -> void:
    _refresh_history_controls()
    replay_requested.emit(history_events[history_index])


func show(message: String) -> void:
    assert(message != "")
    assert(panel != null)
    assert(label != null)

    serial += 1
    var current_serial: int = serial
    if tween != null:
        tween.kill()

    label.text = message
    panel.offset_top = HiddenOffsetTop
    panel.offset_bottom = HiddenOffsetBottom
    panel.visible = true
    panel.modulate = Color(1.0, 1.0, 1.0, 1.0)
    tween = panel.create_tween()
    tween.set_parallel(true)
    tween.set_trans(Tween.TRANS_CUBIC)
    tween.set_ease(Tween.EASE_OUT)
    tween.tween_property(panel, "offset_top", VisibleOffsetTop, SlideSeconds)
    tween.tween_property(panel, "offset_bottom", VisibleOffsetBottom, SlideSeconds)
    await tween.finished
    if current_serial != serial:
        return

    await panel.get_tree().create_timer(VisibleSeconds).timeout
    if current_serial != serial:
        return

    tween = panel.create_tween()
    tween.set_parallel(true)
    tween.set_trans(Tween.TRANS_CUBIC)
    tween.set_ease(Tween.EASE_IN)
    tween.tween_property(panel, "offset_top", HiddenOffsetTop, SlideSeconds)
    tween.tween_property(panel, "offset_bottom", HiddenOffsetBottom, SlideSeconds)
    await tween.finished
    if current_serial != serial:
        return

    panel.visible = false
