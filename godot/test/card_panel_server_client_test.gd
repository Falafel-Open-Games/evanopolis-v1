extends SceneTree

const ServerClientScene: PackedScene = preload("res://game/server-client-main.tscn")
const SpecialPropertyDataScript: GDScript = preload("res://game/scripts/special_property_data.gd")
const PropertyDecisionPresenterScript: GDScript = preload("res://game/scripts/property_decision_presenter.gd")

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
    await _test_portfolio_row_click_does_not_free_during_signal(server_client)
    _test_portfolio_sorts_owned_terrain_by_board_index(server_client)
    _test_portfolio_lists_special_properties_after_terrain(server_client)
    _test_developed_terrain_updates_board_props_and_rent(server_client)
    _test_full_city_monopoly_doubles_displayed_rent(server_client)
    _test_special_property_bonuses_update_displayed_rent(server_client)
    _test_available_property_rent_table_explains_bonus(server_client)
    _test_property_panel_hides_status_bar_and_shows_balance(server_client)
    _test_special_property_board_labels_default_to_english()
    _test_workshop_description_uses_v1_owner_bonus_copy()
    _test_special_property_panel_sends_purchase(server_client)
    _test_owned_special_property_shows_end_turn_panel(server_client)
    _test_status_bar_counts_special_properties(server_client)
    _test_status_bar_lists_player_balances(server_client)
    _test_special_property_ownership_updates_board_marker(server_client)
    _test_toast_panel_anchors_to_bottom_left(server_client)
    _test_jail_landing_toast_waits_for_presentation(server_client)
    _test_start_bonus_pass_event_shows_toast(server_client)
    _test_start_bonus_exact_landing_event_shows_toast(server_client)
    _test_card_resolved_event_shows_toast_for_other_players(server_client)
    _test_card_resolved_event_does_not_toast_for_local_player(server_client)
    _test_property_purchased_event_shows_toast_for_other_players(server_client)
    _test_property_purchased_event_does_not_toast_for_local_player(server_client)
    _test_rent_paid_event_shows_toast_for_other_players(server_client)
    _test_rent_paid_event_does_not_toast_for_payer(server_client)
    _test_jailed_player_status_bar_accepts_jail_time_after_landing(server_client)
    _test_jailed_player_status_bar_serves_sentence(server_client)
    _test_jail_sentence_turn_end_event_accepts_same_revision(server_client)
    _test_player_jailed_event_shows_toast_for_other_players(server_client)
    _test_jail_sentence_served_event_shows_toast_for_other_players(server_client)
    _test_player_eliminated_event_shows_toast_for_all_players(server_client)
    _test_observer_card_closes_on_resolution(server_client)
    _test_observer_refresh_restores_post_landing_camera(server_client)
    _test_special_property_purchase_toast(server_client)
    _test_development_delivery_toast(server_client)
    _test_toast_history_replays_after_snapshot(server_client)
    _test_new_events_replay_after_snapshot(server_client)
    _test_delivery_batch_summary_and_replay(server_client)
    _test_same_terrain_machine_lots_replay(server_client)
    await _test_toast_gap_for_wrapped_messages(server_client)
    await _test_pawn_step_landing_timing(server_client)

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
    _assert_equal(_label_text(card_panel, "OuterMargin/Root/CopyColumn/DeckLabel"), "DESTINY", "deck label")
    _assert_equal(_label_text(card_panel, "OuterMargin/Root/CopyColumn/TitleLabel"), "Destiny Event", "card title")
    _assert_equal(
        _label_text(card_panel, "OuterMargin/Root/CopyColumn/BodyLabel"),
        "A new tax was introduced. Pay 2 EVA.",
        "card uses English definition copy"
    )
    _assert_equal(_label_text(card_panel, "OuterMargin/Root/CopyColumn/EffectLabel"), "-2 EVA", "effect label")
    _assert_equal(_button_text(card_panel, "OuterMargin/Root/ActionColumn/PrimaryButton"), "APPLY CARD", "resolve button")
    _assert_true(not property_panel.visible, "pending card hides property panel")
    _assert_true(
        status_bar.primary_command_type != "request_end_turn",
        "pending card does not expose end turn shortcut"
    )

    var config: Variant = server_client.get("config")
    config.language = "pt_br"
    server_client.call("_refresh_overlay")
    _assert_equal(_label_text(card_panel, "OuterMargin/Root/CopyColumn/DeckLabel"), "DESTINO", "Portuguese deck label")
    _assert_equal(
        _label_text(card_panel, "OuterMargin/Root/CopyColumn/BodyLabel"),
        "Um novo imposto foi criado. Pague 2 EVA.",
        "card uses Portuguese definition copy"
    )
    config.language = "en"
    server_client.call("_refresh_overlay")


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


func _test_observer_card_closes_on_resolution(server_client: Node) -> void:
    var pending_card: Dictionary = {
        "deck_id": "destiny",
        "card_id": "destiny_operating_tax",
        "player_id": "player_1",
        "space_id": "destiny_1",
        "effect": {"type": "eva_delta", "amount_eva": -2},
    }
    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, pending_card, 3000)
    server_client.call("_refresh_overlay")

    var card_panel: Variant = server_client.get("card_resolution_panel")
    var action_column: VBoxContainer = card_panel.get_node("OuterMargin/Root/ActionColumn") as VBoxContainer
    _assert_true(card_panel.visible, "observer sees pending card")
    _assert_equal(_label_text(card_panel, "OuterMargin/Root/CopyColumn/TitleLabel"), "Destiny Event", "observer card title")
    _assert_equal(
        _label_text(card_panel, "OuterMargin/Root/CopyColumn/BodyLabel"),
        "A new tax was introduced. Pay 2 EVA.",
        "observer sees full card text"
    )
    _assert_equal(_label_text(card_panel, "OuterMargin/Root/CopyColumn/EffectLabel"), "-2 EVA", "observer card amount")
    _assert_true(not action_column.visible, "observer has no action button")
    _assert_equal(card_panel.offset_left, -448.0, "observer card uses compact width")
    _assert_equal(server_client.get("card_panel_primary_command"), "", "observer has no pending card command")

    var view_model: Variant = server_client.get("view_model")
    var resolved_event: Dictionary = {
        "type": "card_resolved",
        "player_id": "player_1",
        "space_id": "destiny_1",
        "deck_id": "destiny",
        "card_id": "destiny_operating_tax",
        "effect_type": "eva_delta",
        "amount_eva": -2,
    }
    view_model.apply_server_message({
        "type": "match_event",
        "revision": 3001,
        "event": resolved_event,
    })
    server_client.call("_show_toast_for_event", resolved_event)
    server_client.call("_refresh_overlay")
    _assert_true(not card_panel.visible, "observer card closes when result event arrives")
    var toast_panel: PanelContainer = _toast_panel(server_client)
    _assert_true(toast_panel.visible, "observer sees card result toast")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 paid 2 EVA from DESTINO",
        "observer result toast text"
    )

    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, null, 3001)
    server_client.call("_refresh_overlay")
    _assert_true(not card_panel.visible, "observer card stays closed after resolution snapshot")

    _apply_snapshot_for_player(server_client, "player_2", "player_2", ["request_roll"], 50, null, 3002)
    server_client.call("_refresh_overlay")
    _assert_true(not card_panel.visible, "observer card stays closed after turn handoff")

    view_model.apply_server_message({
        "type": "match_event",
        "revision": 3003,
        "event": {
            "type": "card_drawn",
            "player_id": "player_1",
            "space_id": "destiny_1",
            "deck_id": "destiny",
            "card_id": "destiny_operating_tax",
        },
    })
    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, pending_card, 3003)
    server_client.call("_refresh_overlay")
    _assert_true(card_panel.visible, "observer sees the next drawn card")


