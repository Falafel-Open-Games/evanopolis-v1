# ---
# summary: Binds data and interactions for the Suerte/Destino card panel mockup.
# ---
class_name CardResolutionPanel
extends PanelContainer

signal primary_action_pressed()

const LuckAccent: Color = Color(0.93, 0.68, 0.22, 1.0)
const DestinyAccent: Color = Color(0.55, 0.34, 0.76, 1.0)
const DangerAccent: Color = Color(0.78, 0.22, 0.20, 1.0)
const NormalEffectFontSize: int = 24
const DangerEffectFontSize: int = 20
const NormalButtonFontSize: int = 13
const DangerButtonFontSize: int = 11
const FullMinimumWidth: float = 584.0
const ReadOnlyMinimumWidth: float = 400.0

@onready var color_strip: ColorRect = %ColorStrip
@onready var icon_rect: TextureRect = %IconRect
@onready var deck_label: Label = %DeckLabel
@onready var title_label: Label = %TitleLabel
@onready var body_label: Label = %BodyLabel
@onready var effect_label: Label = %EffectLabel
@onready var action_column: VBoxContainer = $OuterMargin/Root/ActionColumn
@onready var primary_button: Button = %PrimaryButton


func _ready() -> void:
    primary_button.pressed.connect(func() -> void:
        primary_action_pressed.emit()
    )
    set_sample_destiny()


func set_card_data(data: Dictionary) -> void:
    var deck_id: String = str(data.get("deck_id", "destiny"))
    var danger: bool = bool(data.get("danger", false))
    var accent_color: Color = _accent_color(deck_id, danger)
    color_strip.color = accent_color
    deck_label.text = str(data.get("deck_label", deck_id.to_upper()))
    title_label.text = str(data.get("title", "CARD"))
    body_label.text = str(data.get("body", ""))
    effect_label.text = str(data.get("effect_text", ""))
    effect_label.add_theme_color_override("font_color", accent_color.darkened(0.18))
    effect_label.add_theme_font_size_override("font_size", DangerEffectFontSize if danger else NormalEffectFontSize)
    var show_action: bool = bool(data.get("show_action", true))
    action_column.visible = show_action
    custom_minimum_size = Vector2(FullMinimumWidth if show_action else ReadOnlyMinimumWidth, 156.0)
    primary_button.text = str(data.get("primary_action", "APPLY CARD"))
    primary_button.add_theme_font_size_override("font_size", DangerButtonFontSize if danger else NormalButtonFontSize)

    var icon: Variant = data.get("icon", null)
    if icon is Texture2D:
        icon_rect.texture = icon as Texture2D


func set_sample_luck() -> void:
    set_card_data({
        "deck_id": "luck",
        "deck_label": "SUERTE",
        "title": "Mining Bonus",
        "body": "A lucky production window pays out from the bank.",
        "effect_text": "+2 EVA",
        "primary_action": "APPLY CARD",
        "icon": preload("res://assets/noun-luck-4700339-white.svg"),
    })


func set_sample_destiny() -> void:
    set_card_data({
        "deck_id": "destiny",
        "deck_label": "DESTINO",
        "title": "Operating Tax",
        "body": "A scheduled operating tax is due before your turn can end.",
        "effect_text": "-2 EVA",
        "primary_action": "APPLY CARD",
        "icon": preload("res://assets/noun-illuminati-6660364-white.svg"),
    })


func set_sample_game_over() -> void:
    set_card_data({
        "deck_id": "destiny",
        "deck_label": "DESTINO",
        "title": "Operating Tax",
        "body": "The payment is larger than your available EVA balance.",
        "effect_text": "INSUFFICIENT EVA",
        "primary_action": "ACCEPT GAME OVER",
        "danger": true,
        "icon": preload("res://assets/noun-illuminati-6660364-white.svg"),
    })


func _accent_color(deck_id: String, danger: bool) -> Color:
    if danger:
        return DangerAccent
    if deck_id == "luck":
        return LuckAccent
    return DestinyAccent
