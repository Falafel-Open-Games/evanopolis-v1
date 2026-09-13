extends SceneTree

const ServerClientScene: PackedScene = preload("res://game/server-client-main.tscn")

var failures: int = 0


func _init() -> void:
    call_deferred("_run")


func _run() -> void:
    var server_client: Node = ServerClientScene.instantiate()
    assert(server_client != null)
    root.add_child(server_client)
    await process_frame
    _apply_definition(server_client)

    _test_pending_card_shows_resolve_panel(server_client)
    _test_unaffordable_card_shows_game_over_panel(server_client)
    _test_resolved_card_shows_end_turn_panel(server_client)

    server_client.queue_free()
    await process_frame

    if failures > 0:
        quit(1)
        return

    print("Card panel server-client tests passed")
    quit()


func _test_pending_card_shows_resolve_panel(server_client: Node) -> void:
    _apply_snapshot(server_client, ["request_resolve_card"], 50, -2)
    server_client.call("_refresh_overlay")

    var card_panel: Variant = server_client.get("card_resolution_panel")
    var property_panel: Variant = server_client.get("property_decision_panel")
    var status_bar: Variant = server_client.get("player_status_bar")

    _assert_true(card_panel.visible, "pending card shows card panel")
    _assert_equal(
        server_client.get("card_panel_primary_command"),
        "request_resolve_card",
        "pending card chooses resolve command"
    )
    _assert_equal(_label_text(card_panel, "OuterMargin/Root/CopyColumn/DeckLabel"), "DESTINO", "deck label")
    _assert_equal(_label_text(card_panel, "OuterMargin/Root/CopyColumn/TitleLabel"), "Operating Tax", "card title")
    _assert_equal(_label_text(card_panel, "OuterMargin/Root/CopyColumn/EffectLabel"), "-2 EVA", "effect label")
    _assert_equal(_button_text(card_panel, "OuterMargin/Root/ActionColumn/PrimaryButton"), "APPLY CARD", "resolve button")
    _assert_true(not property_panel.visible, "pending card hides property panel")
    _assert_true(
        status_bar.primary_command_type != "request_end_turn",
        "pending card does not expose end turn shortcut"
    )


func _test_unaffordable_card_shows_game_over_panel(server_client: Node) -> void:
    _apply_snapshot(server_client, ["request_accept_game_over"], 1, -2)
    server_client.call("_refresh_overlay")

    var card_panel: Variant = server_client.get("card_resolution_panel")

    _assert_true(card_panel.visible, "unaffordable card shows card panel")
    _assert_equal(
        server_client.get("card_panel_primary_command"),
        "request_accept_game_over",
        "unaffordable card chooses game-over command"
    )
    _assert_equal(
        _label_text(card_panel, "OuterMargin/Root/CopyColumn/EffectLabel"),
        "INSUFFICIENT EVA",
        "unaffordable card effect label"
    )
    _assert_equal(
        _button_text(card_panel, "OuterMargin/Root/ActionColumn/PrimaryButton"),
        "ACCEPT GAME OVER",
        "unaffordable card button"
    )


func _test_resolved_card_shows_end_turn_panel(server_client: Node) -> void:
    _apply_card_resolved_event(server_client)
    _apply_snapshot_for_player(
        server_client,
        "player_1",
        "player_1",
        ["request_end_turn"],
        48,
        {}
    )
    server_client.call("_refresh_overlay")

    var card_panel: Variant = server_client.get("card_resolution_panel")
    var status_bar: Variant = server_client.get("player_status_bar")

    _assert_true(card_panel.visible, "resolved card keeps card panel visible")
    _assert_equal(
        server_client.get("card_panel_primary_command"),
        "request_end_turn",
        "resolved card chooses end-turn command"
    )
    _assert_equal(
        _button_text(card_panel, "OuterMargin/Root/ActionColumn/PrimaryButton"),
        "END TURN",
        "resolved card button"
    )
    _assert_equal(
        _label_text(card_panel, "OuterMargin/Root/CopyColumn/EffectLabel"),
        "-2 EVA",
        "resolved card effect label"
    )
    _assert_true(
        status_bar.primary_command_type != "request_end_turn",
        "resolved card panel owns end-turn shortcut"
    )


func _apply_definition(server_client: Node) -> void:
    var spaces: Array[Dictionary] = []
    for space_index: int in range(40):
        spaces.append({
            "index": space_index,
            "space_id": "space_%d" % space_index,
            "kind": "terrain",
            "label": "Space %d" % space_index,
            "group_id": "caracas",
            "purchase_price_eva": 1,
            "development_rent_table": [],
        })
    spaces[12] = {
        "index": 12,
        "space_id": "destiny_1",
        "kind": "destiny",
        "label": "Destino",
    }

    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_definition",
        "definition": {
            "spaces": spaces,
        },
    })


func _apply_card_resolved_event(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_event",
        "revision": 11,
        "event": {
            "type": "card_resolved",
            "player_id": "player_1",
            "space_id": "destiny_1",
            "deck_id": "destiny",
            "card_id": "destiny_operating_tax",
            "effect_type": "eva_delta",
            "amount_eva": -2,
        },
    })


func _apply_snapshot(server_client: Node, available_actions: Array[String], balance_eva: float, card_amount_eva: float) -> void:
    _apply_snapshot_for_player(
        server_client,
        "player_1",
        "player_1",
        available_actions,
        balance_eva,
        {
            "deck_id": "destiny",
            "card_id": "destiny_operating_tax",
            "player_id": "player_1",
            "space_id": "destiny_1",
            "effect": {
                "type": "eva_delta",
                "amount_eva": card_amount_eva,
            },
        }
    )


func _apply_snapshot_for_player(
    server_client: Node,
    local_player_id: String,
    active_player_id: String,
    available_actions: Array[String],
    balance_eva: float,
    pending_card_resolution: Variant
) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 10,
            "phase": "active",
            "local_player_id": local_player_id,
            "active_player_id": active_player_id,
            "winner_player_id": null,
            "players": [
                {
                    "player_id": "player_1",
                    "position": 12,
                    "joined": true,
                    "status": "active",
                    "eva_balance": balance_eva,
                },
                {
                    "player_id": "player_2",
                    "position": 0,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 50,
                },
            ],
            "terrain_ownership": [],
            "pending_rent": null,
            "pending_card_resolution": pending_card_resolution,
            "available_actions": available_actions,
        },
    })


func _label_text(parent_node: Node, node_path: NodePath) -> String:
    var label: Label = parent_node.get_node(node_path) as Label
    assert(label != null)
    return label.text


func _button_text(parent_node: Node, node_path: NodePath) -> String:
    var button: Button = parent_node.get_node(node_path) as Button
    assert(button != null)
    return button.text


func _assert_equal(actual: Variant, expected: Variant, label: String) -> void:
    if actual == expected:
        return

    failures += 1
    push_error("%s: expected %s, got %s" % [label, str(expected), str(actual)])


func _assert_true(value: bool, label: String) -> void:
    if value:
        return

    failures += 1
    push_error("%s: expected true" % label)
