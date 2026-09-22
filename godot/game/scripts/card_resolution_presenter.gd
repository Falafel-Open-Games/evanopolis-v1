# ---
# summary: Builds luck/destiny card resolution panel state from snapshots and events.
# ---
class_name CardResolutionPresenter
extends RefCounted

const LuckCardIcon: Texture2D = preload("res://assets/noun-luck-4700339-white.svg")
const DestinyCardIcon: Texture2D = preload("res://assets/noun-illuminati-6660364-white.svg")


func build_panel_state(view_model: Variant, presentation_busy: bool, language: String) -> Dictionary:
    if presentation_busy or not view_model.has_snapshot():
        return _hidden_state()
    if not view_model.is_local_active_player():
        return _build_observer_pending_state(view_model, language)

    var pending_card: Dictionary = view_model.get_pending_card_resolution()
    if pending_card.is_empty():
        if view_model.has_action("request_end_turn") and _is_local_player_on_card_space(view_model):
            return _visible_state("request_end_turn", _build_resolved_card_panel_data(view_model, language))

        return _hidden_state()

    if str(pending_card.get("player_id", "")) != view_model.local_player_id:
        return _hidden_state()

    if view_model.has_action("request_resolve_card"):
        return _visible_state("request_resolve_card", _build_card_panel_data(view_model, pending_card, false, language))

    if view_model.has_action("request_accept_game_over"):
        return _visible_state("request_accept_game_over", _build_card_panel_data(view_model, pending_card, true, language))

    return _hidden_state()


func _build_observer_pending_state(view_model: Variant, language: String = "en") -> Dictionary:
    if view_model.observer_card_resolved:
        return _hidden_state()

    var pending_card: Dictionary = view_model.get_pending_card_resolution()
    if pending_card.is_empty():
        return _hidden_state()
    if str(pending_card.get("player_id", "")) != view_model.active_player_id:
        return _hidden_state()

    var pending_data: Dictionary = _build_card_panel_data(view_model, pending_card, false, language)
    pending_data["show_action"] = false
    return _visible_state("", pending_data)


func _hidden_state() -> Dictionary:
    return {
        "visible": false,
        "command": "",
        "data": {},
    }


func _visible_state(command: String, data: Dictionary) -> Dictionary:
    return {
        "visible": true,
        "command": command,
        "data": data,
    }


func _build_card_panel_data(view_model: Variant, pending_card: Dictionary, danger: bool, language: String) -> Dictionary:
    var deck_id: String = str(pending_card.get("deck_id", "destiny"))
    var card_id: String = str(pending_card.get("card_id", ""))
    var effect: Dictionary = _card_effect(pending_card)
    var amount_eva: float = float(effect.get("amount_eva", 0.0))
    var effect_text: String = _format_card_effect_text(amount_eva)
    if danger:
        effect_text = "INSUFFICIENT EVA"

    return {
        "deck_id": deck_id,
        "deck_label": _card_deck_label(deck_id, language),
        "title": _card_title(deck_id, language),
        "body": _card_body(view_model, deck_id, card_id, amount_eva, danger, language),
        "effect_text": effect_text,
        "primary_action": "ACCEPT GAME OVER" if danger else "APPLY CARD",
        "danger": danger,
        "icon": LuckCardIcon if deck_id == "luck" else DestinyCardIcon,
    }


func _build_resolved_card_panel_data(view_model: Variant, language: String) -> Dictionary:
    var event: Dictionary = _latest_card_resolved_event_for_local_player(view_model)
    if event.is_empty():
        return {
            "deck_id": _deck_id_for_local_card_space(view_model),
            "deck_label": _card_deck_label(_deck_id_for_local_card_space(view_model), language),
            "title": "Card Resolved",
            "body": "The card effect has been applied. End your turn when ready.",
            "effect_text": "CARD RESOLVED",
            "primary_action": "END TURN",
            "icon": LuckCardIcon if _deck_id_for_local_card_space(view_model) == "luck" else DestinyCardIcon,
        }
    var data: Dictionary = _build_resolved_card_data(view_model, event, language)
    data["primary_action"] = "END TURN"
    return data


func _build_resolved_card_data(view_model: Variant, event: Dictionary, language: String) -> Dictionary:
    var deck_id: String = str(event.get("deck_id", "destiny"))
    var card_id: String = str(event.get("card_id", ""))
    var amount_eva: float = float(event.get("amount_eva", 0.0))
    var effect_text: String = _format_card_effect_text(amount_eva)
    return {
        "deck_id": deck_id,
        "deck_label": _card_deck_label(deck_id, language),
        "title": "Card Resolved" if card_id == "" else _card_title(deck_id, language),
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


func _card_deck_label(deck_id: String, language: String) -> String:
    if deck_id == "luck":
        if language == "es":
            return "SUERTE"
        if language == "pt_br":
            return "SORTE"
        return "LUCK"

    return "DESTINO" if language == "es" or language == "pt_br" else "DESTINY"


func _card_title(deck_id: String, language: String) -> String:
    if language == "es":
        return "Evento de suerte" if deck_id == "luck" else "Evento de destino"
    if language == "pt_br":
        return "Evento de sorte" if deck_id == "luck" else "Evento de destino"
    return "Luck Event" if deck_id == "luck" else "Destiny Event"


func _card_body(
    view_model: Variant,
    deck_id: String,
    card_id: String,
    amount_eva: float,
    danger: bool,
    language: String
) -> String:
    if danger:
        return "The payment is larger than your available EVA balance."
    var definition: Dictionary = _card_definition(view_model, deck_id, card_id)
    var labels_value: Variant = definition.get("labels", {})
    if labels_value is Dictionary:
        var labels: Dictionary = labels_value as Dictionary
        return str(labels.get(language, labels.get("en", "")))
    if amount_eva < 0.0:
        return "Pay EVA to resolve this card."

    return "Receive EVA from the bank."


func _card_definition(view_model: Variant, deck_id: String, card_id: String) -> Dictionary:
    var decks: Array = view_model.definition.get("card_decks", [])
    for deck_value: Variant in decks:
        assert(deck_value is Dictionary)
        var deck: Dictionary = deck_value as Dictionary
        if str(deck.get("deck_id", "")) != deck_id:
            continue
        var cards: Array = deck.get("cards", [])
        for card_value: Variant in cards:
            assert(card_value is Dictionary)
            var card: Dictionary = card_value as Dictionary
            if str(card.get("card_id", "")) == card_id:
                return card
    return {}


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
