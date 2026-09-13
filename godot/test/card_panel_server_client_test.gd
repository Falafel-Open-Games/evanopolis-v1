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
    _test_portfolio_button_opens_owned_terrain_panel(server_client)
    _test_portfolio_order_button_sends_development_order(server_client)
    _test_portfolio_sorts_owned_terrain_by_board_index(server_client)
    _test_developed_terrain_updates_board_props_and_rent(server_client)
    _test_full_city_monopoly_doubles_displayed_rent(server_client)
    _test_property_panel_fades_status_bar(server_client)
    _test_start_bonus_pass_event_shows_toast(server_client)
    _test_start_bonus_exact_landing_event_shows_toast(server_client)
    _test_card_resolved_event_shows_toast_for_other_players(server_client)
    _test_card_resolved_event_does_not_toast_for_local_player(server_client)
    _test_property_purchased_event_shows_toast_for_other_players(server_client)
    _test_property_purchased_event_does_not_toast_for_local_player(server_client)

    server_client.queue_free()
    await process_frame

    if failures > 0:
        quit(1)
        return

    print("Card/portfolio panel server-client tests passed")
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


func _test_portfolio_button_opens_owned_terrain_panel(server_client: Node) -> void:
    _apply_portfolio_snapshot(server_client)
    server_client.call("_refresh_overlay")
    server_client.call("_on_portfolio_pressed")

    var portfolio_panel: Variant = server_client.get("portfolio_panel")
    var list_container: VBoxContainer = portfolio_panel.get_node("OuterMargin/Root/ScrollContainer/ListContainer") as VBoxContainer
    var order_button: Button = portfolio_panel.get_node("OuterMargin/Root/Footer/OrderButton") as Button
    assert(list_container != null)
    assert(order_button != null)

    _assert_true(portfolio_panel.visible, "portfolio button opens panel")
    _assert_true(list_container.get_child_count() == 1, "portfolio lists owned terrain")
    _assert_true(not order_button.visible, "portfolio hides order button when ordering unavailable")

    portfolio_panel.call("_select_space_id", "space_7")
    _assert_true(not order_button.visible, "portfolio stays passive after read-only row click")

    portfolio_panel.visible = false


func _test_portfolio_order_button_sends_development_order(server_client: Node) -> void:
    _apply_portfolio_snapshot(server_client, ["request_order_development"])
    server_client.call("_refresh_overlay")
    server_client.call("_on_portfolio_pressed")

    var portfolio_panel: Variant = server_client.get("portfolio_panel")
    var order_button: Button = portfolio_panel.get_node("OuterMargin/Root/Footer/OrderButton") as Button
    assert(order_button != null)

    var list_container: VBoxContainer = portfolio_panel.get_node("OuterMargin/Root/ScrollContainer/ListContainer") as VBoxContainer
    assert(list_container != null)

    _assert_equal(order_button.text, "SELECT TERRAIN", "portfolio order button waits for selection")
    _assert_true(order_button.disabled, "portfolio order button disabled before selection")

    portfolio_panel.call("_select_space_id", "space_7")

    _assert_equal(order_button.text, "ORDER LOT #2 (1 EVA)", "portfolio selected order button label")
    _assert_true(not order_button.disabled, "portfolio order button enabled after selection")

    portfolio_panel.call("_select_space_id", "space_7")

    _assert_equal(order_button.text, "SELECT TERRAIN", "portfolio order button resets after unselect")
    _assert_true(order_button.disabled, "portfolio order button disabled after unselect")

    portfolio_panel.call("_select_space_id", "space_7")

    order_button.pressed.emit()

    var view_model: Variant = server_client.get("view_model")
    _assert_equal(view_model.last_sent_command, "request_order_development", "portfolio sends order command")
    _assert_equal(
        view_model.last_sent_command_payload.get("space_id", ""),
        "space_7",
        "portfolio sends order space id"
    )

    portfolio_panel.visible = false


func _test_portfolio_sorts_owned_terrain_by_board_index(server_client: Node) -> void:
    _apply_portfolio_snapshot_with_owned_spaces(server_client, ["space_8", "space_7"])
    server_client.call("_refresh_overlay")
    server_client.call("_on_portfolio_pressed")

    var portfolio_panel: Variant = server_client.get("portfolio_panel")
    var list_container: VBoxContainer = portfolio_panel.get_node("OuterMargin/Root/ScrollContainer/ListContainer") as VBoxContainer
    assert(list_container != null)

    _assert_equal(list_container.get_child_count(), 2, "portfolio sorted test row count")
    _assert_equal(
        _label_text(list_container.get_child(0), "RowMargin/RowLayout/CopyColumn/TitleLabel"),
        "SPACE 7",
        "portfolio first row uses lower board index"
    )
    _assert_equal(
        _label_text(list_container.get_child(1), "RowMargin/RowLayout/CopyColumn/TitleLabel"),
        "SPACE 8",
        "portfolio second row uses higher board index"
    )

    portfolio_panel.visible = false


