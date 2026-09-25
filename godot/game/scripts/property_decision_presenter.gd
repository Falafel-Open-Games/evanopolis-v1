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
                _build_rent_due_panel_data(view_model, space, pending_rent, language),
                view_model
            )
        if view_model.has_action("request_accept_game_over"):
            return _visible_state(
                "request_accept_game_over",
                _build_unaffordable_rent_panel_data(view_model, space, pending_rent, language),
                view_model
            )

    var owner_player_id: String = view_model.get_owner_player_id_for_space(space_id)
    if owner_player_id == "":
        if not view_model.has_action("request_purchase_property"):
            if not view_model.has_action("request_end_turn"):
                return _hidden_state()
            return _visible_state("request_end_turn", _build_unaffordable_property_panel_data(view_model, space, language), view_model)
        return _visible_state("request_purchase_property", _build_available_property_panel_data(view_model, space, language), view_model)

    if owner_player_id == view_model.local_player_id and view_model.has_action("request_end_turn"):
        return _visible_state(
            "request_end_turn",
            _build_self_owned_property_panel_data(view_model, space, owner_player_id, language),
            view_model
        )

    if owner_player_id != "" and view_model.has_action("request_end_turn"):
        return _visible_state("request_end_turn", _build_rent_paid_panel_data(view_model, space, owner_player_id, language), view_model)

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
    data["balance"] = "Balance: %s EVA" % EvaMoney.format_micro(view_model.get_local_player_eva_balance_micro())
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


func _build_available_property_panel_data(view_model: Variant, space: Dictionary, language: String) -> Dictionary:
    var purchase_price: int = EvaMoney.required_micro(space, "purchase_price_micro")
    var terrain_label: String = _localized_label(space, language)
    var rent_multiplier: int = _rent_multiplier_for_player(view_model, view_model.local_player_id, space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Available",
        "price": "%s EVA" % EvaMoney.format_micro(purchase_price),
        "primary_action": "BUY FOR %s EVA" % EvaMoney.format_micro(purchase_price),
        "secondary_action": "PASS",
        "secondary_action_visible": true,
        "region_color": _accent_color_for_space(space),
        "development_rent_table": _development_rows_for_panel(space, rent_multiplier),
        "details_note": _rent_table_note(view_model, view_model.local_player_id, space, "Container %s EVA · each lot costs %s EVA" % [
            EvaMoney.format_micro(EvaMoney.required_micro(space, "container_price_micro")),
            EvaMoney.format_micro(EvaMoney.required_micro(space, "machine_lot_price_micro"))
        ]),
    }


func _build_unaffordable_property_panel_data(view_model: Variant, space: Dictionary, language: String) -> Dictionary:
    var terrain_label: String = _localized_label(space, language)
    var rent_multiplier: int = _rent_multiplier_for_player(view_model, view_model.local_player_id, space)
    var detail_note: String = _rent_table_note(view_model, view_model.local_player_id, space, "Insufficient balance")
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Available",
        "price": "Can't afford",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "development_rent_table": _development_rows_for_panel(space, rent_multiplier),
        "details_note": detail_note,
    }


func _build_available_special_property_panel_data(space: Dictionary, language: String) -> Dictionary:
    var purchase_price: int = EvaMoney.required_micro(space, "purchase_price_micro")
    var property_label: String = _localized_label(space, language)
    return {
        "title": property_label.to_upper(),
        "kind": "Special property",
        "status": "Available",
        "price": "%s EVA" % EvaMoney.format_micro(purchase_price),
        "primary_action": "BUY FOR %s EVA" % EvaMoney.format_micro(purchase_price),
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


func _build_rent_due_panel_data(view_model: Variant, space: Dictionary, pending_rent: Dictionary, language: String) -> Dictionary:
    var owner_player_id: String = str(pending_rent.get("owner_player_id", ""))
    var terrain_label: String = _localized_label(space, language)
    var rent_multiplier: int = _rent_multiplier_for_player(view_model, owner_player_id, space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "Rent: %s EVA" % EvaMoney.format_micro(EvaMoney.required_micro(pending_rent, "rent_micro")),
        "primary_action": "PAY RENT",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space, rent_multiplier),
        "details_note": _rent_table_note(view_model, owner_player_id, space, "Rent due now"),
    }


