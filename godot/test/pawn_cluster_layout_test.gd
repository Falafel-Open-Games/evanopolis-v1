extends SceneTree

const PawnClusterLayoutScript: GDScript = preload("res://game/scripts/pawn_cluster_layout.gd")
const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const MinPawnSpacing: float = 0.06

var failures: int = 0


func _init() -> void:
    _test_layouts_cover_one_to_six_pawns()
    _test_six_players_have_distinct_colors()

    if failures > 0:
        quit(1)
        return

    print("PawnClusterLayout tests passed")
    quit()


func _test_layouts_cover_one_to_six_pawns() -> void:
    for pawn_count: int in range(1, 7):
        var offsets: Array[Vector2] = PawnClusterLayoutScript.get_offsets(pawn_count)
        _assert_equal(offsets.size(), pawn_count, "offset count for %d pawns" % pawn_count)
        for first_index: int in range(offsets.size()):
            for second_index: int in range(first_index + 1, offsets.size()):
                var spacing: float = offsets[first_index].distance_to(offsets[second_index])
                _assert_true(
                    spacing >= MinPawnSpacing,
                    "pawns %d and %d of %d keep apart (%.3f)" % [first_index, second_index, pawn_count, spacing]
                )


func _test_six_players_have_distinct_colors() -> void:
    var colors: Array[Color] = PlayerPawnLayerScript.PlayerColors
    _assert_equal(colors.size(), 6, "player color count")
    for first_index: int in range(colors.size()):
        for second_index: int in range(first_index + 1, colors.size()):
            _assert_true(colors[first_index] != colors[second_index], "colors %d and %d differ" % [first_index, second_index])


func _assert_true(condition: bool, label: String) -> void:
    if condition:
        return

    failures += 1
    push_error(label)


func _assert_equal(actual: Variant, expected: Variant, label: String) -> void:
    if actual == expected:
        return

    failures += 1
    push_error("%s: expected %s, got %s" % [label, str(expected), str(actual)])
