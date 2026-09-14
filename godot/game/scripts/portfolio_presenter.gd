# ---
# summary: Builds portfolio panel data from server-authoritative snapshots.
# ---
class_name PortfolioPresenter
extends RefCounted

const TerrainAccentColors: Dictionary[String, Color] = {
    "caracas": Color(0.63, 0.80, 0.96, 1.0),
    "asuncion": Color(0.64, 0.83, 0.55, 1.0),
    "ciudad_del_este": Color(0.78, 0.73, 0.33, 1.0),
    "minsk": Color(0.74, 0.46, 0.22, 1.0),
    "siberia": Color(0.80, 0.30, 0.30, 1.0),
    "texas": Color(0.62, 0.42, 0.78, 1.0),
}
const SpecialPropertyAccentColor: Color = Color(0.84, 0.66, 0.28, 1.0)
const SpecialPropertyBackgroundColor: Color = Color(0.97, 0.91, 0.80, 1.0)
const SpecialPropertyBorderColor: Color = Color(0.70, 0.48, 0.16, 0.72)

var view_model: Variant
var language: String = "en"


func configure(required_view_model: Variant, required_language: String) -> void:
    assert(required_view_model != null)
    view_model = required_view_model
    language = required_language


func build_panel_data() -> Dictionary:
    assert(view_model != null)

    var items: Array[Dictionary] = []
    var balance_eva: float = view_model.get_local_player_eva_balance()
    var can_order_development: bool = view_model.has_action("request_order_development")
    var owned_terrain_space_ids: Array[String] = view_model.get_local_player_owned_terrain_space_ids()
    owned_terrain_space_ids.sort_custom(_sort_space_ids_by_board_index)
    for space_id: String in owned_terrain_space_ids:
        var space: Dictionary = view_model.get_space_definition_by_id(space_id)
        if space.is_empty():
            continue

        var development: Dictionary = view_model.get_terrain_development(space_id)
        var orders: Array[Dictionary] = view_model.get_development_orders_for_space(space_id)
        var delivered_level: int = int(development.get("level", 0))
        var ordered_count: int = orders.size()
        var pending_level: int = delivered_level + ordered_count
        var next_order_price: float = _portfolio_next_order_price(space, pending_level)
        var is_orderable: bool = (
            can_order_development
            and pending_level < 5
            and balance_eva >= next_order_price
        )
        var item: Dictionary = {
            "space_id": space_id,
            "item_type": "terrain",
            "selectable": true,
            "title": _localized_label(space).to_upper(),
            "subtitle": _portfolio_development_subtitle(delivered_level, development),
            "order_status": _portfolio_order_status(orders),
            "level": delivered_level,
            "rent_eva": _effective_rent_for_space(space, view_model.local_player_id),
            "next_order": _portfolio_next_order_label(space, pending_level),
            "region_color": _accent_color_for_space(space),
            "primary_action": _portfolio_order_button_label(space, pending_level),
            "primary_action_enabled": is_orderable,
        }
        if not is_orderable and pending_level >= 5:
            item["primary_action"] = "MAXED"
        elif not is_orderable and next_order_price > balance_eva:
            item["primary_action"] = "NEED %s EVA" % _format_eva_number(next_order_price)
        elif not can_order_development:
            item["primary_action"] = "ORDER UNAVAILABLE"

        items.append(item)

    var owned_special_property_space_ids: Array[String] = view_model.get_local_player_owned_special_property_space_ids()
    owned_special_property_space_ids.sort_custom(_sort_space_ids_by_board_index)
    var added_special_property_separator: bool = false
    for space_id: String in owned_special_property_space_ids:
        var space: Dictionary = view_model.get_space_definition_by_id(space_id)
        if space.is_empty():
            continue

        if not added_special_property_separator and not owned_terrain_space_ids.is_empty():
            items.append({
                "item_type": "section_header",
                "title": "SPECIAL PROPERTIES",
                "selectable": false,
            })
            added_special_property_separator = true

        items.append({
            "space_id": space_id,
            "item_type": "special_property",
            "selectable": false,
            "title": _localized_label(space).to_upper(),
            "subtitle": "Special property",
            "order_status": _special_property_summary(space),
            "level_label": "OWNED",
            "rent_label": "No rent",
            "next_order": "SPECIAL",
            "region_color": SpecialPropertyAccentColor,
            "row_background_color": SpecialPropertyBackgroundColor,
            "row_border_color": SpecialPropertyBorderColor,
            "primary_action": "",
            "primary_action_enabled": false,
        })

    return {
        "balance_eva": balance_eva,
        "items": items,
        "order_available": can_order_development,
    }


func _sort_space_ids_by_board_index(left_space_id: String, right_space_id: String) -> bool:
    var left_space: Dictionary = view_model.get_space_definition_by_id(left_space_id)
    var right_space: Dictionary = view_model.get_space_definition_by_id(right_space_id)
    return int(left_space.get("index", 0)) < int(right_space.get("index", 0))