func _build_unaffordable_rent_panel_data(view_model: Variant, space: Dictionary, pending_rent: Dictionary, language: String) -> Dictionary:
    var owner_player_id: String = str(pending_rent.get("owner_player_id", ""))
    var terrain_label: String = _localized_label(space, language)
    var rent_multiplier: int = _rent_multiplier_for_player(view_model, owner_player_id, space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "Game over",
        "primary_action": "ACCEPT",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space, rent_multiplier),
        "details_note": _rent_table_note(
            view_model,
            owner_player_id,
            space,
            "Rent: %s EVA · insufficient balance" % EvaMoney.format_micro(EvaMoney.required_micro(pending_rent, "rent_micro"))
        ),
    }


func _build_rent_paid_panel_data(view_model: Variant, space: Dictionary, owner_player_id: String, language: String) -> Dictionary:
    var terrain_label: String = _localized_label(space, language)
    var rent_multiplier: int = _rent_multiplier_for_player(view_model, owner_player_id, space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Owned by %s" % _player_label(owner_player_id),
        "price": "Rent paid",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space, rent_multiplier),
        "details_note": _rent_table_note(view_model, owner_player_id, space, "No rent due"),
    }


func _build_self_owned_property_panel_data(view_model: Variant, space: Dictionary, owner_player_id: String, language: String) -> Dictionary:
    var terrain_label: String = _localized_label(space, language)
    var rent_multiplier: int = _rent_multiplier_for_player(view_model, owner_player_id, space)
    return {
        "title": terrain_label.to_upper(),
        "kind": "Terrain",
        "status": "Base rent: %s EVA" % EvaMoney.format_micro(_base_rent_for_space(space)),
        "price": "Your terrain",
        "primary_action": "END TURN",
        "secondary_action_visible": false,
        "region_color": _accent_color_for_space(space),
        "status_color": _player_color_for_id(owner_player_id),
        "development_rent_table": _development_rows_for_panel(space, rent_multiplier),
        "details_note": _rent_table_note(view_model, owner_player_id, space, "No rent due"),
    }


func _development_rows_for_panel(space: Dictionary, rent_multiplier: int = 10) -> Array[Dictionary]:
    var rows: Array[Dictionary] = []
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        rows.append({
            "level": int(row.get("level", 0)),
            "build_label": str(row.get("build_label", "")),
            "rent_micro": EvaMoney.multiply_ratio(EvaMoney.required_micro(row, "rent_micro"), rent_multiplier, 10),
        })

    return rows


func _base_rent_for_space(space: Dictionary) -> int:
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        if int(row.get("level", 0)) == 0:
            return EvaMoney.required_micro(row, "rent_micro")

    return 0


func _rent_multiplier_for_player(view_model: Variant, owner_player_id: String, space: Dictionary) -> int:
    if owner_player_id == "":
        return 10

    var multiplier: int = 10 + _special_property_rent_bonus_tenths(view_model, owner_player_id)
    if _has_full_level_five_city_monopoly(view_model, str(space.get("group_id", "")), owner_player_id):
        multiplier *= 2

    return multiplier


func _rent_table_note(view_model: Variant, owner_player_id: String, space: Dictionary, fallback_note: String) -> String:
    var bonus_parts: Array[String] = _rent_bonus_note_parts(view_model, owner_player_id, space)
    if bonus_parts.is_empty():
        return fallback_note

    return "Bonus: %s. %s" % [", ".join(bonus_parts), fallback_note]