func _test_developed_terrain_updates_board_props_and_rent(server_client: Node) -> void:
    _apply_developed_terrain_snapshot(server_client)
    server_client.call("_apply_snapshot_to_presentation", true)

    var container_layer: Variant = server_client.get("container_layer")
    _assert_true(container_layer.call("has_container", 7), "developed terrain shows container prop")

    var containers_by_space_index: Dictionary = container_layer.get("containers_by_space_index")
    assert(containers_by_space_index.has(7))
    var container: Node3D = containers_by_space_index[7] as Node3D
    assert(container != null)
    _assert_equal(int(container.get("miner_count")), 2, "developed terrain shows miner lots")

    var property_tile_face_layer: Variant = server_client.get("property_tile_face_layer")
    var faces_by_space_index: Dictionary = property_tile_face_layer.get("property_tile_faces_by_space_index")
    assert(faces_by_space_index.has(7))
    var property_tile_face: Node = faces_by_space_index[7] as Node
    assert(property_tile_face != null)
    _assert_equal(_label3d_text(property_tile_face, "Value"), "5 EVA", "developed terrain tile rent")


func _test_full_city_monopoly_doubles_displayed_rent(server_client: Node) -> void:
    _apply_full_city_monopoly_snapshot(server_client)
    server_client.call("_apply_snapshot_to_presentation", true)

    var property_tile_face_layer: Variant = server_client.get("property_tile_face_layer")
    var faces_by_space_index: Dictionary = property_tile_face_layer.get("property_tile_faces_by_space_index")
    assert(faces_by_space_index.has(7))
    var property_tile_face: Node = faces_by_space_index[7] as Node
    assert(property_tile_face != null)
    _assert_equal(_label3d_text(property_tile_face, "Value"), "14 EVA", "full city monopoly tile rent")

    server_client.call("_refresh_overlay")
    server_client.call("_on_portfolio_pressed")

    var portfolio_panel: Variant = server_client.get("portfolio_panel")
    var list_container: VBoxContainer = portfolio_panel.get_node("OuterMargin/Root/ScrollContainer/ListContainer") as VBoxContainer
    assert(list_container != null)
    _assert_true(list_container.get_child_count() == 4, "full city monopoly portfolio row count")
    var stats_column: VBoxContainer = list_container.get_child(0).get_node("RowMargin/RowLayout/StatsColumn") as VBoxContainer
    assert(stats_column != null)
    var rent_label: Label = stats_column.get_child(1) as Label
    assert(rent_label != null)
    _assert_equal(rent_label.text, "Rent 14 EVA", "full city monopoly portfolio rent")

    portfolio_panel.visible = false


func _test_property_panel_fades_status_bar(server_client: Node) -> void:
    _apply_property_decision_snapshot(server_client)
    server_client.call("_refresh_overlay")

    var property_panel: Variant = server_client.get("property_decision_panel")
    var status_bar: Variant = server_client.get("player_status_bar")

    _assert_true(property_panel.visible, "property decision panel visible")
    _assert_approx(status_bar.modulate.a, 0.16, 0.001, "property panel fades status bar")

    _apply_non_property_restore_snapshot(server_client)
    server_client.call("_refresh_overlay")

    _assert_true(not property_panel.visible, "property decision panel hidden before opacity restore")
    _assert_approx(status_bar.modulate.a, 1.0, 0.001, "status bar opacity restores without property panel")


func _test_start_bonus_pass_event_shows_toast(server_client: Node) -> void:
    server_client.call("_show_toast_for_event", {
        "type": "start_bonus_collected",
        "player_id": "player_1",
        "from_position": 34,
        "to_position": 1,
        "amount_eva": 2,
        "jackpot_free_rolls_awarded": 1,
        "exact_landing": false,
    })

    var toast_panel: PanelContainer = _toast_panel(server_client)

    _assert_true(toast_panel.visible, "start bonus toast is visible")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 passed SALIDA and collected +2 EVA",
        "start bonus pass toast text"
    )


func _test_start_bonus_exact_landing_event_shows_toast(server_client: Node) -> void:
    server_client.call("_show_toast_for_event", {
        "type": "start_bonus_collected",
        "player_id": "player_1",
        "from_position": 30,
        "to_position": 0,
        "amount_eva": 3,
        "jackpot_free_rolls_awarded": 1,
        "exact_landing": true,
    })

    var toast_panel: PanelContainer = _toast_panel(server_client)

    _assert_true(toast_panel.visible, "exact start bonus toast is visible")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 landed on SALIDA and collected +3 EVA",
        "start bonus exact landing toast text"
    )


