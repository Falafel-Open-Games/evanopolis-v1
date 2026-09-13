# ---
# summary: Stores the latest server-shaped state needed by the Godot presentation.
# ---
class_name GameClientViewModel
extends RefCounted

var match_id: String = ""
var client_id: String = ""
var role: String = ""
var player_id: String = ""
var spectator_id: String = ""
var revision: int = 0
var phase: String = ""
var local_player_id: String = ""
var active_player_id: String = ""
var winner_player_id: String = ""
var definition: Dictionary = {}
var snapshot: Dictionary = {}
var latest_event: Dictionary = {}
var last_error: String = ""
var last_message_type: String = ""
var last_sent_command: String = ""


func configure(required_match_id: String, required_client_id: String) -> void:
    assert(required_match_id != "")
    assert(required_client_id != "")
    match_id = required_match_id
    client_id = required_client_id


func apply_server_message(message: Dictionary) -> void:
    var message_type: String = str(message.get("type", ""))
    last_message_type = message_type
    if message_type == "join_accepted":
        _apply_join_accepted(message)
    elif message_type == "match_definition":
        _apply_match_definition(message)
    elif message_type == "match_snapshot":
        _apply_match_snapshot(message)
    elif message_type == "match_event":
        _apply_match_event(message)
    elif message_type == "command_rejected":
        last_error = str(message.get("reason", "command_rejected"))
    elif message_type == "session_replaced":
        last_error = "session_replaced"


func has_action(action: String) -> bool:
    var actions: Array = snapshot.get("available_actions", [])
    return actions.has(action)


func get_available_actions_text() -> String:
    var actions: Array = snapshot.get("available_actions", [])
    if actions.is_empty():
        return "-"

    return ", ".join(actions)


func get_latest_event_text() -> String:
    if latest_event.is_empty():
        return "-"

    return "%s@%d" % [
        _latest_event_type(),
        int(latest_event.get("revision", 0))
    ]


func build_player_command(command_type: String) -> Dictionary:
    assert(match_id != "")
    assert(client_id != "")
    assert(local_player_id != "")

    return {
        "type": command_type,
        "match_id": match_id,
        "client_id": client_id,
        "player_id": local_player_id,
        "seen_revision": revision,
        "payload": {}
    }


func get_player_positions() -> Array[int]:
    var positions: Array[int] = []
    var players: Array = snapshot.get("players", [])
    for player: Variant in players:
        assert(player is Dictionary)
        var player_snapshot: Dictionary = player as Dictionary
        positions.append(int(player_snapshot.get("position", 0)))

    return positions


func get_joined_player_count() -> int:
    var joined_count: int = 0
    var players: Array = snapshot.get("players", [])
    for player: Variant in players:
        assert(player is Dictionary)
        var player_snapshot: Dictionary = player as Dictionary
        if bool(player_snapshot.get("joined", false)):
            joined_count += 1

    return joined_count


func get_dice() -> Dictionary:
    var dice: Variant = snapshot.get("dice", null)
    if dice is Dictionary:
        return dice as Dictionary

    return {}


func get_pending_rent() -> Dictionary:
    var pending_rent: Variant = snapshot.get("pending_rent", null)
    if pending_rent is Dictionary:
        return pending_rent as Dictionary

    return {}


func get_pending_card_resolution() -> Dictionary:
    var pending_card_resolution: Variant = snapshot.get("pending_card_resolution", null)
    if pending_card_resolution is Dictionary:
        return pending_card_resolution as Dictionary

    return {}


func get_space_definition(space_index: int) -> Dictionary:
    var spaces: Array = definition.get("spaces", [])
    for space_value: Variant in spaces:
        assert(space_value is Dictionary)
        var space: Dictionary = space_value as Dictionary
        if int(space.get("index", -1)) == space_index:
            return space

    return {}


func get_local_player_position() -> int:
    if local_player_id == "":
        return -1

    var players: Array = snapshot.get("players", [])
    for player_value: Variant in players:
        assert(player_value is Dictionary)
        var player_snapshot: Dictionary = player_value as Dictionary
        if str(player_snapshot.get("player_id", "")) == local_player_id:
            return int(player_snapshot.get("position", -1))

    return -1


func get_local_player_eva_balance() -> float:
    if local_player_id == "":
        return 0.0

    var players: Array = snapshot.get("players", [])
    for player_value: Variant in players:
        assert(player_value is Dictionary)
        var player_snapshot: Dictionary = player_value as Dictionary
        if str(player_snapshot.get("player_id", "")) == local_player_id:
            return float(player_snapshot.get("eva_balance", 0.0))

    return 0.0


func get_local_player_status() -> String:
    if local_player_id == "":
        return ""

    var players: Array = snapshot.get("players", [])
    for player_value: Variant in players:
        assert(player_value is Dictionary)
        var player_snapshot: Dictionary = player_value as Dictionary
        if str(player_snapshot.get("player_id", "")) == local_player_id:
            return str(player_snapshot.get("status", ""))

    return ""