func _rent_bonus_note_parts(view_model: Variant, owner_player_id: String, space: Dictionary) -> Array[String]:
    var bonus_parts: Array[String] = []
    if owner_player_id == "":
        return bonus_parts

    var owns_substation_1: bool = _player_owns_special_property(view_model, owner_player_id, "substation_1")
    var owns_substation_2: bool = _player_owns_special_property(view_model, owner_player_id, "substation_2")
    if owns_substation_1 and owns_substation_2:
        bonus_parts.append("+30% substation bonus")
    elif owns_substation_1 or owns_substation_2:
        bonus_parts.append("+10% substation bonus")

    if _player_owns_special_property(view_model, owner_player_id, "private_workshop"):
        bonus_parts.append("+10% workshop bonus")
    if _player_owns_special_property(view_model, owner_player_id, "cooling_plant"):
        bonus_parts.append("+10% cooling bonus")
    if _has_full_level_five_city_monopoly(view_model, str(space.get("group_id", "")), owner_player_id):
        bonus_parts.append("full-city monopoly bonus")

    return bonus_parts


func _special_property_rent_bonus_tenths(view_model: Variant, owner_player_id: String) -> int:
    var bonus: int = 0
    var owns_substation_1: bool = _player_owns_special_property(view_model, owner_player_id, "substation_1")
    var owns_substation_2: bool = _player_owns_special_property(view_model, owner_player_id, "substation_2")
    if owns_substation_1 and owns_substation_2:
        bonus += 3
    elif owns_substation_1 or owns_substation_2:
        bonus += 1
    if _player_owns_special_property(view_model, owner_player_id, "private_workshop"):
        bonus += 1
    if _player_owns_special_property(view_model, owner_player_id, "cooling_plant"):
        bonus += 1

    return bonus


func _player_owns_special_property(view_model: Variant, owner_player_id: String, special_property_id: String) -> bool:
    if owner_player_id == "":
        return false

    var special_property_ownership: Array = view_model.snapshot.get("special_property_ownership", [])
    for ownership_value: Variant in special_property_ownership:
        assert(ownership_value is Dictionary)
        var ownership: Dictionary = ownership_value as Dictionary
        if str(ownership.get("owner_player_id", "")) != owner_player_id:
            continue

        var space: Dictionary = view_model.get_space_definition_by_id(str(ownership.get("space_id", "")))
        if str(space.get("special_property_id", "")) == special_property_id:
            return true

    return false


func _has_full_level_five_city_monopoly(view_model: Variant, group_id: String, owner_player_id: String) -> bool:
    if group_id == "" or owner_player_id == "":
        return false

    var city_terrain_count: int = 0
    var spaces: Array = view_model.definition.get("spaces", [])
    for space_value: Variant in spaces:
        assert(space_value is Dictionary)
        var space: Dictionary = space_value as Dictionary
        if str(space.get("kind", "")) != "terrain" or str(space.get("group_id", "")) != group_id:
            continue

        city_terrain_count += 1
        var space_id: String = str(space.get("space_id", ""))
        if view_model.get_owner_player_id_for_space(space_id) != owner_player_id:
            return false
        if int(view_model.get_terrain_development(space_id).get("level", 0)) != 5:
            return false

    return city_terrain_count == 4


func _special_property_rule_text(space: Dictionary) -> String:
    var special_property_id: String = str(space.get("special_property_id", ""))
    var importer_rule_text: String = "Receives 10% equipment commission. Owning both importers raises that commission to 20%."
    var rule_text_by_id: Dictionary[String, String] = {
        "importer_1": importer_rule_text,
        "importer_2": importer_rule_text,
        "substation_1": "Adds +10% global rent profitability.",
        "substation_2": "Pair with Substation 1 to raise global rent profitability to +30%.",
        "private_workshop": "Your terrains collect +10% rent.",
        "cooling_plant": "Your terrains collect +10% rent.",
    }
    return str(rule_text_by_id.get(special_property_id, "Effect description unavailable."))


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
