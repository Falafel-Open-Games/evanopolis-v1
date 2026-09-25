# ---
# summary: Reads server-client launch config from the shell, URL, or CLI defaults.
# ---
class_name GameServerConfig
extends RefCounted

const DefaultServerUrl: String = "ws://127.0.0.1:8788/match"
const DefaultMatchId: String = "demo"
const DefaultLanguage: String = "en"
const DefaultLaunchMode: String = "free_play"
const DefaultPlayerCount: int = 3
const DefaultRoomBuyInEva: int = 50

var server_url: String = DefaultServerUrl
var match_id: String = DefaultMatchId
var client_id: String = ""
var language: String = DefaultLanguage
var launch_mode: String = DefaultLaunchMode
var paid_launch_key: String = ""
var auth_token: String = ""
var random_seed: String = ""
var player_count: int = DefaultPlayerCount
var room_buy_in_eva: int = DefaultRoomBuyInEva
var entry_fee_tier: String = ""
var auto_join: bool = true
var debug_overlay: bool = false


func load_from_launch_context() -> void:
    client_id = _default_client_id()
    _apply_dictionary(_read_web_shell_config())
    _apply_dictionary(_read_web_query_config())
    _apply_dictionary(_read_user_arguments())


func _apply_dictionary(values: Dictionary) -> void:
    if values.has("server_url") and values["server_url"] is String:
        server_url = values["server_url"]
    if values.has("match_id") and values["match_id"] is String:
        match_id = values["match_id"]
    if values.has("client_id") and values["client_id"] is String:
        client_id = values["client_id"]
    if values.has("language") and values["language"] is String:
        language = values["language"]
    if values.has("mode") and values["mode"] is String:
        launch_mode = _normalized_launch_mode(values["mode"])
    if values.has("paid_launch_key") and values["paid_launch_key"] is String:
        paid_launch_key = values["paid_launch_key"]
    if values.has("auth_token") and values["auth_token"] is String:
        auth_token = values["auth_token"]
    if values.has("random_seed") and values["random_seed"] is String:
        random_seed = values["random_seed"].strip_edges()
    if values.has("player_count") and (values["player_count"] is int or values["player_count"] is float):
        player_count = clampi(int(values["player_count"]), 2, 4)
    if values.has("room_buy_in_eva") and (values["room_buy_in_eva"] is int or values["room_buy_in_eva"] is float):
        room_buy_in_eva = clampi(int(values["room_buy_in_eva"]), 1, 1000)
    if values.has("entry_fee_tier") and values["entry_fee_tier"] is String:
        entry_fee_tier = _normalized_entry_fee_tier(values["entry_fee_tier"])
    if values.has("auto_join") and values["auto_join"] is bool:
        auto_join = values["auto_join"]
    if values.has("debug_overlay") and values["debug_overlay"] is bool:
        debug_overlay = values["debug_overlay"]


static func _read_web_shell_config() -> Dictionary:
    if not OS.has_feature("web"):
        return {}

    var config_json: Variant = JavaScriptBridge.eval(
        "JSON.stringify(window.EVANOPOLIS_CLIENT_CONFIG || {})",
        true
    )
    if not config_json is String:
        return {}

    var parsed_config: Variant = JSON.parse_string(config_json as String)
    if parsed_config is Dictionary:
        return parsed_config as Dictionary

    return {}


static func _read_web_query_config() -> Dictionary:
    if not OS.has_feature("web"):
        return {}

    var query_config_json: Variant = JavaScriptBridge.eval(
        (
            "(function() {"
            + "const params = new URLSearchParams(window.location.search);"
            + "const config = {};"
            + "for (const key of ['server_url', 'match_id', 'client_id', 'language', 'mode', 'paid_launch_key', 'random_seed', 'entry_fee_tier']) {"
            + "  const value = params.get(key);"
            + "  if (value !== null && value !== '') config[key] = value;"
            + "}"
            + "const playerCount = Number(params.get('player_count'));"
            + "if (Number.isInteger(playerCount)) config.player_count = playerCount;"
            + "const roomBuyInEva = Number(params.get('room_buy_in_eva'));"
            + "if (Number.isInteger(roomBuyInEva)) config.room_buy_in_eva = roomBuyInEva;"
            + "const autoJoin = params.get('auto_join');"
            + "if (autoJoin !== null) config.auto_join = autoJoin !== '0' && autoJoin !== 'false';"
            + "const debugOverlay = params.get('debug_overlay');"
            + "if (debugOverlay !== null) config.debug_overlay = debugOverlay === '1' || debugOverlay === 'true';"
            + "return JSON.stringify(config);"
            + "})()"
        ),
        true
    )
    if not query_config_json is String:
        return {}

    var parsed_config: Variant = JSON.parse_string(query_config_json as String)
    if parsed_config is Dictionary:
        _apply_paid_launch_payload(parsed_config as Dictionary)
        return parsed_config as Dictionary

    return {}