func _test_card_resolved_event_shows_toast_for_other_players(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, null, 100)
    server_client.call("_show_toast_for_event", {
        "type": "card_resolved",
        "player_id": "player_1",
        "space_id": "luck_1",
        "deck_id": "luck",
        "card_id": "luck_unexpected_client",
        "effect_type": "eva_delta",
        "amount_eva": 1,
    })

    var toast_panel: PanelContainer = _toast_panel(server_client)
    _assert_true(toast_panel.visible, "observer card effect toast is visible")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 gained +1 EVA from SUERTE",
        "observer card effect toast text"
    )


func _test_card_resolved_event_does_not_toast_for_local_player(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_1", "player_1", [], 50, null, 101)
    var toast_panel: PanelContainer = _toast_panel(server_client)
    toast_panel.visible = false

    server_client.call("_show_toast_for_event", {
        "type": "card_resolved",
        "player_id": "player_1",
        "space_id": "destiny_1",
        "deck_id": "destiny",
        "card_id": "destiny_operating_tax",
        "effect_type": "eva_delta",
        "amount_eva": -2,
    })

    _assert_true(not toast_panel.visible, "local card effect does not show observer toast")


func _test_property_purchased_event_shows_toast_for_other_players(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, null, 102)
    server_client.call("_show_toast_for_event", {
        "type": "property_purchased",
        "player_id": "player_1",
        "space_id": "space_7",
        "price_eva": 1,
    })

    var toast_panel: PanelContainer = _toast_panel(server_client)
    _assert_true(toast_panel.visible, "observer property purchase toast is visible")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 bought SPACE 7 for 1 EVA",
        "observer property purchase toast text"
    )


func _test_property_purchased_event_does_not_toast_for_local_player(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_1", "player_1", [], 50, null, 103)
    var toast_panel: PanelContainer = _toast_panel(server_client)
    toast_panel.visible = false

    server_client.call("_show_toast_for_event", {
        "type": "property_purchased",
        "player_id": "player_1",
        "space_id": "space_7",
        "price_eva": 1,
    })

    _assert_true(not toast_panel.visible, "local property purchase does not show observer toast")


func _apply_definition(server_client: Node) -> void:
    var spaces: Array[Dictionary] = []
    for space_index: int in range(40):
        spaces.append({
            "index": space_index,
            "space_id": "space_%d" % space_index,
            "kind": "start",
            "label": "Space %d" % space_index,
            "group_id": "caracas",
            "purchase_price_eva": 1,
            "development_rent_table": [
                {
                    "level": 0,
                    "build_label": "Base",
                    "rent_eva": 1,
                },
                {
                    "level": 1,
                    "build_label": "Container",
                    "rent_eva": 3,
                },
                {
                    "level": 2,
                    "build_label": "1 Lot",
                    "rent_eva": 4,
                },
                {
                    "level": 3,
                    "build_label": "2 Lots",
                    "rent_eva": 5,
                },
                {
                    "level": 4,
                    "build_label": "3 Lots",
                    "rent_eva": 6,
                },
                {
                    "level": 5,
                    "build_label": "4 Lots",
                    "rent_eva": 7,
                },
            ],
            "container_price_eva": 2,
            "machine_lot_price_eva": 1,
        })
    spaces[7]["kind"] = "terrain"
    spaces[8]["kind"] = "terrain"
    spaces[10]["kind"] = "terrain"
    spaces[11]["kind"] = "terrain"
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


func _apply_portfolio_snapshot(server_client: Node, available_actions: Array[String] = []) -> void:
    _apply_portfolio_snapshot_with_owned_spaces(server_client, ["space_7"], available_actions)


func _apply_portfolio_snapshot_with_owned_spaces(
    server_client: Node,
    owned_space_ids: Array[String],
    available_actions: Array[String] = []
) -> void:
    var terrain_ownership: Array[Dictionary] = []
    for space_id: String in owned_space_ids:
        terrain_ownership.append({
            "space_id": space_id,
            "owner_player_id": "player_1",
        })

    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 12,
            "phase": "active",
            "local_player_id": "player_1",
            "active_player_id": "player_2",
            "winner_player_id": null,
            "players": [
                {
                    "player_id": "player_1",
                    "position": 12,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 43,
                },
                {
                    "player_id": "player_2",
                    "position": 0,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 50,
                },
            ],
            "terrain_ownership": terrain_ownership,
            "terrain_developments": [
                {
                    "space_id": "space_7",
                    "level": 1,
                    "has_container": true,
                    "machine_lot_count": 0,
                },
            ],
            "development_orders": [
                {
                    "order_id": "order_1",
                    "player_id": "player_1",
                    "space_id": "space_7",
                    "development_kind": "machine_lot",
                    "target_level": 2,
                    "price_eva": 1,
                    "created_revision": 11,
                },
            ],
            "pending_rent": null,
            "pending_card_resolution": null,
            "available_actions": available_actions,
        },
    })


