# ---
# summary: Builds property decision panel state from server-authoritative snapshots.
# ---
class_name PropertyDecisionPresenter
extends RefCounted

const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const SpecialPropertyAccentColor: Color = Color(0.84, 0.66, 0.28, 1.0)
const TerrainAccentColors: Dictionary[String, Color] = {
    "caracas": Color(0.63, 0.80, 0.96, 1.0),
    "asuncion": Color(0.64, 0.83, 0.55, 1.0),
    "ciudad_del_este": Color(0.78, 0.73, 0.33, 1.0),
    "minsk": Color(0.74, 0.46, 0.22, 1.0),
    "siberia": Color(0.80, 0.30, 0.30, 1.0),
    "texas": Color(0.62, 0.42, 0.78, 1.0),
}


func build_panel_state(view_model: Variant, presentation_busy: bool, language: String) -> Dictionary:
    if presentation_busy or not view_model.has_definition() or not view_model.has_snapshot():
        return _hidden_state()
    if not view_model.is_local_active_player():
        return _hidden_state()

    var pending_card: Dictionary = view_model.get_pending_card_resolution()
    if not pending_card.is_empty() and str(pending_card.get("player_id", "")) == view_model.local_player_id:
        return _hidden_state()
    if view_model.has_action("request_end_turn") and _is_local_player_on_card_space(view_model):
        return _hidden_state()

    var local_position: int = view_model.get_local_player_position()
    if local_position < 0:
        return _hidden_state()

    var space: Dictionary = view_model.get_space_definition(local_position)
    var space_kind: String = str(space.get("kind", ""))
    var space_id: String = str(space.get("space_id", ""))
    if space_kind == "terrain":
        return _build_terrain_panel_state(view_model, space, space_id, language)
    if space_kind == "special_property":
        return _build_special_property_panel_state(view_model, space, space_id, language)

    return _hidden_state()


func _build_terrain_panel_state(view_model: Variant, space: Dictionary, space_id: String, language: String) -> Dictionary:
    var pending_rent: Dictionary = view_model.get_pending_rent()
    if (
        not pending_rent.is_empty()
        and str(pending_rent.get("space_id", "")) == space_id
        and str(pending_rent.get("payer_player_id", "")) == view_model.local_player_id
    ):
        if view_model.has_action("request_pay_rent"):
            return _visible_state(
                "request_pay_rent",
                _build_rent_due_panel_data(space, pending_rent, language),
                view_model
            )
        if view_model.has_action("request_accept_game_over"):
            return _visible_state(
                "request_accept_game_over",
                _build_unaffordable_rent_panel_data(space, pending_rent, language),
                view_model
            )

    var owner_player_id: String = view_model.get_owner_player_id_for_space(space_id)
    if owner_player_id == "":
        if not view_model.has_action("request_purchase_property"):
            if not view_model.has_action("request_end_turn"):
                return _hidden_state()
            return _visible_state("request_end_turn", _build_unaffordable_property_panel_data(space, language), view_model)
        return _visible_state("request_purchase_property", _build_available_property_panel_data(space, language), view_model)

    if owner_player_id == view_model.local_player_id and view_model.has_action("request_end_turn"):
        return _visible_state(
            "request_end_turn",
            _build_self_owned_property_panel_data(space, owner_player_id, language),
            view_model
        )

    if owner_player_id != "" and view_model.has_action("request_end_turn"):
        return _visible_state("request_end_turn", _build_rent_paid_panel_data(space, owner_player_id, language), view_model)

    return _hidden_state()


func _build_special_property_panel_state(
    view_model: Variant,
    space: Dictionary,
    space_id: String,
    language: String
) -> Dictionary:
    var owner_player_id: String = view_model.get_owner_player_id_for_special_property(space_id)
    if owner_player_id == "":
        if not view_model.has_action("request_purchase_special_property"):
            if not view_model.has_action("request_end_turn"):
                return _hidden_state()
            return _visible_state(
                "request_end_turn",
                _build_unaffordable_special_property_panel_data(space, language),
                view_model
            )
        return _visible_state(
            "request_purchase_special_property",
            _build_available_special_property_panel_data(space, language),
            view_model
        )

    if owner_player_id == view_model.local_player_id and view_model.has_action("request_end_turn"):
        return _visible_state(
            "request_end_turn",
            _build_self_owned_special_property_panel_data(space, owner_player_id, language),
            view_model
        )

    if owner_player_id != "" and view_model.has_action("request_end_turn"):
        return _visible_state(
            "request_end_turn",
            _build_owned_special_property_panel_data(space, owner_player_id, language),
            view_model
        )

    return _hidden_state()