func is_local_winner() -> bool:
    return local_player_id != "" and local_player_id == winner_player_id


func get_local_player_index() -> int:
    if not local_player_id.begins_with("player_"):
        return -1

    var player_number: int = int(local_player_id.trim_prefix("player_"))
    if player_number <= 0:
        return -1

    return player_number - 1


func get_local_player_owned_property_count() -> int:
    if local_player_id == "":
        return 0

    var owned_count: int = 0
    var ownership_records: Array = snapshot.get("terrain_ownership", [])
    for ownership_value: Variant in ownership_records:
        assert(ownership_value is Dictionary)
        var ownership: Dictionary = ownership_value as Dictionary
        if str(ownership.get("owner_player_id", "")) == local_player_id:
            owned_count += 1

    return owned_count


func get_local_player_owned_terrain_space_ids() -> Array[String]:
    var space_ids: Array[String] = []
    if local_player_id == "":
        return space_ids

    var ownership_records: Array = snapshot.get("terrain_ownership", [])
    for ownership_value: Variant in ownership_records:
        assert(ownership_value is Dictionary)
        var ownership: Dictionary = ownership_value as Dictionary
        if str(ownership.get("owner_player_id", "")) == local_player_id:
            space_ids.append(str(ownership.get("space_id", "")))

    return space_ids


func get_space_definition_by_id(space_id: String) -> Dictionary:
    assert(space_id != "")

    var spaces: Array = definition.get("spaces", [])
    for space_value: Variant in spaces:
        assert(space_value is Dictionary)
        var space: Dictionary = space_value as Dictionary
        if str(space.get("space_id", "")) == space_id:
            return space

    return {}


func get_terrain_development(space_id: String) -> Dictionary:
    assert(space_id != "")

    var development_records: Array = snapshot.get("terrain_developments", [])
    for development_value: Variant in development_records:
        assert(development_value is Dictionary)
        var development: Dictionary = development_value as Dictionary
        if str(development.get("space_id", "")) == space_id:
            return development

    return {
        "space_id": space_id,
        "level": 0,
        "has_container": false,
        "machine_lot_count": 0,
    }


func get_development_orders_for_space(space_id: String) -> Array[Dictionary]:
    assert(space_id != "")

    var orders: Array[Dictionary] = []
    var order_records: Array = snapshot.get("development_orders", [])
    for order_value: Variant in order_records:
        assert(order_value is Dictionary)
        var order: Dictionary = order_value as Dictionary
        if (
            str(order.get("space_id", "")) == space_id
            and str(order.get("player_id", "")) == local_player_id
        ):
            orders.append(order)

    return orders


func get_owner_player_id_for_space(space_id: String) -> String:
    var ownership_records: Array = snapshot.get("terrain_ownership", [])
    for ownership_value: Variant in ownership_records:
        assert(ownership_value is Dictionary)
        var ownership: Dictionary = ownership_value as Dictionary
        if str(ownership.get("space_id", "")) == space_id:
            return str(ownership.get("owner_player_id", ""))

    return ""


func is_local_active_player() -> bool:
    return local_player_id != "" and local_player_id == active_player_id


func has_definition() -> bool:
    return not definition.is_empty()


func has_snapshot() -> bool:
    return not snapshot.is_empty()


func _apply_join_accepted(message: Dictionary) -> void:
    role = _optional_string(message.get("role", ""))
    player_id = _optional_string(message.get("player_id", ""))
    spectator_id = _optional_string(message.get("spectator_id", ""))


func _apply_match_definition(message: Dictionary) -> void:
    var next_definition: Variant = message.get("definition", {})
    if next_definition is Dictionary:
        definition = next_definition as Dictionary


func _apply_match_snapshot(message: Dictionary) -> void:
    var next_snapshot: Variant = message.get("snapshot", {})
    if not next_snapshot is Dictionary:
        return

    var snapshot_dictionary: Dictionary = next_snapshot as Dictionary
    var next_revision: int = int(snapshot_dictionary.get("revision", 0))
    if next_revision < revision:
        return

    snapshot = snapshot_dictionary
    revision = next_revision
    phase = _optional_string(snapshot.get("phase", ""))
    local_player_id = _optional_string(snapshot.get("local_player_id", ""))
    active_player_id = _optional_string(snapshot.get("active_player_id", ""))
    winner_player_id = _optional_string(snapshot.get("winner_player_id", ""))


func _apply_match_event(message: Dictionary) -> void:
    latest_event = message.duplicate(true)


func _latest_event_type() -> String:
    var event: Variant = latest_event.get("event", {})
    if event is Dictionary:
        return _optional_string((event as Dictionary).get("type", ""))

    return ""


func _optional_string(value: Variant) -> String:
    if value == null:
        return ""

    return str(value)