func _test_observer_refresh_restores_post_landing_camera(server_client: Node) -> void:
    var camera_controller: Variant = server_client.get("board_camera_controller")
    var camera_rig: Node3D = server_client.get_node("CameraRig") as Node3D
    var camera: Camera3D = server_client.get_node("CameraRig/Camera3D") as Camera3D
    camera_controller.focus_on_space(12, true)
    var expected_yaw: float = camera_rig.rotation.y
    camera_controller.focus_on_space(0, true)
    camera_controller.apply_zoom(false, true)
    server_client.set("has_hydrated_snapshot_camera", false)

    var pending_card: Dictionary = {
        "deck_id": "destiny",
        "card_id": "destiny_operating_tax",
        "player_id": "player_1",
        "space_id": "destiny_1",
        "effect": {"type": "eva_delta", "amount_eva": -2},
    }
    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, pending_card, 4000, [], 12, true)
    server_client.call("_apply_snapshot_to_presentation", false)

    _assert_equal(camera.fov, 8.0, "observer refresh restores near zoom after landing")
    _assert_equal(camera_rig.rotation.y, expected_yaw, "observer refresh focuses active pawn")

    camera_controller.focus_on_space(0, true)
    camera_controller.apply_zoom(false, true)
    server_client.set("has_hydrated_snapshot_camera", false)
    _apply_snapshot_for_player(server_client, "player_2", "player_1", ["request_roll"], 50, null, 4001, [], 12, false)
    server_client.call("_apply_snapshot_to_presentation", false)
    _assert_true(is_equal_approx(camera.fov, 25.8), "observer refresh keeps far zoom before roll")
    _assert_equal(camera_rig.rotation.y, expected_yaw, "observer refresh focuses active pawn before roll")


func _test_portfolio_button_opens_owned_terrain_panel(server_client: Node) -> void:
    _apply_portfolio_snapshot(server_client)
    server_client.call("_refresh_overlay")
    var status_bar: Variant = server_client.get("player_status_bar")
    status_bar.call("_toggle_players_popup")
    _assert_true(status_bar.get("players_popup").visible, "player roster opens before portfolio")
    server_client.call("_on_portfolio_pressed")

    var portfolio_panel: Variant = server_client.get("portfolio_panel")
    var list_container: VBoxContainer = portfolio_panel.get_node("OuterMargin/Root/ScrollContainer/ListContainer") as VBoxContainer
    var unavailable_hint_label: Label = portfolio_panel.get_node("OuterMargin/Root/Footer/UnavailableHintLabel") as Label
    var order_button: Button = portfolio_panel.get_node("OuterMargin/Root/Footer/OrderButton") as Button
    assert(list_container != null)
    assert(unavailable_hint_label != null)
    assert(order_button != null)

    _assert_true(portfolio_panel.visible, "portfolio button opens panel")
    _assert_true(not status_bar.get("players_popup").visible, "portfolio closes player roster")
    _assert_true(list_container.get_child_count() == 1, "portfolio lists owned terrain")
    _assert_true(not order_button.visible, "portfolio hides order button when ordering unavailable")
    _assert_true(unavailable_hint_label.visible, "portfolio shows unavailable order hint")
    _assert_equal(
        unavailable_hint_label.text,
        "No development orders available",
        "portfolio unavailable order hint copy"
    )

    portfolio_panel.call("_select_space_id", "space_7")
    _assert_equal(portfolio_panel.get("selected_space_id"), "space_7", "portfolio selects terrain in read-only mode")
    _assert_true(not order_button.visible, "portfolio keeps order button hidden after read-only row click")

    status_bar.call("_toggle_players_popup")
    _assert_true(status_bar.get("players_popup").visible, "player roster opens from portfolio view")
    _assert_true(not portfolio_panel.visible, "player roster closes portfolio")

    portfolio_panel.call("_select_space_id", "space_7")
    _assert_equal(portfolio_panel.get("selected_space_id"), "", "portfolio deselects terrain in read-only mode")

    portfolio_panel.visible = false


func _test_portfolio_order_button_sends_development_order(server_client: Node) -> void:
    _apply_portfolio_snapshot(server_client, ["request_order_development"])
    server_client.call("_refresh_overlay")
    server_client.call("_on_portfolio_pressed")

    var portfolio_panel: Variant = server_client.get("portfolio_panel")
    var unavailable_hint_label: Label = portfolio_panel.get_node("OuterMargin/Root/Footer/UnavailableHintLabel") as Label
    var order_button: Button = portfolio_panel.get_node("OuterMargin/Root/Footer/OrderButton") as Button
    assert(unavailable_hint_label != null)
    assert(order_button != null)

    var list_container: VBoxContainer = portfolio_panel.get_node("OuterMargin/Root/ScrollContainer/ListContainer") as VBoxContainer
    assert(list_container != null)

    _assert_true(not unavailable_hint_label.visible, "portfolio hides unavailable hint when ordering is available")
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


func _test_portfolio_row_click_does_not_free_during_signal(server_client: Node) -> void:
    _apply_portfolio_snapshot(server_client, ["request_order_development"])
    server_client.call("_refresh_overlay")
    var portfolio_panel: Variant = server_client.get("portfolio_panel")
    portfolio_panel.visible = true
    portfolio_panel.set("selected_space_id", "")
    portfolio_panel.set_portfolio_data(server_client.get("portfolio_presenter").build_panel_data())
    var list_container: VBoxContainer = portfolio_panel.get_node("OuterMargin/Root/ScrollContainer/ListContainer") as VBoxContainer
    assert(list_container != null)
    var row: Control = list_container.get_child(0) as Control
    assert(row != null)
    var click: InputEventMouseButton = InputEventMouseButton.new()
    click.button_index = MOUSE_BUTTON_LEFT
    click.pressed = true
    row.gui_input.emit(click)
    _assert_true(is_instance_valid(row), "portfolio row remains alive until input signal completes")
    await process_frame
    _assert_equal(portfolio_panel.get("selected_space_id"), "space_7", "portfolio row click selects terrain")
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


