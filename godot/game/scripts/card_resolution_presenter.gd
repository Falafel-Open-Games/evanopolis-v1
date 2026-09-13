# ---
# summary: Builds luck/destiny card resolution panel state from snapshots and events.
# ---
class_name CardResolutionPresenter
extends RefCounted

const LuckCardIcon: Texture2D = preload("res://assets/noun-luck-4700339-white.svg")
const DestinyCardIcon: Texture2D = preload("res://assets/noun-illuminati-6660364-white.svg")


func build_panel_state(view_model: Variant, presentation_busy: bool) -> Dictionary:
    if presentation_busy or not view_model.has_snapshot():
        return _hidden_state()
    if not view_model.is_local_active_player():
        return _hidden_state()

    var pending_card: Dictionary = view_model.get_pending_card_resolution()
    if pending_card.is_empty():
        if view_model.has_action("request_end_turn") and _is_local_player_on_card_space(view_model):
            return _visible_state("request_end_turn", _build_resolved_card_panel_data(view_model))

        return _hidden_state()

    if str(pending_card.get("player_id", "")) != view_model.local_player_id:
        return _hidden_state()

    if view_model.has_action("request_resolve_card"):
        return _visible_state("request_resolve_card", _build_card_panel_data(pending_card, false))

    if view_model.has_action("request_accept_game_over"):
        return _visible_state("request_accept_game_over", _build_card_panel_data(pending_card, true))

    return _hidden_state()


func _hidden_state() -> Dictionary:
    return {
        "visible": false,
        "command": "",
        "data": {},
    }


func _visible_state(command: String, data: Dictionary) -> Dictionary:
    assert(command != "")
    return {
        "visible": true,
        "command": command,
        "data": data,
    }


func _build_card_panel_data(pending_card: Dictionary, danger: bool) -> Dictionary:
    var deck_id: String = str(pending_card.get("deck_id", "destiny"))
    var card_id: String = str(pending_card.get("card_id", ""))
    var effect: Dictionary = _card_effect(pending_card)
    var amount_eva: float = float(effect.get("amount_eva", 0.0))
    var effect_text: String = _format_card_effect_text(amount_eva)
    if danger:
        effect_text = "INSUFFICIENT EVA"

    return {
        "deck_id": deck_id,
        "deck_label": _card_deck_label(deck_id),
        "title": _card_title(card_id),
        "body": _card_body(card_id, amount_eva, danger),
        "effect_text": effect_text,
        "primary_action": "ACCEPT GAME OVER" if danger else "APPLY CARD",
        "danger": danger,
        "icon": LuckCardIcon if deck_id == "luck" else DestinyCardIcon,
    }


func _build_resolved_card_panel_data(view_model: Variant) -> Dictionary:
    var event: Dictionary = _latest_card_resolved_event_for_local_player(view_model)
    var deck_id: String = str(event.get("deck_id", _deck_id_for_local_card_space(view_model)))
    var card_id: String = str(event.get("card_id", ""))
    var amount_eva: float = float(event.get("amount_eva", 0.0))
    var effect_text: String = "CARD RESOLVED" if event.is_empty() else _format_card_effect_text(amount_eva)
    return {
        "deck_id": deck_id,
        "deck_label": _card_deck_label(deck_id),
        "title": "Card Resolved" if card_id == "" else _card_title(card_id),
        "body": _resolved_card_body(card_id),
        "effect_text": effect_text,
        "primary_action": "END TURN",
        "icon": LuckCardIcon if deck_id == "luck" else DestinyCardIcon,
    }


func _latest_card_resolved_event_for_local_player(view_model: Variant) -> Dictionary:
    var event: Variant = view_model.latest_event.get("event", {})
    if not event is Dictionary:
        return {}

    var event_dictionary: Dictionary = event as Dictionary
    if (
        str(event_dictionary.get("type", "")) == "card_resolved"
        and str(event_dictionary.get("player_id", "")) == view_model.local_player_id
    ):
        return event_dictionary

    return {}


func _resolved_card_body(card_id: String) -> String:
    if card_id == "":
        return "The card effect has been applied. End your turn when ready."

    return "The card effect has been applied. End your turn when ready."


func _card_effect(pending_card: Dictionary) -> Dictionary:
    var effect: Variant = pending_card.get("effect", {})
    if effect is Dictionary:
        return effect as Dictionary

    return {}


func _card_deck_label(deck_id: String) -> String:
    if deck_id == "luck":
        return "SUERTE"

    return "DESTINO"


func _card_title(card_id: String) -> String:
    if card_id == "luck_mining_bonus":
        return "Mining Bonus"
    if card_id == "luck_unexpected_client":
        return "Unexpected Client"
    if card_id == "luck_market_rally":
        return "Market Rally"
    if card_id == "destiny_operating_tax":
        return "Operating Tax"
    if card_id == "destiny_urgent_maintenance":
        return "Urgent Maintenance"
    if card_id == "destiny_favorable_market":
        return "Favorable Market"

    return "Card Drawn"


func _card_body(card_id: String, amount_eva: float, danger: bool) -> String:
    if danger:
        return "The payment is larger than your available EVA balance."
    if card_id == "luck_mining_bonus":
        return "A lucky production window pays out from the bank."
    if card_id == "luck_unexpected_client":
        return "A new client pays a small bonus from the bank."
    if card_id == "luck_market_rally":
        return "A market rally improves your EVA position."
    if card_id == "destiny_operating_tax":
        return "A scheduled operating tax is due before your turn can end."
    if card_id == "destiny_urgent_maintenance":
        return "Urgent maintenance costs must be paid now."
    if card_id == "destiny_favorable_market":
        return "A favorable market event pays out from the bank."
    if amount_eva < 0.0:
        return "Pay EVA to resolve this card."

    return "Receive EVA from the bank."


func _format_card_effect_text(amount_eva: float) -> String:
    var prefix: String = "+" if amount_eva >= 0.0 else "-"
    if is_equal_approx(amount_eva, roundf(amount_eva)):
        return "%s%d EVA" % [
            prefix,
            int(absf(amount_eva))
        ]

    return "%s%s EVA" % [
        prefix,
        _format_eva_number(absf(amount_eva))
    ]


func _is_local_player_on_card_space(view_model: Variant) -> bool:
    return _deck_id_for_local_card_space(view_model) != ""


func _deck_id_for_local_card_space(view_model: Variant) -> String:
    var local_position: int = view_model.get_local_player_position()
    if local_position < 0:
        return ""

    var space: Dictionary = view_model.get_space_definition(local_position)
    var space_kind: String = str(space.get("kind", ""))
    if space_kind == "luck":
        return "luck"
    if space_kind == "destiny":
        return "destiny"

    return ""


func _format_eva_number(value: Variant) -> String:
    var numeric_value: float = float(value)
    if is_equal_approx(numeric_value, roundf(numeric_value)):
        return "%d" % int(roundf(numeric_value))

    return "%.1f" % numeric_value
