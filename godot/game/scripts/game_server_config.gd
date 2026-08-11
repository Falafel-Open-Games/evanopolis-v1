# ---
# summary: Reads server-client launch config from the shell, URL, or CLI defaults.
# ---
class_name GameServerConfig
extends RefCounted

const DefaultServerUrl: String = "ws://127.0.0.1:8788/match"
const DefaultMatchId: String = "demo"
const DefaultLanguage: String = "en"

var server_url: String = DefaultServerUrl
var match_id: String = DefaultMatchId
var client_id: String = ""
var language: String = DefaultLanguage
var auto_join: bool = true


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
    if values.has("auto_join") and values["auto_join"] is bool:
        auto_join = values["auto_join"]


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
            + "for (const key of ['server_url', 'match_id', 'client_id', 'language']) {"
            + "  const value = params.get(key);"
            + "  if (value !== null && value !== '') config[key] = value;"
            + "}"
            + "const autoJoin = params.get('auto_join');"
            + "if (autoJoin !== null) config.auto_join = autoJoin !== '0' && autoJoin !== 'false';"
            + "return JSON.stringify(config);"
            + "})()"
        ),
        true
    )
    if not query_config_json is String:
        return {}

    var parsed_config: Variant = JSON.parse_string(query_config_json as String)
    if parsed_config is Dictionary:
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
        elif argument == "--no-auto-join":
            values["auto_join"] = false

    return values


static func _default_client_id() -> String:
    return "godot-%d" % Time.get_unix_time_from_system()