func _portfolio_development_subtitle(level: int, development: Dictionary) -> String:
    if level <= 0:
        return "No delivered development"

    var machine_lot_count: int = int(development.get("machine_lot_count", max(0, level - 1)))
    if level == 1:
        return "Container delivered"

    return "Container + %d machine lot%s" % [
        machine_lot_count,
        "" if machine_lot_count == 1 else "s"
    ]


func _portfolio_order_status(orders: Array[Dictionary]) -> String:
    if orders.is_empty():
        return "No orders in transit"

    var pending_container: bool = false
    var pending_lot_count: int = 0
    for order: Dictionary in orders:
        var development_kind: String = str(order.get("development_kind", ""))
        if development_kind == "container":
            pending_container = true
        elif development_kind == "machine_lot":
            pending_lot_count += 1

    var parts: Array[String] = []
    if pending_container:
        parts.append("container")
    if pending_lot_count > 0:
        parts.append("%d lot%s" % [
            pending_lot_count,
            "" if pending_lot_count == 1 else "s"
        ])
    if parts.is_empty():
        parts.append("%d order%s" % [
            orders.size(),
            "" if orders.size() == 1 else "s"
        ])

    return "In transit: %s" % " + ".join(parts)


func _portfolio_next_order_label(space: Dictionary, pending_level: int) -> String:
    if pending_level >= 5:
        return "Maxed"
    if pending_level <= 0:
        return "Next: container"

    return "Next: lot #%d" % pending_level


func _portfolio_order_button_label(space: Dictionary, pending_level: int) -> String:
    if pending_level <= 0:
        return "ORDER CONTAINER (%s EVA)" % _format_eva_number(space.get("container_price_eva", 0.0))

    return "ORDER LOT #%d (%s EVA)" % [
        pending_level,
        _format_eva_number(space.get("machine_lot_price_eva", 0.0))
    ]


func _portfolio_next_order_price(space: Dictionary, pending_level: int) -> float:
    if pending_level >= 5:
        return INF
    if pending_level <= 0:
        return float(space.get("container_price_eva", 0.0))

    return float(space.get("machine_lot_price_eva", 0.0))


func _rent_for_development_level(space: Dictionary, level: int) -> float:
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        if int(row.get("level", 0)) == level:
            return float(row.get("rent_eva", 0.0))

    return _base_rent_for_space(space)


func _effective_rent_for_space(space: Dictionary, owner_player_id: String) -> float:
    var space_id: String = str(space.get("space_id", ""))
    var delivered_level: int = int(view_model.get_terrain_development(space_id).get("level", 0))
    var base_rent: float = _rent_for_development_level(space, delivered_level)
    var monopoly_multiplier: float = 2.0 if _has_full_level_five_city_monopoly(str(space.get("group_id", "")), owner_player_id) else 1.0

    return _round_tenths(base_rent * _special_property_rent_multiplier(owner_player_id) * monopoly_multiplier)


func _special_property_rent_multiplier(owner_player_id: String) -> float:
    var bonus: float = 0.0
    var owns_substation_1: bool = _player_owns_special_property(owner_player_id, "substation_1")
    var owns_substation_2: bool = _player_owns_special_property(owner_player_id, "substation_2")
    if owns_substation_1 and owns_substation_2:
        bonus += 0.3
    elif owns_substation_1 or owns_substation_2:
        bonus += 0.1
    if _player_owns_special_property(owner_player_id, "private_workshop"):
        bonus += 0.1
    if _player_owns_special_property(owner_player_id, "cooling_plant"):
        bonus += 0.1

    return 1.0 + bonus


func _player_owns_special_property(owner_player_id: String, special_property_id: String) -> bool:
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


func _round_tenths(value: float) -> float:
    return roundf(value * 10.0) / 10.0


func _has_full_level_five_city_monopoly(group_id: String, owner_player_id: String) -> bool:
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


func _base_rent_for_space(space: Dictionary) -> float:
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        if int(row.get("level", 0)) == 0:
            return float(row.get("rent_eva", 0.0))

    return 0.0


func _special_property_summary(space: Dictionary) -> String:
    var special_property_id: String = str(space.get("special_property_id", ""))
    var importer_summary: String = "Earns 10% equipment commission; both importers raise it to 20%"
    var summary_by_id: Dictionary[String, String] = {
        "importer_1": importer_summary,
        "importer_2": importer_summary,
        "substation_1": "Your terrains collect +10% rent",
        "substation_2": "Pairs with Substation 1 for +30% rent",
        "private_workshop": "Your terrains collect +10% rent",
        "cooling_plant": "Your terrains collect +10% rent",
    }
    return str(summary_by_id.get(special_property_id, "Special property effect"))


func _format_eva_number(value: Variant) -> String:
    var numeric_value: float = float(value)
    if is_equal_approx(numeric_value, roundf(numeric_value)):
        return "%d" % int(roundf(numeric_value))

    return "%.1f" % numeric_value


func _localized_label(space: Dictionary) -> String:
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