func _hidden_state() -> Dictionary:
    return {
        "visible": false,
        "command": "",
        "data": {},
    }


func _visible_state(command: String, data: Dictionary, view_model: Variant) -> Dictionary:
    assert(command != "")
    data["balance"] = "Balance: %s EVA" % _format_eva_number(view_model.get_local_player_eva_balance())
    return {
        "visible": true,
        "command": command,
        "data": data,
    }


func _is_local_player_on_card_space(view_model: Variant) -> bool:
    var local_position: int = view_model.get_local_player_position()
    if local_position < 0:
        return false

    var space: Dictionary = view_model.get_space_definition(local_position)
    var space_kind: String = str(space.get("kind", ""))
    return space_kind == "luck" or space_kind == "destiny"


func _build_available_property_panel_data(space: Dictionary, language: String) -> Dictionary:
    var purchase_price: int = int(space.get("purchase_price_eva", 0))
    var terrain_label: String = _localized_label(space, language)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Available",
        "price": "%d EVA" % purchase_price,
        "primary_action": "BUY FOR %d EVA" % purchase_price,
        "secondary_action": "PASS",
        "secondary_action_visible": true,
        "region_color": _accent_color_for_space(space),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "Container: %d EVA · each lot: +%d EVA" % [
            int(space.get("container_price_eva", 0)),
            int(space.get("machine_lot_price_eva", 0))
        ],
    }


func _build_unaffordable_property_panel_data(space: Dictionary, language: String) -> Dictionary:
    var terrain_label: String = _localized_label(space, language)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Available",
        "price": "Can't afford",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "Insufficient balance",
    }


func _build_available_special_property_panel_data(space: Dictionary, language: String) -> Dictionary:
    var purchase_price: int = int(space.get("purchase_price_eva", 0))
    var property_label: String = _localized_label(space, language)
    return {
        "title": property_label.to_upper(),
        "kind": "Special property",
        "status": "Available",
        "price": "%d EVA" % purchase_price,
        "primary_action": "BUY FOR %d EVA" % purchase_price,
        "secondary_action": "PASS",
        "secondary_action_visible": true,
        "region_color": SpecialPropertyAccentColor,
        "details_visible": true,
        "details_mode": "text",
        "details_title": "Rule",
        "development_rent_table": [],
        "details_note": _special_property_rule_text(space),
    }


func _build_unaffordable_special_property_panel_data(space: Dictionary, language: String) -> Dictionary:
    var property_label: String = _localized_label(space, language)
    return {
        "title": property_label.to_upper(),
        "kind": "Special property",
        "status": "Available",
        "price": "Can't afford",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": SpecialPropertyAccentColor,
        "details_visible": true,
        "details_mode": "text",
        "details_title": "Rule",
        "development_rent_table": [],
        "details_note": _special_property_rule_text(space),
    }


func _build_owned_special_property_panel_data(space: Dictionary, owner_player_id: String, language: String) -> Dictionary:
    var property_label: String = _localized_label(space, language)
    return {
        "title": property_label.to_upper(),
        "kind": "Special property",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "No rent",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": SpecialPropertyAccentColor,
        "status_color": _player_color_for_id(owner_player_id),
        "details_visible": true,
        "details_mode": "text",
        "details_title": "Rule",
        "development_rent_table": [],
        "details_note": _special_property_rule_text(space),
    }


func _build_self_owned_special_property_panel_data(space: Dictionary, owner_player_id: String, language: String) -> Dictionary:
    var property_label: String = _localized_label(space, language)
    return {
        "title": property_label.to_upper(),
        "kind": "Special property",
        "status": "Your property",
        "price": "Owned",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": SpecialPropertyAccentColor,
        "status_color": _player_color_for_id(owner_player_id),
        "details_visible": true,
        "details_mode": "text",
        "details_title": "Rule",
        "development_rent_table": [],
        "details_note": _special_property_rule_text(space),
    }


