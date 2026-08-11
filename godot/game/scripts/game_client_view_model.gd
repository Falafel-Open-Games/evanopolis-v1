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