func _apply_developed_terrain_snapshot(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 13,
            "phase": "active",
            "local_player_id": "player_1",
            "active_player_id": "player_2",
            "winner_player_id": null,
            "players": [
                {
                    "player_id": "player_1",
                    "position": 0,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 43,
                },
                {
                    "player_id": "player_2",
                    "position": 0,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 50,
                },
            ],
            "terrain_ownership": [
                {
                    "space_id": "space_7",
                    "owner_player_id": "player_1",
                },
            ],
            "terrain_developments": [
                {
                    "space_id": "space_7",
                    "level": 3,
                    "has_container": true,
                    "machine_lot_count": 2,
                },
            ],
            "development_orders": [],
            "pending_rent": null,
            "pending_card_resolution": null,
            "available_actions": [],
        },
    })


func _apply_full_city_monopoly_snapshot(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 14,
            "phase": "active",
            "local_player_id": "player_1",
            "active_player_id": "player_2",
            "winner_player_id": null,
            "players": [
                {
                    "player_id": "player_1",
                    "position": 0,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 43,
                },
                {
                    "player_id": "player_2",
                    "position": 0,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 50,
                },
            ],
            "terrain_ownership": [
                {
                    "space_id": "space_7",
                    "owner_player_id": "player_1",
                },
                {
                    "space_id": "space_8",
                    "owner_player_id": "player_1",
                },
                {
                    "space_id": "space_10",
                    "owner_player_id": "player_1",
                },
                {
                    "space_id": "space_11",
                    "owner_player_id": "player_1",
                },
            ],
            "terrain_developments": [
                {
                    "space_id": "space_7",
                    "level": 5,
                    "has_container": true,
                    "machine_lot_count": 4,
                },
                {
                    "space_id": "space_8",
                    "level": 5,
                    "has_container": true,
                    "machine_lot_count": 4,
                },
                {
                    "space_id": "space_10",
                    "level": 5,
                    "has_container": true,
                    "machine_lot_count": 4,
                },
                {
                    "space_id": "space_11",
                    "level": 5,
                    "has_container": true,
                    "machine_lot_count": 4,
                },
            ],
            "development_orders": [],
            "pending_rent": null,
            "pending_card_resolution": null,
            "available_actions": [],
        },
    })


func _apply_property_decision_snapshot(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 14,
            "phase": "active",
            "local_player_id": "player_1",
            "active_player_id": "player_1",
            "winner_player_id": null,
            "players": [
                {
                    "player_id": "player_1",
                    "position": 7,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 43,
                },
                {
                    "player_id": "player_2",
                    "position": 0,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 50,
                },
            ],
            "terrain_ownership": [
                {
                    "space_id": "space_7",
                    "owner_player_id": "player_1",
                },
            ],
            "terrain_developments": [],
            "development_orders": [],
            "pending_rent": null,
            "pending_card_resolution": null,
            "available_actions": ["request_end_turn"],
        },
    })


func _apply_non_property_restore_snapshot(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 15,
            "phase": "active",
            "local_player_id": "player_1",
            "active_player_id": "player_2",
            "winner_player_id": null,
            "players": [
                {
                    "player_id": "player_1",
                    "position": 12,
                    "joined": true,
                    "status": "active",
                    "eva_balance": 43,
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
            "terrain_developments": [],
            "development_orders": [],
            "pending_rent": null,
            "pending_card_resolution": null,
            "available_actions": [],
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
    pending_card_resolution: Variant,
    snapshot_revision: int = 10
) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": snapshot_revision,
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


func _toast_panel(server_client: Node) -> PanelContainer:
    var toast_presenter: Object = server_client.get("toast_presenter") as Object
    assert(toast_presenter != null)
    var toast_panel: PanelContainer = toast_presenter.get("panel") as PanelContainer
    assert(toast_panel != null)
    return toast_panel


func _label3d_text(parent_node: Node, node_path: NodePath) -> String:
    var label: Label3D = parent_node.get_node(node_path) as Label3D
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


func _assert_approx(actual: float, expected: float, tolerance: float, label: String) -> void:
    if absf(actual - expected) <= tolerance:
        return

    failures += 1
    push_error("%s: expected %s, got %s" % [label, str(expected), str(actual)])
