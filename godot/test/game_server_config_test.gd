extends SceneTree

const GameServerConfigScript: GDScript = preload("res://game/scripts/game_server_config.gd")

var failures: int = 0


func _init() -> void:
    _test_player_count_accepts_json_float_integer()
    _test_player_count_accepts_cli_integer()
    _test_player_count_clamps_to_supported_range()
    _test_room_buy_in_accepts_json_float_integer()
    _test_room_buy_in_clamps_to_supported_range()

    if failures > 0:
        quit(1)
        return

    print("GameServerConfig tests passed")
    quit()


func _test_player_count_accepts_json_float_integer() -> void:
    var config: Variant = GameServerConfigScript.new()
    config.call("_apply_dictionary", {"player_count": 2.0})

    _assert_equal(config.player_count, 2, "player_count accepts Godot JSON float integers")


func _test_player_count_accepts_cli_integer() -> void:
    var config: Variant = GameServerConfigScript.new()
    config.call("_apply_dictionary", {"player_count": 4})

    _assert_equal(config.player_count, 4, "player_count accepts CLI integer values")


func _test_player_count_clamps_to_supported_range() -> void:
    var low_config: Variant = GameServerConfigScript.new()
    low_config.call("_apply_dictionary", {"player_count": 1.0})
    _assert_equal(low_config.player_count, 2, "player_count clamps below minimum")

    var high_config: Variant = GameServerConfigScript.new()
    high_config.call("_apply_dictionary", {"player_count": 5.0})
    _assert_equal(high_config.player_count, 4, "player_count clamps above maximum")


func _test_room_buy_in_accepts_json_float_integer() -> void:
    var config: Variant = GameServerConfigScript.new()
    config.call("_apply_dictionary", {"room_buy_in_eva": 7.0})

    _assert_equal(config.room_buy_in_eva, 7, "room_buy_in_eva accepts Godot JSON float integers")


func _test_room_buy_in_clamps_to_supported_range() -> void:
    var low_config: Variant = GameServerConfigScript.new()
    low_config.call("_apply_dictionary", {"room_buy_in_eva": 0.0})
    _assert_equal(low_config.room_buy_in_eva, 1, "room_buy_in_eva clamps below minimum")

    var high_config: Variant = GameServerConfigScript.new()
    high_config.call("_apply_dictionary", {"room_buy_in_eva": 1001.0})
    _assert_equal(high_config.room_buy_in_eva, 1000, "room_buy_in_eva clamps above maximum")


func _assert_equal(actual: Variant, expected: Variant, label: String) -> void:
    if actual == expected:
        return

    failures += 1
    push_error("%s: expected %s, got %s" % [label, str(expected), str(actual)])