func _test_portfolio_lists_special_properties_after_terrain(server_client: Node) -> void:
    _apply_portfolio_snapshot_with_owned_spaces(
        server_client,
        ["space_7"],
        ["request_order_development"],
        ["special_importer_1"]
    )
    server_client.call("_refresh_overlay")
    server_client.call("_on_portfolio_pressed")

    var portfolio_panel: Variant = server_client.get("portfolio_panel")
    var list_container: VBoxContainer = portfolio_panel.get_node("OuterMargin/Root/ScrollContainer/ListContainer") as VBoxContainer
    var order_button: Button = portfolio_panel.get_node("OuterMargin/Root/Footer/OrderButton") as Button
    assert(list_container != null)
    assert(order_button != null)
    portfolio_panel.set("selected_space_id", "")
    portfolio_panel.call("_refresh_order_button")

    _assert_equal(list_container.get_child_count(), 3, "portfolio asset row count")
    _assert_equal(
        _label_text(list_container.get_child(0), "RowMargin/RowLayout/CopyColumn/TitleLabel"),
        "SPACE 7",
        "portfolio terrain row remains first"
    )
    _assert_equal(
        _label_text(list_container.get_child(1), "SectionHeaderLabel"),
        "SPECIAL PROPERTIES",
        "portfolio special property separator"
    )
    _assert_equal(
        _label_text(list_container.get_child(2), "RowMargin/RowLayout/CopyColumn/TitleLabel"),
        "IMPORTER 1",
        "portfolio special property row is appended"
    )
    var special_effect_label: Label = list_container.get_child(2).get_node("RowMargin/RowLayout/CopyColumn/OrderStatusLabel") as Label
    assert(special_effect_label != null)
    _assert_equal(
        special_effect_label.text,
        "Earns 10% equipment commission; both importers raise it to 20%",
        "portfolio special property effect text is complete"
    )
    _assert_equal(
        int(special_effect_label.autowrap_mode),
        int(TextServer.AUTOWRAP_WORD_SMART),
        "portfolio special property effect wraps"
    )
    var special_stats_column: VBoxContainer = list_container.get_child(2).get_node("RowMargin/RowLayout/StatsColumn") as VBoxContainer
    assert(special_stats_column != null)
    var special_level_label: Label = special_stats_column.get_child(0) as Label
    var special_rent_label: Label = special_stats_column.get_child(1) as Label
    assert(special_level_label != null)
    assert(special_rent_label != null)
    _assert_equal(
        special_level_label.text,
        "OWNED",
        "portfolio special property owned label"
    )
    _assert_equal(
        special_rent_label.text,
        "No rent",
        "portfolio special property no-rent label"
    )
    var special_category_label: Label = special_stats_column.get_child(2) as Label
    assert(special_category_label != null)
    _assert_equal(
        special_category_label.text,
        "SPECIAL",
        "portfolio special property category marker"
    )

    portfolio_panel.call("_select_space_id", "special_importer_1")

    _assert_equal(order_button.text, "SELECT TERRAIN", "portfolio ignores special property selection")
    _assert_true(order_button.disabled, "portfolio keeps order button disabled for special property")

    portfolio_panel.call("_select_space_id", "space_7")
    portfolio_panel.call("_select_space_id", "special_importer_1")

    _assert_equal(order_button.text, "ORDER LOT #2 (1 EVA)", "portfolio special property click does not steal selection")
    _assert_true(not order_button.disabled, "portfolio keeps terrain order active after passive row click")

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


func _test_special_property_bonuses_update_displayed_rent(server_client: Node) -> void:
    _apply_full_city_monopoly_snapshot(server_client, [
        {
            "space_id": "special_substation_1",
            "owner_player_id": "player_1",
        },
        {
            "space_id": "special_substation_2",
            "owner_player_id": "player_1",
        },
    ])
    server_client.call("_apply_snapshot_to_presentation", true)

    var property_tile_face_layer: Variant = server_client.get("property_tile_face_layer")
    var faces_by_space_index: Dictionary = property_tile_face_layer.get("property_tile_faces_by_space_index")
    assert(faces_by_space_index.has(7))
    var property_tile_face: Node = faces_by_space_index[7] as Node
    assert(property_tile_face != null)
    _assert_equal(_label3d_text(property_tile_face, "Value"), "18.2 EVA", "special property bonus tile rent")

    server_client.call("_refresh_overlay")
    server_client.call("_on_portfolio_pressed")

    var portfolio_panel: Variant = server_client.get("portfolio_panel")
    var list_container: VBoxContainer = portfolio_panel.get_node("OuterMargin/Root/ScrollContainer/ListContainer") as VBoxContainer
    assert(list_container != null)
    var stats_column: VBoxContainer = list_container.get_child(0).get_node("RowMargin/RowLayout/StatsColumn") as VBoxContainer
    assert(stats_column != null)
    var rent_label: Label = stats_column.get_child(1) as Label
    assert(rent_label != null)
    _assert_equal(rent_label.text, "Rent 18.2 EVA", "special property bonus portfolio rent")

    portfolio_panel.visible = false


func _test_available_property_rent_table_explains_bonus(server_client: Node) -> void:
    _apply_available_property_bonus_snapshot(server_client)
    server_client.call("_refresh_overlay")

    var property_panel: Variant = server_client.get("property_decision_panel")

    _assert_true(property_panel.visible, "available property with bonus shows decision panel")
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DetailsPanel/L0Row/L0Rent"),
        "1.1",
        "available property rent table previews local bonus"
    )
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DetailsPanel/DetailsNote"),
        "Bonus: +10% workshop bonus. Container 2 EVA · each lot costs 1 EVA",
        "available property rent table explains local bonus"
    )

    property_panel.visible = false


func _test_special_property_ownership_updates_board_marker(server_client: Node) -> void:
    _apply_special_property_marker_snapshot(server_client, [])
    server_client.call("_apply_snapshot_to_presentation", true)

    var property_tile_face_layer: Variant = server_client.get("property_tile_face_layer")
    var special_faces_by_space_index: Dictionary = property_tile_face_layer.get("special_property_tile_faces_by_space_index")
    assert(special_faces_by_space_index.has(9))
    var special_property_tile_face: Node = special_faces_by_space_index[9] as Node
    assert(special_property_tile_face != null)
    var owner_marker: MeshInstance3D = special_property_tile_face.get_node("square") as MeshInstance3D
    var value_label: Label3D = special_property_tile_face.get_node("Value") as Label3D
    assert(owner_marker != null)
    assert(value_label != null)
    _assert_true(not owner_marker.visible, "available special property hides owner marker")
    _assert_equal(value_label.text, "6 EVA", "available special property shows price")
    _assert_equal(value_label.modulate, Color.BLACK, "available special property value is black")

    _apply_special_property_marker_snapshot(server_client, [
        {
            "space_id": "special_substation_1",
            "owner_player_id": "player_1",
        },
    ])
    server_client.call("_apply_snapshot_to_presentation", true)

    _assert_true(not owner_marker.visible, "owned special property keeps slab marker hidden")
    _assert_equal(value_label.text, "OWNED", "owned special property shows owned label")
    _assert_equal(value_label.modulate, Color(0.909804, 0.282353, 0.333333, 1.0), "owned special property label color")
    _apply_definition(server_client)


func _apply_special_property_marker_snapshot(
    server_client: Node,
    special_property_ownership: Array[Dictionary]
) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 17,
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
            "terrain_ownership": [],
            "special_property_ownership": special_property_ownership,
            "terrain_developments": [],
            "development_orders": [],
            "pending_rent": null,
            "pending_card_resolution": null,
            "available_actions": [],
        },
    })


func _test_property_panel_hides_status_bar_and_shows_balance(server_client: Node) -> void:
    _apply_property_decision_snapshot(server_client)
    server_client.call("_refresh_overlay")

    var property_panel: Variant = server_client.get("property_decision_panel")
    var status_bar: Variant = server_client.get("player_status_bar")
    var view_model: Variant = server_client.get("view_model")

    _assert_true(property_panel.visible, "property decision panel visible")
    _assert_true(not status_bar.visible, "property panel hides floating status bar")
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DecisionColumn/DecisionHeader/StatusPriceBlock/BalanceLabel"),
        "Balance: %s EVA" % _format_test_eva_number(view_model.get_local_player_eva_balance()),
        "property panel shows local balance"
    )

    _apply_non_property_restore_snapshot(server_client)
    server_client.call("_refresh_overlay")

    _assert_true(not property_panel.visible, "property decision panel hidden before compact restore")
    _assert_true(status_bar.visible, "status bar restores without property panel")


