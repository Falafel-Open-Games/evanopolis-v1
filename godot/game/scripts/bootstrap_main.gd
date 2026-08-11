# ---
# summary: Chooses the exported startup scene from shell or CLI configuration.
# ---
extends Node

const ReviewScene: PackedScene = preload("res://game/game-main.tscn")
const ServerClientScene: PackedScene = preload("res://game/server-client-main.tscn")
const LaunchDiagnosticProtocol: String = "evanopolis-godot-launch"


func _ready() -> void:
    var scene_key: String = _read_scene_key()
    _post_web_bootstrap_diagnostics(scene_key)
    var packed_scene: PackedScene = ServerClientScene if scene_key == "server-client" else ReviewScene
    var scene: Node = packed_scene.instantiate()
    add_child(scene)


func _read_scene_key() -> String:
    var scene_key: String = _read_web_scene_key()
    if scene_key != "":
        return scene_key

    for argument: String in OS.get_cmdline_user_args():
        if argument.begins_with("--client-scene="):
            return argument.trim_prefix("--client-scene=")

    return "review"


func _read_web_scene_key() -> String:
    if not OS.has_feature("web"):
        return ""

    var scene_key: Variant = JavaScriptBridge.eval(
        "new URLSearchParams(window.location.search).get('scene') || ''",
        true
    )
    if scene_key is String:
        return scene_key as String

    return ""


func _post_web_bootstrap_diagnostics(scene_key: String) -> void:
    if not OS.has_feature("web"):
        return

    var diagnostics_json: Variant = JavaScriptBridge.eval(
        (
            "(function() {"
            + "const params = new URLSearchParams(window.location.search);"
            + "return JSON.stringify({"
            + "  protocol: '%s',"
            + "  version: 1,"
            + "  type: 'bootstrap_diagnostics',"
            + "  href: window.location.href,"
            + "  search: window.location.search,"
            + "  scene: %s,"
            + "  queryScene: params.get('scene') || '',"
            + "  player_count: params.get('player_count') || '',"
            + "  referrer: document.referrer || ''"
            + "});"
            + "})()"
        ) % [LaunchDiagnosticProtocol, JSON.stringify(scene_key)],
        true
    )
    if not diagnostics_json is String:
        return

    JavaScriptBridge.eval(
        "window.parent.postMessage(%s, '*')" % JSON.stringify(diagnostics_json as String),
        true
    )