func _build_rent_due_panel_data(space: Dictionary, pending_rent: Dictionary, language: String) -> Dictionary:
    var owner_player_id: String = str(pending_rent.get("owner_player_id", ""))
    var terrain_label: String = _localized_label(space, language)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "Rent: %s EVA" % _format_eva_number(pending_rent.get("rent_eva", 0.0)),
        "primary_action": "PAY RENT",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "Base rent due now",
    }


func _build_unaffordable_rent_panel_data(space: Dictionary, pending_rent: Dictionary, language: String) -> Dictionary:
    var owner_player_id: String = str(pending_rent.get("owner_player_id", ""))
    var terrain_label: String = _localized_label(space, language)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "Game over",
        "primary_action": "ACCEPT",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "Rent: %s EVA · insufficient balance" % _format_eva_number(pending_rent.get("rent_eva", 0.0)),
    }


func _build_rent_paid_panel_data(space: Dictionary, owner_player_id: String, language: String) -> Dictionary:
    var terrain_label: String = _localized_label(space, language)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "Rent paid",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "No rent due",
    }


func _build_self_owned_property_panel_data(space: Dictionary, owner_player_id: String, language: String) -> Dictionary:
    var terrain_label: String = _localized_label(space, language)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Base rent: %s EVA" % _format_eva_number(_base_rent_for_space(space)),
        "price": "Your terrain",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space),
        "details_note": "No rent due",
    }


func _development_rows_for_panel(space: Dictionary) -> Array[Dictionary]:
    var rows: Array[Dictionary] = []
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        rows.append({
            "level": int(row.get("level", 0)),
            "build_label": str(row.get("build_label", "")),
            "rent_eva": float(row.get("rent_eva", 0.0)),
        })

    return rows


func _base_rent_for_space(space: Dictionary) -> float:
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        if int(row.get("level", 0)) == 0:
            return float(row.get("rent_eva", 0.0))

    return 0.0


func _special_property_rule_text(space: Dictionary) -> String:
    var special_property_id: String = str(space.get("special_property_id", ""))
    var importer_rule_text: String = "Unlocks container and machine purchases. Receives 10% equipment commission. Owning both importers raises that commission to 20%."
    var rule_text_by_id: Dictionary[String, String] = {
        "importer_1": importer_rule_text,
        "importer_2": importer_rule_text,
        "substation_1": "Adds +10% global rent profitability.",
        "substation_2": "Pair with Substation 1 to raise global rent profitability to +30%.",
        "private_workshop": "Your terrains collect +10% rent.",
        "cooling_plant": "Your terrains collect +10% rent.",
    }
    return str(rule_text_by_id.get(special_property_id, "Effect description unavailable."))


func _format_eva_number(value: Variant) -> String:
    var numeric_value: float = float(value)
    if is_equal_approx(numeric_value, roundf(numeric_value)):
        return "%d" % int(roundf(numeric_value))

    return "%.1f" % numeric_value


func _localized_label(space: Dictionary, language: String) -> String:
    var labels_value: Variant = space.get("labels", {})
    if labels_value is Dictionary:
        var labels: Dictionary = labels_value as Dictionary
        var localized_value: Variant = labels.get(language, labels.get("en", space.get("label", "")))
        return str(localized_value)

    return str(space.get("label", ""))


func _accent_color_for_space(space: Dictionary) -> Color:
    var group_id: String = str(space.get("group_id", ""))
    assert(TerrainAccentColors.has(group_id))
    return TerrainAccentColors[group_id]


func _player_label(player_id: String) -> String:
    var player_index: int = _player_index_from_id(player_id)
    if player_index < 0:
        return player_id

    return "Player %d" % (player_index + 1)


func _player_color_for_id(player_id: String) -> Color:
    var player_index: int = _player_index_from_id(player_id)
    if player_index < 0 or player_index >= PlayerPawnLayerScript.PlayerColors.size():
        return Color(0.12, 0.112, 0.095, 1.0)

    return PlayerPawnLayerScript.PlayerColors[player_index]


func _player_index_from_id(player_id: String) -> int:
    if not player_id.begins_with("player_"):
        return -1

    var player_number: int = int(player_id.trim_prefix("player_"))
    if player_number <= 0:
        return -1

    return player_number - 1
