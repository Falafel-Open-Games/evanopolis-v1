# ---
# summary: Shows the local player's persistent match HUD and command buttons.
# ---
class_name PlayerStatusBar
extends PanelContainer

signal primary_command_pressed(command_type: String)

const RollCommand: String = "request_roll"
const EndTurnCommand: String = "request_end_turn"

@onready var player_color: ColorRect = %PlayerColor
@onready var player_label: Label = %PlayerLabel
@onready var balance_label: Label = %BalanceLabel
@onready var owned_label: Label = %OwnedLabel
@onready var roll_button: Button = %RollButton
@onready var portfolio_button: Button = %PortfolioButton
@onready var game_over_label: Label = %GameOverLabel

var primary_command_type: String = RollCommand


func _ready() -> void:
    roll_button.pressed.connect(func() -> void:
        primary_command_pressed.emit(primary_command_type)
    )
    portfolio_button.disabled = true


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


func _format_eva_number(value_to_format: float) -> String:
    if is_equal_approx(value_to_format, roundf(value_to_format)):
        return "%d" % int(roundf(value_to_format))

    return "%.1f" % value_to_format
