# ---
# summary: Presents non-blocking toast notifications for gameplay feedback.
# ---
class_name ToastPresenter
extends RefCounted

const HiddenOffsetBottom: float = 46.0
const HiddenOffsetTop: float = -4.0
const LeftOffset: float = 24.0
const RightOffset: float = 464.0
const SlideSeconds: float = 0.18
const TextFontSize: int = 18
const VisibleOffsetBottom: float = -26.0
const VisibleOffsetTop: float = -76.0
const VisibleSeconds: float = 3.0

var label: Label
var panel: PanelContainer
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
