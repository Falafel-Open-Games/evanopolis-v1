extends SceneTree

const GameServerConfigScript: GDScript = preload("res://game/scripts/game_server_config.gd")

var failures: int = 0


func _init() -> void:
    _test_player_count_accepts_json_float_integer()
    _test_player_count_accepts_cli_integer()
    _test_player_count_clamps_to_supported_range()
    _test_room_buy_in_accepts_json_float_integer()
    _test_room_buy_in_clamps_to_supported_range()
    _test_entry_fee_tier_accepts_average()
    _test_launch_mode_accepts_paid_room()
    _test_launch_mode_defaults_unknown_to_free_play()
    _test_paid_launch_key_accepts_string()
    _test_auth_token_accepts_string()
    _test_random_seed_accepts_string()

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


func _test_entry_fee_tier_accepts_average() -> void:
    var config: Variant = GameServerConfigScript.new()
    config.call("_apply_dictionary", {"entry_fee_tier": "average"})

    _assert_equal(config.entry_fee_tier, "average", "entry_fee_tier accepts average")


func _test_launch_mode_accepts_paid_room() -> void:
    var config: Variant = GameServerConfigScript.new()
    config.call("_apply_dictionary", {"mode": "paid_room"})

    _assert_equal(config.launch_mode, "paid_room", "launch mode accepts paid_room")


func _test_launch_mode_defaults_unknown_to_free_play() -> void:
    var config: Variant = GameServerConfigScript.new()
    config.call("_apply_dictionary", {"mode": "spectator"})

    _assert_equal(config.launch_mode, "free_play", "launch mode defaults unknown values to free_play")


func _test_paid_launch_key_accepts_string() -> void:
    var config: Variant = GameServerConfigScript.new()
    config.call("_apply_dictionary", {"paid_launch_key": "evanopolis.paidLaunch:test"})

    _assert_equal(config.paid_launch_key, "evanopolis.paidLaunch:test", "paid launch key accepts string")


func _test_auth_token_accepts_string() -> void:
    var config: Variant = GameServerConfigScript.new()
    config.call("_apply_dictionary", {"auth_token": "wallet-session-jwt"})

    _assert_equal(config.auth_token, "wallet-session-jwt", "auth token accepts string")


func _test_random_seed_accepts_string() -> void:
    var config: Variant = GameServerConfigScript.new()
    config.call("_apply_dictionary", {"random_seed": " debug-seed "})

    _assert_equal(config.random_seed, "debug-seed", "random_seed accepts and trims string values")


func _assert_equal(actual: Variant, expected: Variant, label: String) -> void:
    if actual == expected:
        return

    failures += 1
    push_error("%s: expected %s, got %s" % [label, str(expected), str(actual)])