func _test_special_property_board_labels_default_to_english() -> void:
    _assert_equal(
        String(SpecialPropertyDataScript.Names[SpecialPropertyDataScript.SpecialProperty.IMPORTADORA_2]),
        "Importer 2",
        "special property board label defaults to English"
    )
    _assert_equal(
        String(SpecialPropertyDataScript.Names[SpecialPropertyDataScript.SpecialProperty.TALLER_PROPIO]),
        "Workshop",
        "private workshop board label defaults to English"
    )


func _test_workshop_description_uses_v1_owner_bonus_copy() -> void:
    var presenter: RefCounted = PropertyDecisionPresenterScript.new()
    _assert_equal(
        presenter.call("_special_property_rule_text", {"special_property_id": "private_workshop"}),
        "Your terrains collect +10% rent.",
        "workshop special property rule copy"
    )


func _test_special_property_panel_sends_purchase(server_client: Node) -> void:
    _apply_special_property_decision_snapshot(server_client, [], ["request_purchase_special_property", "request_end_turn"])
    server_client.call("_refresh_overlay")

    var property_panel: Variant = server_client.get("property_decision_panel")
    var details_button: Button = property_panel.get_node("OuterMargin/DrawerRoot/DecisionColumn/DecisionHeader/DetailsButton") as Button
    assert(details_button != null)

    _assert_true(property_panel.visible, "special property decision panel visible")
    _assert_equal(
        server_client.get("property_panel_primary_command"),
        "request_purchase_special_property",
        "special property panel chooses purchase command"
    )
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DecisionColumn/DecisionHeader/TitleBlock/TitleLabel"),
        "IMPORTER 1",
        "special property title"
    )
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DecisionColumn/DecisionHeader/TitleBlock/KindLabel"),
        "Special property",
        "special property kind"
    )
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DecisionColumn/DecisionHeader/StatusPriceBlock/PriceLabel"),
        "5 EVA",
        "special property price"
    )
    _assert_equal(
        _button_text(property_panel, "OuterMargin/DrawerRoot/DecisionColumn/Buttons/PrimaryButton"),
        "BUY FOR 5 EVA",
        "special property buy button"
    )
    _assert_true(details_button.visible, "special property shows rule details button")
    details_button.pressed.emit()
    _assert_true(
        property_panel.get_node("OuterMargin/DrawerRoot/DetailsPanel").visible,
        "special property opens rule details"
    )
    _assert_true(
        not property_panel.get_node("OuterMargin/DrawerRoot/DetailsPanel/DetailsHeader").visible,
        "special property details hide rent table header"
    )
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DetailsPanel/DetailsTextHeader"),
        "Rule",
        "special property details title"
    )
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DetailsPanel/DetailsNote"),
        "Receives 10% equipment commission. Owning both importers raises that commission to 20%.",
        "special property details rule text"
    )
    details_button.pressed.emit()

    var primary_button: Button = property_panel.get_node("OuterMargin/DrawerRoot/DecisionColumn/Buttons/PrimaryButton") as Button
    assert(primary_button != null)
    primary_button.pressed.emit()

    var view_model: Variant = server_client.get("view_model")
    _assert_equal(view_model.last_sent_command, "request_purchase_special_property", "special property sends purchase command")


func _test_owned_special_property_shows_end_turn_panel(server_client: Node) -> void:
    _apply_special_property_decision_snapshot(
        server_client,
        [
            {
                "space_id": "special_importer_1",
                "owner_player_id": "player_2",
            },
        ],
        ["request_end_turn"]
    )
    server_client.call("_refresh_overlay")

    var property_panel: Variant = server_client.get("property_decision_panel")

    _assert_true(property_panel.visible, "owned special property decision panel visible")
    _assert_equal(
        server_client.get("property_panel_primary_command"),
        "request_end_turn",
        "owned special property chooses end turn command"
    )
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DecisionColumn/DecisionHeader/StatusPriceBlock/StatusRow/StatusLabel"),
        "Owned by Player 2",
        "owned special property status"
    )
    _assert_equal(
        _label_text(property_panel, "OuterMargin/DrawerRoot/DecisionColumn/DecisionHeader/StatusPriceBlock/PriceLabel"),
        "No rent",
        "owned special property has no rent"
    )
    _assert_equal(
        _button_text(property_panel, "OuterMargin/DrawerRoot/DecisionColumn/Buttons/PrimaryButton"),
        "END TURN",
        "owned special property end turn button"
    )
    property_panel.visible = false


func _test_status_bar_counts_special_properties(server_client: Node) -> void:
    _apply_special_property_count_snapshot(server_client)
    server_client.call("_refresh_overlay")

    var status_bar: Variant = server_client.get("player_status_bar")

    _assert_equal(
        _label_text(status_bar, "OuterMargin/Layout/Stats/OwnedLabel"),
        "OWNED: 2",
        "status bar counts terrain and special properties"
    )


func _test_status_bar_lists_player_balances(server_client: Node) -> void:
    _apply_portfolio_snapshot(server_client)
    server_client.call("_refresh_overlay")

    var status_bar: Variant = server_client.get("player_status_bar")
    var players_button: Button = status_bar.get_node("OuterMargin/Layout/PlayersButton") as Button
    var players_popup: Variant = status_bar.get("players_popup")
    var players_list: VBoxContainer = status_bar.get("players_list") as VBoxContainer
    assert(players_button != null)
    assert(players_popup != null)
    assert(players_list != null)

    _assert_equal(players_button.text, "PLAYERS", "status bar player roster button")
    _assert_equal(players_list.get_child_count(), 2, "status bar lists joined players")
    _assert_equal(
        (players_list.get_child(0).get_child(2) as Label).text,
        "43 EVA",
        "status bar lists local player balance"
    )
    _assert_equal(
        (players_list.get_child(1).get_child(2) as Label).text,
        "50 EVA",
        "status bar lists opponent balance"
    )
    _assert_true(players_popup.size.y > 0, "player roster popup sizes to its rows")
    status_bar.call("_toggle_players_popup")
    _assert_true(players_popup.visible, "player roster popup opens from status bar")
    status_bar.call("_toggle_players_popup")
    _assert_true(not players_popup.visible, "player roster popup closes from status bar")
    players_popup.hide()


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
        "PLAYER 1 passed START and collected +2 EVA",
        "start bonus pass toast text"
    )


