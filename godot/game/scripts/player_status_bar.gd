# ---
# summary: Shows the local player's persistent match HUD and command buttons.
# ---
class_name PlayerStatusBar
extends PanelContainer

signal primary_command_pressed(command_type: String)
signal portfolio_pressed()
signal players_panel_requested()

const RollCommand: String = "request_roll"
const EndTurnCommand: String = "request_end_turn"
const PlayerStatusTheme: Theme = preload("res://game/ui/property-decision-panel-theme.tres")
const PrimaryTextColor: Color = Color(0.12, 0.112, 0.095, 1.0)

@onready var player_color: ColorRect = %PlayerColor
@onready var player_label: Label = %PlayerLabel
@onready var balance_label: Label = %BalanceLabel
@onready var owned_label: Label = %OwnedLabel
@onready var players_button: Button = %PlayersButton
@onready var roll_button: Button = %RollButton
@onready var portfolio_button: Button = %PortfolioButton
@onready var game_over_label: Label = %GameOverLabel

var primary_command_type: String = RollCommand
var players_popup: PopupPanel
var players_list: VBoxContainer
var players_popup_open: bool = false


func _ready() -> void:
    roll_button.pressed.connect(func() -> void:
        primary_command_pressed.emit(primary_command_type)
    )
    portfolio_button.pressed.connect(func() -> void:
        portfolio_pressed.emit()
    )
    players_button.button_down.connect(_toggle_players_popup)
    _create_players_popup()
    players_popup.popup_hide.connect(func() -> void:
        if not (Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and players_button.is_hovered()):
            players_popup_open = false
    )


func close_players_popup() -> void:
    players_popup_open = false
    if players_popup.visible:
        players_popup.hide()


func set_player_summary(
    required_player_label: String,
    player_color_value: Color,
    balance_eva: float,
    owned_property_count: int
) -> void:
    assert(required_player_label != "")
    assert(owned_property_count >= 0)

    player_label.text = required_player_label
    player_color.color = player_color_value
    balance_label.text = "BALANCE: %s EVA" % _format_eva_number(balance_eva)
    owned_label.text = "OWNED: %d" % owned_property_count


func set_player_roster(player_summaries: Array[Dictionary]) -> void:
    assert(players_list != null)

    for child: Node in players_list.get_children():
        child.free()

    for player_summary: Dictionary in player_summaries:
        var row: HBoxContainer = HBoxContainer.new()
        row.custom_minimum_size = Vector2(244, 30)
        row.add_theme_constant_override("separation", 8)
        players_list.add_child(row)

        var color_marker: ColorRect = ColorRect.new()
        color_marker.custom_minimum_size = Vector2(10, 22)
        color_marker.color = player_summary.get("color", Color.WHITE)
        row.add_child(color_marker)

        var identity_label: Label = Label.new()
        identity_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
        identity_label.text = str(player_summary.get("label", "Player"))
        identity_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        identity_label.add_theme_color_override("font_color", PrimaryTextColor)
        row.add_child(identity_label)

        var balance_value: float = float(player_summary.get("balance_eva", 0.0))
        var balance_label_row: Label = Label.new()
        balance_label_row.text = "%s EVA" % _format_eva_number(balance_value)
        balance_label_row.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
        balance_label_row.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        balance_label_row.add_theme_color_override("font_color", PrimaryTextColor)
        row.add_child(balance_label_row)

        var status_label_row: Label = Label.new()
        status_label_row.custom_minimum_size = Vector2(68, 22)
        status_label_row.text = str(player_summary.get("status_label", ""))
        status_label_row.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
        status_label_row.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        status_label_row.add_theme_font_size_override("font_size", 10)
        status_label_row.add_theme_color_override("font_color", Color(0.35, 0.33, 0.29, 1.0))
        row.add_child(status_label_row)

    players_popup.reset_size()
    players_button.disabled = player_summaries.is_empty()


func _create_players_popup() -> void:
    players_popup = PopupPanel.new()
    players_popup.name = "PlayersPopup"
    players_popup.theme = PlayerStatusTheme
    players_popup.add_theme_stylebox_override(
        "panel",
        PlayerStatusTheme.get_stylebox("panel", "PanelContainer")
    )
    players_popup.size = Vector2i(300, 0)
    players_popup.transparent_bg = true
    add_child(players_popup)

    var margin: MarginContainer = MarginContainer.new()
    margin.add_theme_constant_override("margin_left", 12)
    margin.add_theme_constant_override("margin_top", 10)
    margin.add_theme_constant_override("margin_right", 12)
    margin.add_theme_constant_override("margin_bottom", 10)
    players_popup.add_child(margin)

    players_list = VBoxContainer.new()
    players_list.add_theme_constant_override("separation", 4)
    margin.add_child(players_list)


func _toggle_players_popup() -> void:
    if players_popup_open:
        close_players_popup()
        return

    players_popup_open = true
    players_panel_requested.emit()
    var popup_position: Vector2 = players_button.get_screen_position()
    var popup_size: Vector2 = players_popup.size
    players_popup.popup(Rect2i(
        Vector2i(int(popup_position.x + players_button.size.x - popup_size.x), int(popup_position.y + players_button.size.y + 10)),
        Vector2i(int(popup_size.x), int(popup_size.y))
    ))


func set_game_over_state(is_game_over: bool) -> void:
    if not is_game_over:
        _set_terminal_status("")
        return

    _set_terminal_status("GAME OVER")


func set_winner_state(is_winner: bool) -> void:
    if not is_winner:
        _set_terminal_status("")
        return

    _set_terminal_status("YOU WIN")


func _set_terminal_status(status_label: String) -> void:
    var is_terminal: bool = status_label != ""
    roll_button.visible = not is_terminal
    portfolio_button.visible = not is_terminal
    game_over_label.visible = is_terminal
    game_over_label.text = status_label
    if is_terminal:
        primary_command_type = RollCommand


func set_primary_command(command_type: String, label: String, enabled: bool, presentation_busy: bool) -> void:
    assert(command_type == RollCommand or command_type == EndTurnCommand)
    assert(label != "")

    set_game_over_state(false)
    primary_command_type = command_type
    roll_button.text = label
    roll_button.disabled = presentation_busy or not enabled
    roll_button.visible = true
    portfolio_button.disabled = false


func _format_eva_number(value_to_format: float) -> String:
    if is_equal_approx(value_to_format, roundf(value_to_format)):
        return "%d" % int(roundf(value_to_format))

    return "%.1f" % value_to_format