static func _read_user_arguments() -> Dictionary:
    var values: Dictionary = {}
    for argument: String in OS.get_cmdline_user_args():
        if argument.begins_with("--server-url="):
            values["server_url"] = argument.trim_prefix("--server-url=")
        elif argument.begins_with("--match-id="):
            values["match_id"] = argument.trim_prefix("--match-id=")
        elif argument.begins_with("--client-id="):
            values["client_id"] = argument.trim_prefix("--client-id=")
        elif argument.begins_with("--language="):
            values["language"] = argument.trim_prefix("--language=")
        elif argument.begins_with("--mode="):
            values["mode"] = argument.trim_prefix("--mode=")
        elif argument.begins_with("--paid-launch-key="):
            values["paid_launch_key"] = argument.trim_prefix("--paid-launch-key=")
        elif argument.begins_with("--auth-token="):
            values["auth_token"] = argument.trim_prefix("--auth-token=")
        elif argument.begins_with("--random-seed="):
            values["random_seed"] = argument.trim_prefix("--random-seed=")
        elif argument.begins_with("--player-count="):
            values["player_count"] = int(argument.trim_prefix("--player-count="))
        elif argument.begins_with("--room-buy-in-eva="):
            values["room_buy_in_eva"] = int(argument.trim_prefix("--room-buy-in-eva="))
        elif argument.begins_with("--entry-fee-tier="):
            values["entry_fee_tier"] = argument.trim_prefix("--entry-fee-tier=")
        elif argument == "--no-auto-join":
            values["auto_join"] = false
        elif argument == "--debug-overlay":
            values["debug_overlay"] = true

    return values


static func _default_client_id() -> String:
    return "godot-%d" % Time.get_unix_time_from_system()


static func _normalized_launch_mode(value: String) -> String:
    if value == "paid_room":
        return "paid_room"

    return DefaultLaunchMode


static func _normalized_entry_fee_tier(value: String) -> String:
    assert(value == "cheap" or value == "average" or value == "deluxe")
    return value


static func _apply_paid_launch_payload(values: Dictionary) -> void:
    if not OS.has_feature("web"):
        return
    if not values.has("paid_launch_key") or not values["paid_launch_key"] is String:
        return

    var paid_launch_key: String = values["paid_launch_key"]
    if paid_launch_key == "":
        return

    var payload_json: Variant = JavaScriptBridge.eval(
        "window.sessionStorage.getItem(%s) || ''" % JSON.stringify(paid_launch_key),
        true
    )
    if not payload_json is String or payload_json == "":
        return

    var payload: Variant = JSON.parse_string(payload_json as String)
    if not payload is Dictionary:
        return

    var payload_dictionary: Dictionary = payload as Dictionary
    if payload_dictionary.get("mode", "") == "paid_room":
        values["mode"] = "paid_room"
    if payload_dictionary.get("gameServerUrl", "") is String and payload_dictionary.get("gameServerUrl", "") != "":
        values["server_url"] = payload_dictionary["gameServerUrl"]
    if payload_dictionary.get("authToken", "") is String:
        values["auth_token"] = payload_dictionary["authToken"]

    var room: Variant = payload_dictionary.get("room", {})
    if room is Dictionary:
        var room_dictionary: Dictionary = room as Dictionary
        if room_dictionary.get("gameId", "") is String and room_dictionary.get("gameId", "") != "":
            values["match_id"] = room_dictionary["gameId"]
        if room_dictionary.get("playerCount", null) is int or room_dictionary.get("playerCount", null) is float:
            values["player_count"] = room_dictionary["playerCount"]