func _test_toast_panel_anchors_to_bottom_left(server_client: Node) -> void:
    var toast_panel: PanelContainer = _toast_panel(server_client)
    var overlay: CanvasLayer = server_client.get("server_overlay") as CanvasLayer
    var controls: HBoxContainer = overlay.get_node("ToastHistoryControls") as HBoxContainer

    _assert_approx(toast_panel.anchor_left, 0.0, 0.001, "toast panel left anchor")
    _assert_approx(toast_panel.anchor_right, 0.0, 0.001, "toast panel right anchor")
    _assert_approx(toast_panel.anchor_top, 1.0, 0.001, "toast panel top anchor")
    _assert_approx(toast_panel.anchor_bottom, 1.0, 0.001, "toast panel bottom anchor")
    _assert_approx(toast_panel.offset_left, 24.0, 0.001, "toast panel left offset")
    _assert_approx(toast_panel.offset_right, 464.0, 0.001, "toast panel right offset")
    _assert_approx(controls.anchor_top, 1.0, 0.001, "history controls bottom anchor")
    _assert_approx(controls.offset_left, 24.0, 0.001, "history controls left offset")
    _assert_true(toast_panel.offset_bottom < controls.offset_top, "toast sits above history controls")
    _assert_equal(controls.get_child(0).name, "PreviousEventButton", "previous button appears first")
    _assert_equal(controls.get_child(1).name, "NextEventButton", "next button appears second")
    _assert_equal(controls.get_child(2).name, "HistoryButton", "latest button appears third")
    _assert_equal(controls.get_child(3).name, "EventLogButton", "event log button appears fourth")
    var music_button: Button = overlay.get_node("MusicToggleButton") as Button
    var music_player: AudioStreamPlayer = server_client.get("background_music_player") as AudioStreamPlayer
    var property_panel: Control = server_client.get("property_decision_panel") as Control
    assert(music_button != null)
    assert(music_player != null)
    assert(property_panel != null)
    _assert_approx(music_button.anchor_left, 1.0, 0.001, "music toggle is anchored to the right")
    _assert_approx(music_button.anchor_bottom, 1.0, 0.001, "music toggle is anchored to the bottom")
    _assert_true(music_button.offset_right < 0.0, "music toggle stays inside the right edge")
    _assert_true(music_button.offset_bottom < 0.0, "music toggle stays inside the bottom edge")
    _assert_true(
        music_button.get_global_rect().position.x >= property_panel.get_global_rect().end.x,
        "music toggle clears the property panel's right edge"
    )
    _assert_true(music_button.icon != null, "music toggle uses an icon")
    _assert_true(music_player.stream is AudioStreamOggVorbis, "background track is an OGG stream")
    _assert_true((music_player.stream as AudioStreamOggVorbis).loop, "background track loops")
    music_button.button_pressed = false
    _assert_equal(music_button.tooltip_text, "Play music", "muted toggle offers to play music")
    music_button.button_pressed = true
    _assert_equal(music_button.tooltip_text, "Mute music", "playing toggle offers to mute music")


func _test_jail_landing_toast_waits_for_presentation(server_client: Node) -> void:
    _assert_true(
        bool(server_client.call("_should_show_toast_after_presentation", {
            "type": "player_jailed",
        })),
        "jail landing toast waits for movement presentation"
    )
    _assert_true(
        not bool(server_client.call("_should_show_toast_after_presentation", {
            "type": "rent_paid",
        })),
        "rent toast remains immediate"
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
        "PLAYER 1 landed on START and collected +3 EVA",
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


func _test_special_property_purchase_toast(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, null, 4002)
    var purchase_event: Dictionary = {
        "type": "special_property_purchased",
        "player_id": "player_1",
        "space_id": "special_importer_1",
        "special_property_id": "importer_1",
        "price_eva": 5,
    }
    server_client.call("_show_toast_for_event", purchase_event)
    var toast_panel: PanelContainer = _toast_panel(server_client)
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 bought IMPORTER 1 for 5 EVA",
        "observer special property purchase toast text"
    )

    _apply_snapshot_for_player(server_client, "player_1", "player_1", [], 50, null, 4003)
    toast_panel.visible = false
    server_client.call("_show_toast_for_event", purchase_event)
    _assert_true(not toast_panel.visible, "local special property purchase skips live toast")


func _test_development_delivery_toast(server_client: Node) -> void:
    var delivery_event: Dictionary = {
        "type": "development_order_delivered",
        "player_id": "player_1",
        "order_id": "order_1",
        "space_id": "space_7",
        "development_kind": "container",
        "revision": 4003,
    }
    var toast_panel: PanelContainer = _toast_panel(server_client)
    var presentation_queue: Node = server_client.get("presentation_queue") as Node
    toast_panel.visible = false
    server_client.call("_record_live_delivery_event", delivery_event)
    presentation_queue.set("busy", true)
    server_client.call("_finalize_live_delivery_batch")
    _assert_true(not toast_panel.visible, "delivery toast waits while handoff presentation is busy")
    presentation_queue.set("busy", false)
    server_client.call("_show_ready_delivery_toast")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1's container arrived at SPACE 7",
        "development delivery toast text"
    )


func _test_rent_paid_event_shows_toast_for_other_players(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, null, 104)
    server_client.call("_show_toast_for_event", {
        "type": "rent_paid",
        "payer_player_id": "player_1",
        "owner_player_id": "player_2",
        "space_id": "space_7",
        "rent_eva": 1,
    })

    var toast_panel: PanelContainer = _toast_panel(server_client)
    _assert_true(toast_panel.visible, "observer rent paid toast is visible")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 paid 1 EVA rent to PLAYER 2 for SPACE 7",
        "observer rent paid toast text"
    )


func _test_rent_paid_event_does_not_toast_for_payer(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_1", "player_1", [], 50, null, 105)
    var toast_panel: PanelContainer = _toast_panel(server_client)
    toast_panel.visible = false

    server_client.call("_show_toast_for_event", {
        "type": "rent_paid",
        "payer_player_id": "player_1",
        "owner_player_id": "player_2",
        "space_id": "space_7",
        "rent_eva": 1,
    })

    _assert_true(not toast_panel.visible, "local rent payer does not show observer toast")


func _test_jailed_player_status_bar_serves_sentence(server_client: Node) -> void:
    server_client.call("_hide_interaction_panels")
    _apply_snapshot_for_player(
        server_client,
        "player_1",
        "player_1",
        ["request_end_turn"],
        50,
        null,
        2006,
        ["player_1"],
        18
    )
    server_client.call("_refresh_overlay")

    var status_bar: Variant = server_client.get("player_status_bar")
    _assert_equal(status_bar.primary_command_type, "request_end_turn", "jailed player status command")
    _assert_equal(
        _button_text(status_bar, "OuterMargin/Layout/Commands/RollButton"),
        "SERVE SENTENCE",
        "jailed player status button label"
    )


func _test_jailed_player_status_bar_accepts_jail_time_after_landing(server_client: Node) -> void:
    server_client.call("_hide_interaction_panels")
    _apply_snapshot_for_player(
        server_client,
        "player_1",
        "player_1",
        ["request_end_turn"],
        50,
        null,
        2005,
        ["player_1"],
        18,
        true
    )
    server_client.call("_refresh_overlay")

    var status_bar: Variant = server_client.get("player_status_bar")
    _assert_equal(status_bar.primary_command_type, "request_end_turn", "jailed landing status command")
    _assert_equal(
        _button_text(status_bar, "OuterMargin/Layout/Commands/RollButton"),
        "ACCEPT JAIL TIME",
        "jailed landing status button label"
    )
    _assert_true(
        status_bar.custom_minimum_size.x >= 580.0,
        "player status bar has room for jail command label"
    )
    var roll_button: Button = status_bar.get_node("OuterMargin/Layout/Commands/RollButton") as Button
    _assert_true(
        roll_button.custom_minimum_size.x >= 156.0,
        "jailed landing status button has room for label"
    )


func _test_jail_sentence_turn_end_event_accepts_same_revision(server_client: Node) -> void:
    var presentation_queue: Variant = server_client.get("presentation_queue")
    presentation_queue.call("cancel_and_resync_to_revision", 2008)

    var accepted: bool = bool(presentation_queue.call("enqueue_event", {
        "revision": 2008,
        "type": "turn_ended",
        "player_id": "player_1",
        "next_player_id": "player_2",
    }))

    _assert_true(accepted, "turn ended event accepts jail sentence same revision follow-up")
    presentation_queue.call("cancel_and_resync_to_revision", 2008)


func _test_player_jailed_event_shows_toast_for_other_players(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, null, 2007)
    server_client.call("_show_toast_for_event", {
        "type": "player_jailed",
        "player_id": "player_1",
        "space_id": "jail",
        "skip_turns": 1,
    })

    var toast_panel: PanelContainer = _toast_panel(server_client)
    _assert_true(toast_panel.visible, "observer jail toast is visible")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 landed in JAIL and will skip a turn",
        "observer jail toast text"
    )


func _test_jail_sentence_served_event_shows_toast_for_other_players(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_2", "player_1", [], 50, null, 2008)
    server_client.call("_show_toast_for_event", {
        "type": "jail_sentence_served",
        "player_id": "player_1",
        "space_id": "jail",
    })

    var toast_panel: PanelContainer = _toast_panel(server_client)
    _assert_true(toast_panel.visible, "observer sentence-served toast is visible")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 served their jail sentence",
        "observer sentence-served toast text"
    )


func _test_player_eliminated_event_shows_toast_for_all_players(server_client: Node) -> void:
    _apply_snapshot_for_player(server_client, "player_1", "player_1", [], 0, null, 2009)
    server_client.call("_show_toast_for_event", {
        "type": "player_eliminated",
        "player_id": "player_1",
        "creditor_player_id": "player_2",
        "reason": "insufficient_rent",
        "space_id": "space_7",
        "unpaid_rent_eva": 4,
        "transferred_balance_eva": 0,
        "transferred_space_ids": [],
        "next_player_id": "player_2",
    })

    var toast_panel: PanelContainer = _toast_panel(server_client)
    _assert_true(toast_panel.visible, "game-over toast is visible to eliminated player")
    _assert_equal(
        _label_text(toast_panel, "ToastMargin/ToastLabel"),
        "PLAYER 1 is out of the game. Assets transfer to PLAYER 2",
        "game-over toast text"
    )


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
                    "build_label": "1 lot / 50 rigs",
                    "rent_eva": 4,
                },
                {
                    "level": 3,
                    "build_label": "2 lots / 100 rigs",
                    "rent_eva": 5,
                },
                {
                    "level": 4,
                    "build_label": "3 lots / 150 rigs",
                    "rent_eva": 6,
                },
                {
                    "level": 5,
                    "build_label": "4 lots / 200 rigs",
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
    spaces[3] = {
        "index": 3,
        "space_id": "special_importer_1",
        "kind": "special_property",
        "label": "Importadora 1",
        "labels": {
            "en": "Importer 1",
        },
        "special_property_id": "importer_1",
        "purchase_price_eva": 5,
    }
    spaces[9] = {
        "index": 9,
        "space_id": "special_substation_1",
        "kind": "special_property",
        "label": "Substation 1",
        "labels": {
            "en": "Substation 1",
        },
        "special_property_id": "substation_1",
        "purchase_price_eva": 6,
    }
    spaces[15] = {
        "index": 15,
        "space_id": "special_private_workshop",
        "kind": "special_property",
        "label": "Private Workshop",
        "labels": {
            "en": "Private Workshop",
        },
        "special_property_id": "private_workshop",
        "purchase_price_eva": 8,
    }
    spaces[21] = {
        "index": 21,
        "space_id": "special_importer_2",
        "kind": "special_property",
        "label": "Importer 2",
        "labels": {
            "en": "Importer 2",
        },
        "special_property_id": "importer_2",
        "purchase_price_eva": 5,
    }
    spaces[27] = {
        "index": 27,
        "space_id": "special_substation_2",
        "kind": "special_property",
        "label": "Substation 2",
        "labels": {
            "en": "Substation 2",
        },
        "special_property_id": "substation_2",
        "purchase_price_eva": 6,
    }
    spaces[33] = {
        "index": 33,
        "space_id": "special_cooling_plant",
        "kind": "special_property",
        "label": "Cooling Plant",
        "labels": {
            "en": "Cooling Plant",
        },
        "special_property_id": "cooling_plant",
        "purchase_price_eva": 10,
    }
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
            "card_decks": [
                {
                    "deck_id": "destiny",
                    "labels": {"en": "Destiny", "es": "Destino", "pt_br": "Destino"},
                    "cards": [
                        {
                            "card_id": "destiny_operating_tax",
                            "deck_id": "destiny",
                            "labels": {
                                "en": "A new tax was introduced. Pay 2 EVA.",
                                "es": "Se creó un nuevo impuesto. Paga 2 EVA.",
                                "pt_br": "Um novo imposto foi criado. Pague 2 EVA.",
                            },
                            "effect": {"type": "eva_delta", "amount_eva": -2},
                        },
                    ],
                },
            ],
        },
    })


func _apply_portfolio_snapshot(server_client: Node, available_actions: Array[String] = []) -> void:
    _apply_portfolio_snapshot_with_owned_spaces(server_client, ["space_7"], available_actions)


func _apply_portfolio_snapshot_with_owned_spaces(
    server_client: Node,
    owned_space_ids: Array[String],
    available_actions: Array[String] = [],
    owned_special_property_space_ids: Array[String] = []
) -> void:
    var terrain_ownership: Array[Dictionary] = []
    for space_id: String in owned_space_ids:
        terrain_ownership.append({
            "space_id": space_id,
            "owner_player_id": "player_1",
        })
    var special_property_ownership: Array[Dictionary] = []
    for space_id: String in owned_special_property_space_ids:
        special_property_ownership.append({
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
            "special_property_ownership": special_property_ownership,
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


func _apply_full_city_monopoly_snapshot(
    server_client: Node,
    special_property_ownership: Array[Dictionary] = []
) -> void:
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
            "special_property_ownership": special_property_ownership,
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


func _apply_available_property_bonus_snapshot(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 15,
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
            "terrain_ownership": [],
            "special_property_ownership": [
                {
                    "space_id": "special_private_workshop",
                    "owner_player_id": "player_1",
                },
            ],
            "terrain_developments": [],
            "development_orders": [],
            "pending_rent": null,
            "pending_card_resolution": null,
            "available_actions": ["request_purchase_property", "request_end_turn"],
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


func _apply_special_property_decision_snapshot(
    server_client: Node,
    special_property_ownership: Array,
    available_actions: Array[String]
) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 16,
            "phase": "active",
            "local_player_id": "player_1",
            "active_player_id": "player_1",
            "winner_player_id": null,
            "players": [
                {
                    "player_id": "player_1",
                    "position": 3,
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
            "special_property_ownership": special_property_ownership,
            "terrain_developments": [],
            "development_orders": [],
            "pending_rent": null,
            "pending_card_resolution": null,
            "available_actions": available_actions,
        },
    })


func _apply_special_property_count_snapshot(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": 17,
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
            "special_property_ownership": [
                {
                    "space_id": "special_importer_1",
                    "owner_player_id": "player_1",
                },
            ],
            "terrain_developments": [],
            "development_orders": [],
            "pending_rent": null,
            "pending_card_resolution": null,
            "available_actions": [],
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
    snapshot_revision: int = 10,
    jailed_player_ids: Array[String] = [],
    local_player_position: int = 12,
    has_rolled_current_turn: bool = false
) -> void:
    var view_model: Variant = server_client.get("view_model")
    view_model.apply_server_message({
        "type": "match_snapshot",
        "snapshot": {
            "revision": snapshot_revision,
            "phase": "active",
            "has_rolled_current_turn": has_rolled_current_turn,
            "local_player_id": local_player_id,
            "active_player_id": active_player_id,
            "winner_player_id": null,
            "players": [
                {
                    "player_id": "player_1",
                    "position": local_player_position,
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
            "jailed_player_ids": jailed_player_ids,
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


func _test_toast_history_replays_after_snapshot(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    var next_snapshot: Dictionary = view_model.snapshot.duplicate(true)
    next_snapshot["revision"] = int(next_snapshot.get("revision", 0)) + 1
    next_snapshot["recent_events"] = [
        {
            "match_id": "demo",
            "revision": next_snapshot["revision"],
            "event": {
                "type": "property_purchased",
                "player_id": "player_1",
                "space_id": "caracas_1",
                "price_eva": 2,
            },
        },
        {
            "match_id": "demo",
            "revision": next_snapshot["revision"],
            "event": {
                "type": "card_resolved",
                "player_id": "player_2",
                "deck_id": "destiny",
                "effect_type": "eva_delta",
                "amount_eva": -2,
            },
        },
    ]
    server_client.call("_on_server_message_received", {
        "type": "match_snapshot",
        "snapshot": next_snapshot,
    })

    var toast_presenter: Object = server_client.get("toast_presenter") as Object
    var previous_button: Button = toast_presenter.get("previous_button") as Button
    var next_button: Button = toast_presenter.get("next_button") as Button
    var history_button: Button = toast_presenter.get("history_button") as Button
    var event_log_button: Button = toast_presenter.get("event_log_button") as Button
    var event_log_panel: PanelContainer = toast_presenter.get("event_log_panel") as PanelContainer
    var event_log_list: VBoxContainer = toast_presenter.get("event_log_list") as VBoxContainer
    var toast_label: Label = toast_presenter.get("label") as Label
    _assert_true(history_button.icon != null, "history icon is a texture")
    _assert_equal(history_button.text, "", "history control does not depend on a font glyph")
    _assert_true(not previous_button.disabled, "previous event becomes available from snapshot history")
    _assert_true(next_button.disabled, "newest history event disables next")

    previous_button.pressed.emit()
    _assert_true(toast_label.text.contains("bought"), "previous replays local purchase as toast")
    _assert_true(not next_button.disabled, "next becomes available after moving backward")
    next_button.pressed.emit()
    _assert_true(toast_label.text.contains("DESTINO"), "next replays newer card result")
    history_button.pressed.emit()
    _assert_true(next_button.disabled, "history icon returns to latest event")

    event_log_button.button_pressed = true
    _assert_true(event_log_panel.visible, "event log button opens the event list")
    _assert_equal(event_log_list.get_child_count(), 2, "event log lists replayable snapshot events")
    var newest_row: Button = event_log_list.get_child(0) as Button
    var oldest_row: Button = event_log_list.get_child(1) as Button
    _assert_true(newest_row.text.contains("DESTINO"), "event log lists the newest event first")
    _assert_true(oldest_row.text.contains("bought"), "event log lists the oldest event last")
    oldest_row.pressed.emit()
    _assert_true(not event_log_panel.visible, "selecting an event closes the event log")
    _assert_true(toast_label.text.contains("bought"), "selecting an event replays its toast")
    history_button.pressed.emit()


func _test_new_events_replay_after_snapshot(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    var next_snapshot: Dictionary = view_model.snapshot.duplicate(true)
    next_snapshot["revision"] = int(next_snapshot.get("revision", 0)) + 1
    next_snapshot["recent_events"] = [
        {
            "match_id": "demo",
            "revision": next_snapshot["revision"],
            "event": {
                "type": "special_property_purchased",
                "player_id": "player_1",
                "space_id": "special_importer_1",
                "special_property_id": "importer_1",
                "price_eva": 5,
            },
        },
        {
            "match_id": "demo",
            "revision": next_snapshot["revision"],
            "event": {
                "type": "development_order_delivered",
                "player_id": "player_2",
                "order_id": "order_2",
                "space_id": "space_7",
                "development_kind": "machine_lot",
            },
        },
    ]
    server_client.call("_on_server_message_received", {
        "type": "match_snapshot",
        "snapshot": next_snapshot,
    })

    var toast_presenter: Object = server_client.get("toast_presenter") as Object
    var previous_button: Button = toast_presenter.get("previous_button") as Button
    var next_button: Button = toast_presenter.get("next_button") as Button
    var toast_label: Label = toast_presenter.get("label") as Label
    previous_button.pressed.emit()
    _assert_equal(toast_label.text, "PLAYER 1 bought IMPORTER 1 for 5 EVA", "replay local special property purchase")
    next_button.pressed.emit()
    _assert_equal(toast_label.text, "PLAYER 2's machine lot arrived at SPACE 7", "replay delivered machine lot")


func _test_delivery_batch_summary_and_replay(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    var next_snapshot: Dictionary = view_model.snapshot.duplicate(true)
    var next_revision: int = int(next_snapshot.get("revision", 0)) + 1
    next_snapshot["revision"] = next_revision
    var deliveries: Array[Dictionary] = [
        {"type": "development_order_delivered", "player_id": "player_1", "order_id": "order_1", "space_id": "space_7", "development_kind": "container"},
        {"type": "development_order_delivered", "player_id": "player_1", "order_id": "order_2", "space_id": "space_8", "development_kind": "machine_lot"},
        {"type": "development_order_delivered", "player_id": "player_1", "order_id": "order_3", "space_id": "space_8", "development_kind": "machine_lot"},
        {"type": "development_order_delivered", "player_id": "player_1", "order_id": "order_4", "space_id": "space_10", "development_kind": "container"},
        {"type": "development_order_delivered", "player_id": "player_1", "order_id": "order_5", "space_id": "space_10", "development_kind": "machine_lot"},
    ]
    var recent_events: Array[Dictionary] = [{
        "match_id": "demo",
        "revision": next_revision,
        "event": {
            "type": "turn_ended",
            "player_id": "player_2",
            "next_player_id": "player_1",
        },
    }]
    var toast_presenter: Object = server_client.get("toast_presenter") as Object
    var toast_panel: PanelContainer = _toast_panel(server_client)
    toast_panel.visible = false
    for delivery: Dictionary in deliveries:
        server_client.call("_on_server_message_received", {
            "type": "match_event",
            "match_id": "demo",
            "revision": next_revision,
            "event": delivery,
        })
        _assert_true(not toast_panel.visible, "batch delivery event does not interrupt with a live detail toast")
        recent_events.append({
            "match_id": "demo",
            "revision": next_revision,
            "event": delivery,
        })
    next_snapshot["recent_events"] = recent_events

    server_client.call("_on_server_message_received", {
        "type": "match_snapshot",
        "snapshot": next_snapshot,
    })
    var toast_label: Label = toast_presenter.get("label") as Label
    _assert_equal(
        toast_label.text,
        "PLAYER 1: 5 developments arrived on 3 terrains",
        "batch live toast summarizes count and terrain count"
    )

    var history_events: Array = toast_presenter.get("history_events") as Array
    _assert_equal(history_events.size(), 5, "replay groups two lots on one terrain and keeps the summary")
    var previous_button: Button = toast_presenter.get("previous_button") as Button
    var latest_button: Button = toast_presenter.get("history_button") as Button
    previous_button.pressed.emit()
    _assert_equal(toast_label.text, "PLAYER 1's machine lot arrived at SPACE 10", "previous opens last delivery")
    previous_button.pressed.emit()
    previous_button.pressed.emit()
    _assert_equal(toast_label.text, "PLAYER 1's 2 machine lots arrived at SPACE 8", "replay groups lots on the same terrain")
    for index: int in range(1):
        previous_button.pressed.emit()
    _assert_equal(toast_label.text, "PLAYER 1's container arrived at SPACE 7", "previous reaches first delivery")
    latest_button.pressed.emit()
    _assert_equal(toast_label.text, "PLAYER 1: 5 developments arrived on 3 terrains", "latest replays batch summary")

    var truncated_snapshot: Dictionary = next_snapshot.duplicate(true)
    truncated_snapshot["revision"] = next_revision + 1
    truncated_snapshot["recent_events"] = recent_events.slice(2)
    server_client.call("_on_server_message_received", {
        "type": "match_snapshot",
        "snapshot": truncated_snapshot,
    })
    history_events = toast_presenter.get("history_events") as Array
    _assert_equal(history_events.size(), 3, "truncated batch keeps grouped details without an inaccurate summary")


func _test_same_terrain_machine_lots_replay(server_client: Node) -> void:
    var view_model: Variant = server_client.get("view_model")
    var next_snapshot: Dictionary = view_model.snapshot.duplicate(true)
    var next_revision: int = int(next_snapshot.get("revision", 0)) + 1
    next_snapshot["revision"] = next_revision
    var deliveries: Array[Dictionary] = [{
        "type": "development_order_delivered", "player_id": "player_1", "order_id": "container_1",
        "space_id": "space_8", "development_kind": "container",
    }]
    for index: int in range(3):
        deliveries.append({
            "type": "development_order_delivered", "player_id": "player_1", "order_id": "lot_%d" % index,
            "space_id": "space_8", "development_kind": "machine_lot",
        })
    var recent_events: Array[Dictionary] = [{
        "match_id": "demo", "revision": next_revision,
        "event": {"type": "turn_ended", "player_id": "player_2", "next_player_id": "player_1"},
    }]
    for delivery: Dictionary in deliveries:
        server_client.call("_on_server_message_received", {
            "type": "match_event", "match_id": "demo", "revision": next_revision, "event": delivery,
        })
        recent_events.append({"match_id": "demo", "revision": next_revision, "event": delivery})
    next_snapshot["recent_events"] = recent_events
    server_client.call("_on_server_message_received", {"type": "match_snapshot", "snapshot": next_snapshot})

    var toast_presenter: Object = server_client.get("toast_presenter") as Object
    var toast_label: Label = toast_presenter.get("label") as Label
    var history_events: Array = toast_presenter.get("history_events") as Array
    _assert_equal(toast_label.text, "PLAYER 1: 4 developments arrived on 1 terrain", "mixed batch live summary counts raw deliveries")
    _assert_equal(history_events.size(), 3, "container and three lots make two details plus summary")
    var previous_button: Button = toast_presenter.get("previous_button") as Button
    previous_button.pressed.emit()
    _assert_equal(toast_label.text, "PLAYER 1's 3 machine lots arrived at SPACE 8", "three lots replay once with quantity")
    previous_button.pressed.emit()
    _assert_equal(toast_label.text, "PLAYER 1's container arrived at SPACE 8", "container remains a separate replay item")

    var lots_only_revision: int = next_revision + 1
    var lots_only_snapshot: Dictionary = next_snapshot.duplicate(true)
    lots_only_snapshot["revision"] = lots_only_revision
    var lots_only_events: Array[Dictionary] = [{
        "match_id": "demo", "revision": lots_only_revision,
        "event": {"type": "turn_ended", "player_id": "player_2", "next_player_id": "player_1"},
    }]
    for delivery: Dictionary in deliveries.slice(1):
        server_client.call("_on_server_message_received", {
            "type": "match_event", "match_id": "demo", "revision": lots_only_revision, "event": delivery,
        })
        lots_only_events.append({"match_id": "demo", "revision": lots_only_revision, "event": delivery})
    lots_only_snapshot["recent_events"] = lots_only_events
    server_client.call("_on_server_message_received", {"type": "match_snapshot", "snapshot": lots_only_snapshot})
    history_events = toast_presenter.get("history_events") as Array
    _assert_equal(history_events.size(), 1, "three lots alone replay as one item")
    _assert_equal(toast_label.text, "PLAYER 1's 3 machine lots arrived at SPACE 8", "three lots alone show grouped live toast")
    _assert_equal(
        str((history_events[0] as Dictionary).get("event", {}).get("quantity", 0)),
        "3", "grouped replay event keeps all three lots"
    )


func _test_toast_gap_for_wrapped_messages(server_client: Node) -> void:
    var toast_presenter: Object = server_client.get("toast_presenter") as Object
    var toast_panel: PanelContainer = toast_presenter.get("panel") as PanelContainer
    var overlay: CanvasLayer = server_client.get("server_overlay") as CanvasLayer
    var controls: HBoxContainer = overlay.get_node("ToastHistoryControls") as HBoxContainer
    toast_presenter.call("show", "PLAYER 2 paid 123 EVA rent to PLAYER 1 for a very long terrain name that makes this message wrap across multiple lines")
    await create_timer(0.25).timeout
    _assert_true(toast_panel.size.y > 50.0, "wrapped toast grows beyond its single-line height")
    _assert_true(
        toast_panel.get_global_rect().end.y <= controls.get_global_rect().position.y - 10.0,
        "wrapped toast keeps a gap above history controls"
    )


func _test_pawn_step_landing_timing(server_client: Node) -> void:
    var pawn_layer: Node3D = server_client.get("player_pawn_layer") as Node3D
    var tiles_root: Node3D = server_client.get_node("BoardRoot/Tiles") as Node3D
    var pawn: Node3D = pawn_layer.get("player_pawns")[0] as Node3D
    var landed_steps: Array[int] = []
    pawn_layer.connect("pawn_step_landed", func(player_index: int, step_index: int) -> void:
        if player_index == 0:
            landed_steps.append(step_index)
    )
    pawn.global_position = pawn_layer.call("get_space_position", tiles_root, 0)
    pawn_layer.call("animate_player_path", tiles_root, 0, 0, 2)
    await create_timer(0.36).timeout
    _assert_equal(landed_steps, [0], "first pawn contact fires before the next hop")
    await create_timer(0.44).timeout
    _assert_equal(landed_steps, [0, 1], "each pawn contact fires once")

    pawn_layer.call("animate_player_path", tiles_root, 0, 2, 3)
    await create_timer(0.08).timeout
    pawn_layer.call("cancel_all_animations")
    await create_timer(0.35).timeout
    _assert_equal(landed_steps, [0, 1], "cancelled movement has no contact cue")


func _label3d_text(parent_node: Node, node_path: NodePath) -> String:
    var label: Label3D = parent_node.get_node(node_path) as Label3D
    assert(label != null)
    return label.text


func _button_text(parent_node: Node, node_path: NodePath) -> String:
    var button: Button = parent_node.get_node(node_path) as Button
    assert(button != null)
    return button.text


func _format_test_eva_number(value_to_format: float) -> String:
    if is_equal_approx(value_to_format, roundf(value_to_format)):
        return "%d" % int(roundf(value_to_format))

    return "%.1f" % value_to_format


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
