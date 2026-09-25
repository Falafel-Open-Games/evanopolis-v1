# ---
# summary: Wires the approved board presentation to the server-authoritative protocol.
# ---
extends Node3D

const BoardCameraControllerScript: GDScript = preload("res://game/scripts/board_camera_controller.gd")
const MainButtonSound: AudioStream = preload("res://assets/sfx/kenney-interface-sounds/bong_001.ogg")
const PanelOpenSound: AudioStream = preload("res://assets/sfx/kenney-interface-sounds/glass_006.ogg")
const PawnStepSound: AudioStream = preload("res://assets/sfx/UI Soundpack/WAV/Minimalist7.wav")
const CardPlaceSound: AudioStream = preload("res://assets/sfx/kenney-casino-audio/card-place-2.ogg")
const PositiveCardSound: AudioStream = preload("res://assets/sfx/UI Soundpack/OGG/African4.ogg")
const NegativeCardSound: AudioStream = preload("res://assets/sfx/UI Soundpack/OGG/Retro11.ogg")
const BackgroundMusic: AudioStreamOggVorbis = preload("res://assets/Sketchbook 2025-11-26.ogg")
const CardResolutionPresenterScript: GDScript = preload("res://game/scripts/card_resolution_presenter.gd")
const ContainerLayerScript: GDScript = preload("res://game/scripts/container_layer.gd")
const DiceControllerScript: GDScript = preload("res://game/scripts/dice_controller.gd")
const GameClientViewModelScript: GDScript = preload("res://game/scripts/game_client_view_model.gd")
const GameServerClientScript: GDScript = preload("res://game/scripts/game_server_client.gd")
const GameServerConfigScript: GDScript = preload("res://game/scripts/game_server_config.gd")
const PlayerPawnLayerScript: GDScript = preload("res://game/scripts/player_pawn_layer.gd")
const PortfolioPresenterScript: GDScript = preload("res://game/scripts/portfolio_presenter.gd")
const PropertyDecisionPresenterScript: GDScript = preload("res://game/scripts/property_decision_presenter.gd")
const PropertyTileFaceLayerScript: GDScript = preload("res://game/scripts/property_tile_face_layer.gd")
const PropertyDecisionPanelScene: PackedScene = preload("res://game/ui/property-decision-panel.tscn")
const CardResolutionPanelScene: PackedScene = preload("res://game/ui/card-resolution-panel.tscn")
const PlayerStatusBarScene: PackedScene = preload("res://game/ui/player-status-bar.tscn")
const PortfolioPanelScene: PackedScene = preload("res://game/ui/portfolio-panel.tscn")
const RegionLabelChairControllerScript: GDScript = preload("res://game/scripts/region_label_chair_controller.gd")
const ServerEventPresentationQueueScript: GDScript = preload("res://game/scripts/server_event_presentation_queue.gd")
const ToastPresenterScript: GDScript = preload("res://game/scripts/toast_presenter.gd")
const ReconnectDelaysSeconds: Array[float] = [1.0, 2.0, 4.0, 8.0]
const TerrainAccentColors: Dictionary[String, Color] = {
    "caracas": Color(0.63, 0.80, 0.96, 1.0),
    "asuncion": Color(0.64, 0.83, 0.55, 1.0),
    "ciudad_del_este": Color(0.78, 0.73, 0.33, 1.0),
    "minsk": Color(0.74, 0.46, 0.22, 1.0),
    "siberia": Color(0.80, 0.30, 0.30, 1.0),
    "texas": Color(0.62, 0.42, 0.78, 1.0),
}

var board_camera_controller: Variant
var main_button_sound_player: AudioStreamPlayer
var panel_toggle_sound_player: AudioStreamPlayer
var pawn_step_sound_player: AudioStreamPlayer
var card_place_sound_player: AudioStreamPlayer
var card_apply_sound_player: AudioStreamPlayer
var background_music_player: AudioStreamPlayer
var pending_card_place_sound_played: bool = false
var client_status: String = "not_started"
var config: Variant
var container_layer: Variant
var dice_controller: Variant
var has_hydrated_snapshot_camera: bool = false
var game_server_client: Variant
var has_sent_join: bool = false
var has_joined_once: bool = false
var is_synchronizing: bool = false
var connection_state: String = "connecting"
var reconnect_attempt: int = 0
var reconnect_generation: int = 0
var reconnect_from_revision: int = 0
var awaiting_reconnect_snapshot: bool = false
var reconnect_blocked: bool = false
var player_pawn_layer: Variant
var portfolio_presenter: Variant
var presentation_queue: Variant
var card_resolution_presenter: Variant
var card_panel_primary_command: String = ""
var card_resolution_panel: Variant
var property_decision_presenter: Variant
var property_panel_primary_command: String = ""
var property_decision_panel: Variant
var property_tile_face_layer: Variant
var pending_delivery_events: Array[Dictionary] = []
var pending_delivery_revision: int = 0
var ready_delivery_toast: Dictionary = {}
var player_status_bar: Variant
var portfolio_panel: Variant
var region_label_chair_controller: Variant
var server_overlay: CanvasLayer
var toast_presenter: Object
var view_model: Variant

@onready var tiles: Node3D = $BoardRoot/Tiles
@onready var pawns: Node3D = $BoardRoot/Pawns
@onready var containers: Node3D = $BoardRoot/Containers
@onready var flags: Node3D = $BoardRoot/Flags
@onready var dice_root: Node3D = $BoardRoot/Dices
@onready var die_a: Node3D = $BoardRoot/Dices/D6A
@onready var die_b: Node3D = $BoardRoot/Dices/D6B
@onready var camera_rig: Node3D = $CameraRig
@onready var camera: Camera3D = $CameraRig/Camera3D

var status_label: Label
var overlay_panel: PanelContainer
var resume_connection_button: Button


func _ready() -> void:
    main_button_sound_player = AudioStreamPlayer.new()
    main_button_sound_player.name = "MainButtonSound"
    main_button_sound_player.stream = MainButtonSound
    main_button_sound_player.volume_db = -9.0
    add_child(main_button_sound_player)
    panel_toggle_sound_player = AudioStreamPlayer.new()
    panel_toggle_sound_player.name = "PanelToggleSound"
    panel_toggle_sound_player.stream = PanelOpenSound
    panel_toggle_sound_player.volume_db = -16.0
    add_child(panel_toggle_sound_player)
    pawn_step_sound_player = AudioStreamPlayer.new()
    pawn_step_sound_player.name = "PawnStepSound"
    pawn_step_sound_player.stream = PawnStepSound
    pawn_step_sound_player.volume_db = -4.0
    add_child(pawn_step_sound_player)
    card_place_sound_player = AudioStreamPlayer.new()
    card_place_sound_player.name = "CardPlaceSound"
    card_place_sound_player.stream = CardPlaceSound
    card_place_sound_player.volume_db = -12.0
    add_child(card_place_sound_player)
    card_apply_sound_player = AudioStreamPlayer.new()
    card_apply_sound_player.name = "CardApplySound"
    card_apply_sound_player.volume_db = -12.0
    add_child(card_apply_sound_player)
    background_music_player = AudioStreamPlayer.new()
    background_music_player.name = "BackgroundMusic"
    var music_stream: AudioStreamOggVorbis = BackgroundMusic.duplicate() as AudioStreamOggVorbis
    music_stream.loop = true
    background_music_player.stream = music_stream
    background_music_player.volume_db = -24.0
    add_child(background_music_player)
    if DisplayServer.get_name() != "headless":
        background_music_player.play()
    config = GameServerConfigScript.new()
    config.load_from_launch_context()
    print("Evanopolis client config: match=%s client=%s player_count=%d buy_in=%d server=%s auto_join=%s debug_overlay=%s" % [
        config.match_id,
        config.client_id,
        config.player_count,
        config.room_buy_in_eva,
        config.server_url,
        str(config.auto_join),
        str(config.debug_overlay)
    ])
    view_model = GameClientViewModelScript.new()
    view_model.configure(config.match_id, config.client_id)
    portfolio_presenter = PortfolioPresenterScript.new()
    portfolio_presenter.configure(view_model, config.language)
    card_resolution_presenter = CardResolutionPresenterScript.new()
    property_decision_presenter = PropertyDecisionPresenterScript.new()

    _create_board_camera_controller()
    _create_dice_controller()
    _create_player_pawn_layer([0, 0, 0])
    _create_property_tile_face_layer()
    _create_presentation_queue()
    _create_container_layer()
    _create_region_label_chair_controller()
    _create_overlay()
    _create_server_client()

    player_pawn_layer.update_pawn_positions(tiles)
    board_camera_controller.focus_on_space(0, true)
    _refresh_overlay()

    if config.auto_join:
        game_server_client.connect_to_server(config.server_url)


func _create_board_camera_controller() -> void:
    board_camera_controller = BoardCameraControllerScript.new()
    board_camera_controller.name = "BoardCameraController"
    add_child(board_camera_controller)
    board_camera_controller.setup(tiles, camera_rig, camera)


func _create_dice_controller() -> void:
    dice_controller = DiceControllerScript.new()
    dice_controller.name = "DiceController"
    add_child(dice_controller)
    dice_controller.setup(dice_root, die_a, die_b, camera)


func _create_player_pawn_layer(initial_tile_indices: Array[int]) -> void:
    player_pawn_layer = PlayerPawnLayerScript.new()
    player_pawn_layer.name = "ServerPlayerPawns"
    pawns.add_child(player_pawn_layer)
    player_pawn_layer.setup_players(initial_tile_indices)
    player_pawn_layer.pawn_step_landed.connect(_on_pawn_step_landed)


func _on_pawn_step_landed(_player_index: int, _step_index: int) -> void:
    if DisplayServer.get_name() != "headless":
        pawn_step_sound_player.play()


func _create_property_tile_face_layer() -> void:
    property_tile_face_layer = PropertyTileFaceLayerScript.new()
    property_tile_face_layer.name = "PropertyTileFaceLayer"
    add_child(property_tile_face_layer)
    property_tile_face_layer.setup(tiles)


func _create_presentation_queue() -> void:
    presentation_queue = ServerEventPresentationQueueScript.new()
    presentation_queue.name = "ServerEventPresentationQueue"
    add_child(presentation_queue)
    presentation_queue.setup(tiles, dice_controller, player_pawn_layer, board_camera_controller)
    presentation_queue.busy_changed.connect(_on_presentation_busy_changed)
    presentation_queue.event_presented.connect(_on_presentation_event_presented)
    presentation_queue.resync_started.connect(_on_presentation_resync_started)


func _create_container_layer() -> void:
    container_layer = ContainerLayerScript.new()
    container_layer.name = "ServerPropertyContainers"
    containers.add_child(container_layer)
    container_layer.setup(tiles)


func _create_region_label_chair_controller() -> void:
    region_label_chair_controller = RegionLabelChairControllerScript.new()
    region_label_chair_controller.name = "RegionLabelChairController"
    add_child(region_label_chair_controller)
    region_label_chair_controller.setup(flags, camera_rig)


func _create_server_client() -> void:
    game_server_client = GameServerClientScript.new()
    game_server_client.name = "GameServerClient"
    add_child(game_server_client)
    game_server_client.connected.connect(_on_server_connected)
    game_server_client.disconnected.connect(_on_server_disconnected)
    game_server_client.status_changed.connect(_on_server_status_changed)
    game_server_client.message_received.connect(_on_server_message_received)
    game_server_client.protocol_error.connect(_on_server_protocol_error)


func _create_overlay() -> void:
    server_overlay = CanvasLayer.new()
    server_overlay.name = "ServerClientOverlay"
    add_child(server_overlay)

    overlay_panel = PanelContainer.new()
    overlay_panel.position = Vector2(12, 12)
    server_overlay.add_child(overlay_panel)

    var margin: MarginContainer = MarginContainer.new()
    margin.add_theme_constant_override("margin_left", 10)
    margin.add_theme_constant_override("margin_top", 10)
    margin.add_theme_constant_override("margin_right", 10)
    margin.add_theme_constant_override("margin_bottom", 10)
    overlay_panel.add_child(margin)

    var layout: VBoxContainer = VBoxContainer.new()
    layout.add_theme_constant_override("separation", 8)
    margin.add_child(layout)

    status_label = Label.new()
    status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    layout.add_child(status_label)

    resume_connection_button = Button.new()
    resume_connection_button.name = "ResumeConnectionButton"
    resume_connection_button.text = "RESUME HERE"
    resume_connection_button.visible = false
    resume_connection_button.pressed.connect(_on_resume_connection_pressed)
    layout.add_child(resume_connection_button)

    _create_player_status_bar()
    _create_portfolio_panel()
    _create_property_decision_panel()
    _create_card_resolution_panel()
    _create_toast_presenter()


func _create_player_status_bar() -> void:
    player_status_bar = PlayerStatusBarScene.instantiate()
    assert(player_status_bar != null)
    player_status_bar.name = "PlayerStatusBar"
    player_status_bar.anchor_left = 1.0
    player_status_bar.anchor_top = 0.0
    player_status_bar.anchor_right = 1.0
    player_status_bar.anchor_bottom = 0.0
    player_status_bar.offset_left = -608.0
    player_status_bar.offset_top = 18.0
    player_status_bar.offset_right = -28.0
    player_status_bar.offset_bottom = 76.0
    player_status_bar.visible = false
    player_status_bar.primary_command_pressed.connect(_on_player_status_bar_command_pressed)
    player_status_bar.portfolio_pressed.connect(_on_portfolio_pressed)
    player_status_bar.players_panel_requested.connect(_hide_portfolio_panel)
    player_status_bar.players_panel_toggled.connect(_on_panel_toggled)
    server_overlay.add_child(player_status_bar)


func _create_portfolio_panel() -> void:
    portfolio_panel = PortfolioPanelScene.instantiate()
    assert(portfolio_panel != null)
    portfolio_panel.name = "PortfolioPanel"
    portfolio_panel.anchor_left = 1.0
    portfolio_panel.anchor_top = 0.0
    portfolio_panel.anchor_right = 1.0
    portfolio_panel.anchor_bottom = 0.0
    portfolio_panel.offset_left = -448.0
    portfolio_panel.offset_top = 76.0
    portfolio_panel.offset_right = -28.0
    portfolio_panel.offset_bottom = 434.0
    portfolio_panel.visible = false
    portfolio_panel.order_development_pressed.connect(_on_portfolio_order_development_pressed)
    server_overlay.add_child(portfolio_panel)


func _create_property_decision_panel() -> void:
    property_decision_panel = PropertyDecisionPanelScene.instantiate()
    assert(property_decision_panel != null)
    property_decision_panel.name = "PropertyDecisionPanel"
    property_decision_panel.anchor_left = 1.0
    property_decision_panel.anchor_top = 1.0
    property_decision_panel.anchor_right = 1.0
    property_decision_panel.anchor_bottom = 1.0
    property_decision_panel.offset_right = -28.0
    property_decision_panel.offset_bottom = -28.0
    property_decision_panel.visible = false
    property_decision_panel.primary_action_pressed.connect(_on_property_primary_action_pressed)
    property_decision_panel.secondary_action_pressed.connect(_on_property_secondary_action_pressed)
    property_decision_panel.details_toggled.connect(_on_panel_toggled)
    server_overlay.add_child(property_decision_panel)


func _create_card_resolution_panel() -> void:
    card_resolution_panel = CardResolutionPanelScene.instantiate()
    assert(card_resolution_panel != null)
    card_resolution_panel.name = "CardResolutionPanel"
    card_resolution_panel.anchor_left = 1.0
    card_resolution_panel.anchor_top = 1.0
    card_resolution_panel.anchor_right = 1.0
    card_resolution_panel.anchor_bottom = 1.0
    card_resolution_panel.offset_left = -632.0
    card_resolution_panel.offset_top = -188.0
    card_resolution_panel.offset_right = -28.0
    card_resolution_panel.offset_bottom = -28.0
    card_resolution_panel.visible = false
    card_resolution_panel.primary_action_pressed.connect(_on_card_resolution_pressed)
    server_overlay.add_child(card_resolution_panel)


func _create_toast_presenter() -> void:
    toast_presenter = ToastPresenterScript.new()
    toast_presenter.call("setup", server_overlay)
    toast_presenter.replay_requested.connect(_on_toast_replay_requested)
    toast_presenter.music_toggled.connect(_on_music_toggled)


func _on_music_toggled(enabled: bool) -> void:
    if DisplayServer.get_name() == "headless":
        return
    if enabled and not background_music_player.playing:
        background_music_player.play()
    background_music_player.stream_paused = not enabled


func _on_server_connected() -> void:
    if has_sent_join:
        return

    has_sent_join = true
    print("Evanopolis client joining match: mode=%s match=%s client=%s player_count=%d buy_in=%d seed=%s" % [
        config.launch_mode,
        config.match_id,
        config.client_id,
        config.player_count,
        config.room_buy_in_eva,
        config.random_seed
    ])
    game_server_client.join_match(
        config.match_id,
        config.client_id,
        config.player_count,
        config.room_buy_in_eva,
        config.random_seed,
        config.launch_mode,
        config.auth_token
    )


func _on_server_disconnected() -> void:
    pending_delivery_events.clear()
    pending_delivery_revision = 0
    ready_delivery_toast = {}
    if config.auto_join and not reconnect_blocked:
        _schedule_reconnect()
    _refresh_overlay()


func _on_server_status_changed(next_status: String) -> void:
    client_status = next_status
    _refresh_overlay()


func _on_server_protocol_error(reason: String) -> void:
    if reason == "socket_not_open" or reason.begins_with("connect_failed:"):
        if config.auto_join and not reconnect_blocked:
            _schedule_reconnect()
        return
    view_model.last_error = reason
    _refresh_overlay()


func _schedule_reconnect() -> void:
    if reconnect_blocked or connection_state == "reconnecting":
        return
    connection_state = "reconnecting"
    has_sent_join = false
    reconnect_from_revision = view_model.revision
    awaiting_reconnect_snapshot = has_joined_once
    reconnect_generation += 1
    var scheduled_generation: int = reconnect_generation
    var delay_index: int = mini(reconnect_attempt, ReconnectDelaysSeconds.size() - 1)
    var delay_seconds: float = ReconnectDelaysSeconds[delay_index]
    reconnect_attempt += 1
    _refresh_overlay()
    await get_tree().create_timer(delay_seconds).timeout
    if reconnect_blocked or scheduled_generation != reconnect_generation:
        return
    connection_state = "connecting"
    game_server_client.connect_to_server(config.server_url)
    _refresh_overlay()


func _on_resume_connection_pressed() -> void:
    reconnect_blocked = false
    reconnect_attempt = 0
    reconnect_generation += 1
    connection_state = "reconnecting"
    has_sent_join = false
    reconnect_from_revision = view_model.revision
    awaiting_reconnect_snapshot = has_joined_once
    game_server_client.connect_to_server(config.server_url)
    _refresh_overlay()


func _stop_reconnecting(next_state: String) -> void:
    reconnect_blocked = true
    reconnect_generation += 1
    connection_state = next_state
    has_sent_join = true
    _refresh_overlay()


func _notify_web_shell(status_type: String) -> void:
    if not OS.has_feature("web"):
        return
    var message: Dictionary = {
        "protocol": "evanopolis-godot-client-status",
        "type": status_type,
    }
    JavaScriptBridge.eval(
        "window.parent.postMessage(%s, '*')" % JSON.stringify(JSON.stringify(message)),
        true
    )


func _on_presentation_busy_changed(_is_busy: bool) -> void:
    if not presentation_queue.is_busy():
        _apply_snapshot_to_presentation(false)
        _show_ready_delivery_toast()
    _refresh_overlay()


func _on_presentation_event_presented(event_dictionary: Dictionary) -> void:
    if _should_show_toast_after_presentation(event_dictionary):
        _show_toast_for_event(event_dictionary)


func _on_presentation_resync_started() -> void:
    is_synchronizing = true
    _refresh_overlay()


func _on_server_message_received(message: Dictionary) -> void:
    _print_server_message(message)
    var message_type: String = str(message.get("type", ""))
    if message_type == "session_replaced":
        view_model.apply_server_message(message)
        view_model.last_error = ""
        _stop_reconnecting("session_replaced")
        return
    if message_type == "command_rejected" and str(message.get("reason", "")) == "invalid_auth_token":
        view_model.apply_server_message(message)
        view_model.last_error = ""
        _stop_reconnecting("session_expired")
        _notify_web_shell("auth_expired")
        game_server_client.close()
        return
    if message_type == "match_snapshot" and awaiting_reconnect_snapshot:
        var incoming_snapshot: Dictionary = message.get("snapshot", {}) as Dictionary
        if int(incoming_snapshot.get("revision", 0)) < reconnect_from_revision:
            _stop_reconnecting("match_unavailable")
            game_server_client.close()
            return
        awaiting_reconnect_snapshot = false
        reconnect_attempt = 0
        connection_state = "connected"
        view_model.last_error = ""
    view_model.apply_server_message(message)
    if message_type == "join_accepted":
        has_joined_once = true
        if not awaiting_reconnect_snapshot:
            reconnect_attempt = 0
            connection_state = "connected"
        view_model.last_error = ""
    if message_type == "match_snapshot":
        _refresh_toast_history()
        _finalize_live_delivery_batch()
    var forced_snapshot_revision: int = _apply_event_to_presentation(message)
    _apply_snapshot_to_presentation(_should_force_snapshot_sync(message, forced_snapshot_revision))
    _refresh_overlay()


func _refresh_toast_history() -> void:
    var recent_events_value: Variant = view_model.snapshot.get("recent_events", [])
    assert(recent_events_value is Array)
    var replayable_events: Array[Dictionary] = []
    var deliveries_by_revision: Dictionary = {}
    var displayed_delivery_revisions: Dictionary = {}
    var possibly_truncated_revision: int = -1
    if not recent_events_value.is_empty():
        var first_entry: Dictionary = recent_events_value[0] as Dictionary
        var first_event: Dictionary = first_entry.get("event", {}) as Dictionary
        if str(first_event.get("type", "")) == "development_order_delivered":
            possibly_truncated_revision = int(first_entry.get("revision", 0))
    for entry_value: Variant in recent_events_value:
        assert(entry_value is Dictionary)
        var entry: Dictionary = entry_value as Dictionary
        var event_value: Variant = entry.get("event", {})
        assert(event_value is Dictionary)
        var event_dictionary: Dictionary = event_value as Dictionary
        if str(event_dictionary.get("type", "")) != "development_order_delivered":
            continue
        var event_revision: int = int(entry.get("revision", 0))
        if not deliveries_by_revision.has(event_revision):
            deliveries_by_revision[event_revision] = []
        var revision_deliveries: Array = deliveries_by_revision[event_revision]
        revision_deliveries.append(event_dictionary)
    for entry_value: Variant in recent_events_value:
        assert(entry_value is Dictionary)
        var entry: Dictionary = entry_value as Dictionary
        var event_value: Variant = entry.get("event", {})
        assert(event_value is Dictionary)
        var event_dictionary: Dictionary = event_value as Dictionary
        if str(event_dictionary.get("type", "")) == "development_order_delivered":
            var event_revision: int = int(entry.get("revision", 0))
            if displayed_delivery_revisions.has(event_revision):
                continue
            displayed_delivery_revisions[event_revision] = true
            var revision_deliveries: Array = deliveries_by_revision[event_revision]
            var grouped_deliveries: Array[Dictionary] = _group_delivery_events(revision_deliveries)
            for grouped_delivery: Dictionary in grouped_deliveries:
                replayable_events.append({
                    "match_id": entry.get("match_id", ""),
                    "revision": event_revision,
                    "event": grouped_delivery,
                })
            if grouped_deliveries.size() > 1 and event_revision != possibly_truncated_revision:
                replayable_events.append({
                    "match_id": entry.get("match_id", ""),
                    "revision": event_revision,
                    "event": _development_delivery_summary_event(revision_deliveries),
                })
        elif _is_replayable_toast_event(event_dictionary):
            replayable_events.append(entry)
    for replay_index: int in range(replayable_events.size()):
        var display_entry: Dictionary = replayable_events[replay_index].duplicate(true)
        var display_event: Dictionary = display_entry.get("event", {}) as Dictionary
        display_entry["display_text"] = _event_history_text(display_event)
        replayable_events[replay_index] = display_entry
    toast_presenter.call("set_history", replayable_events)


func _event_history_text(event_dictionary: Dictionary) -> String:
    var event_type: String = str(event_dictionary.get("type", ""))
    if event_type == "start_bonus_collected":
        var start_player: String = _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
        var start_action: String = "landed on" if bool(event_dictionary.get("exact_landing", false)) else "passed"
        return "%s %s %s and collected +%s EVA" % [
            start_player,
            start_action,
            _space_label("start").to_upper(),
            EvaMoney.format_micro(EvaMoney.required_micro(event_dictionary, "amount_micro")),
        ]
    if event_type == "card_resolved":
        var card_player: String = _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
        var deck_label_text: String = _deck_label(str(event_dictionary.get("deck_id", "")))
        var amount_micro: int = EvaMoney.required_micro(event_dictionary, "amount_micro")
        if amount_micro > 0:
            return "%s gained +%s EVA from %s" % [card_player, EvaMoney.format_micro(amount_micro), deck_label_text]
        return "%s paid %s EVA from %s" % [card_player, EvaMoney.format_micro(absi(amount_micro)), deck_label_text]
    if event_type == "property_purchased" or event_type == "special_property_purchased":
        return "%s bought %s for %s EVA" % [
            _player_label(str(event_dictionary.get("player_id", ""))).to_upper(),
            _space_label(str(event_dictionary.get("space_id", ""))).to_upper(),
            EvaMoney.format_micro(EvaMoney.required_micro(event_dictionary, "price_micro")),
        ]
    if event_type == "development_order_delivered":
        var development_kind: String = str(event_dictionary.get("development_kind", ""))
        assert(development_kind == "container" or development_kind == "machine_lot")
        var quantity: int = int(event_dictionary.get("quantity", 1))
        assert(quantity > 0)
        assert(development_kind == "machine_lot" or quantity == 1)
        var development_label: String = "container" if development_kind == "container" else "machine lot"
        if quantity > 1:
            development_label = "%d machine lots" % quantity
        return "%s's %s arrived at %s" % [
            _player_label(str(event_dictionary.get("player_id", ""))).to_upper(),
            development_label,
            _space_label(str(event_dictionary.get("space_id", ""))).to_upper(),
        ]
    if event_type == "development_delivery_summary":
        var delivery_count: int = int(event_dictionary.get("delivery_count", 0))
        var terrain_count: int = int(event_dictionary.get("terrain_count", 0))
        assert(delivery_count > 1)
        assert(terrain_count > 0)
        var terrain_word: String = "terrain" if terrain_count == 1 else "terrains"
        return "%s: %d developments arrived on %d %s" % [
            _player_label(str(event_dictionary.get("player_id", ""))).to_upper(),
            delivery_count,
            terrain_count,
            terrain_word,
        ]
    if event_type == "rent_paid":
        return "%s paid %s EVA rent to %s for %s" % [
            _player_label(str(event_dictionary.get("payer_player_id", ""))).to_upper(),
            EvaMoney.format_micro(EvaMoney.required_micro(event_dictionary, "rent_micro")),
            _player_label(str(event_dictionary.get("owner_player_id", ""))).to_upper(),
            _space_label(str(event_dictionary.get("space_id", ""))).to_upper(),
        ]
    if event_type == "player_jailed":
        return "%s landed in JAIL and will skip a turn" % _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
    if event_type == "jail_sentence_served":
        return "%s served their jail sentence" % _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
    assert(event_type == "player_eliminated")
    var eliminated_player: String = _player_label(str(event_dictionary.get("player_id", ""))).to_upper()
    var creditor_player: String = _player_label(str(event_dictionary.get("creditor_player_id", ""))).to_upper()
    if creditor_player != "":
        return "%s is out of the game. Assets transfer to %s" % [eliminated_player, creditor_player]
    return "%s is out of the game" % eliminated_player


func _group_delivery_events(delivery_events: Array) -> Array[Dictionary]:
    var grouped_events: Array[Dictionary] = []
    var machine_lot_indices: Dictionary = {}
    for event_value: Variant in delivery_events:
        assert(event_value is Dictionary)
        var event_dictionary: Dictionary = event_value as Dictionary
        if str(event_dictionary.get("development_kind", "")) != "machine_lot":
            grouped_events.append(event_dictionary)
            continue
        var group_key: String = "%s:%s" % [
            str(event_dictionary.get("player_id", "")),
            str(event_dictionary.get("space_id", "")),
        ]
        if machine_lot_indices.has(group_key):
            var group_index: int = int(machine_lot_indices[group_key])
            grouped_events[group_index]["quantity"] = int(grouped_events[group_index].get("quantity", 1)) + 1
        else:
            machine_lot_indices[group_key] = grouped_events.size()
            grouped_events.append(event_dictionary.duplicate(true))
    return grouped_events


func _development_delivery_summary_event(delivery_events: Array) -> Dictionary:
    assert(delivery_events.size() > 1)
    var first_delivery: Dictionary = delivery_events[0] as Dictionary
    var player_id: String = str(first_delivery.get("player_id", ""))
    var terrain_ids: Dictionary[String, bool] = {}
    for event_value: Variant in delivery_events:
        assert(event_value is Dictionary)
        var event_dictionary: Dictionary = event_value as Dictionary
        assert(str(event_dictionary.get("player_id", "")) == player_id)
        terrain_ids[str(event_dictionary.get("space_id", ""))] = true
    return {
        "type": "development_delivery_summary",
        "player_id": player_id,
        "delivery_count": delivery_events.size(),
        "terrain_count": terrain_ids.size(),
    }


func _record_live_delivery_event(event_dictionary: Dictionary) -> void:
    var event_revision: int = int(event_dictionary.get("revision", 0))
    if pending_delivery_events.is_empty():
        pending_delivery_revision = event_revision
    assert(pending_delivery_revision == event_revision)
    pending_delivery_events.append(event_dictionary.duplicate(true))


func _finalize_live_delivery_batch() -> void:
    if pending_delivery_events.is_empty():
        return
    var snapshot_revision: int = int(view_model.snapshot.get("revision", 0))
    if snapshot_revision != pending_delivery_revision:
        return
    var grouped_deliveries: Array[Dictionary] = _group_delivery_events(pending_delivery_events)
    if grouped_deliveries.size() == 1:
        ready_delivery_toast = grouped_deliveries[0]
    else:
        ready_delivery_toast = _development_delivery_summary_event(pending_delivery_events)
    pending_delivery_events.clear()
    pending_delivery_revision = 0
    _show_ready_delivery_toast()


func _show_ready_delivery_toast() -> void:
    if ready_delivery_toast.is_empty() or presentation_queue.is_busy():
        return
    _show_toast_for_event(ready_delivery_toast)
    ready_delivery_toast = {}


func _is_replayable_toast_event(event_dictionary: Dictionary) -> bool:
    var event_type: String = str(event_dictionary.get("type", ""))
    if event_type == "card_resolved":
        return str(event_dictionary.get("effect_type", "")) == "eva_delta" and EvaMoney.required_micro(event_dictionary, "amount_micro") != 0
    return event_type in [
        "start_bonus_collected",
        "property_purchased",
        "special_property_purchased",
        "development_order_delivered",
        "rent_paid",
        "player_jailed",
        "jail_sentence_served",
        "player_eliminated",
    ]


func _on_toast_replay_requested(entry: Dictionary) -> void:
    var event_value: Variant = entry.get("event", {})
    assert(event_value is Dictionary)
    _show_toast_for_event(event_value as Dictionary, true)


func _on_roll_pressed() -> void:
    _hide_interaction_panels()
    _send_player_command("request_roll")


func _on_player_status_bar_command_pressed(command_type: String) -> void:
    assert(command_type == "request_roll" or command_type == "request_end_turn")
    _hide_interaction_panels()
    _send_player_command(command_type)


func _on_portfolio_pressed() -> void:
    assert(portfolio_panel != null)
    player_status_bar.close_players_popup()
    portfolio_panel.visible = not portfolio_panel.visible
    _on_panel_toggled(portfolio_panel.visible)
    if portfolio_panel.visible:
        _refresh_portfolio_panel()


func _on_panel_toggled(opened: bool) -> void:
    if opened and DisplayServer.get_name() != "headless":
        panel_toggle_sound_player.play()


func _on_portfolio_order_development_pressed(space_id: String) -> void:
    assert(space_id != "")
    _send_player_command_with_payload("request_order_development", {
        "space_id": space_id,
    })


func _on_end_turn_pressed() -> void:
    _hide_interaction_panels()
    _send_player_command("request_end_turn")


func _on_property_primary_action_pressed() -> void:
    var command_type: String = property_panel_primary_command
    _hide_property_decision_panel()
    assert(command_type != "")
    _send_player_command(command_type)


func _on_card_resolution_pressed() -> void:
    var command_type: String = card_panel_primary_command
    _hide_card_resolution_panel()
    assert(command_type != "")
    _send_player_command(command_type)


func _on_property_secondary_action_pressed() -> void:
    _hide_property_decision_panel()
    if view_model.has_action("request_end_turn"):
        _send_player_command("request_end_turn")


func _hide_interaction_panels() -> void:
    _hide_property_decision_panel()
    _hide_card_resolution_panel()


func _hide_property_decision_panel() -> void:
    if property_decision_panel != null:
        property_decision_panel.visible = false
    property_panel_primary_command = ""


func _hide_card_resolution_panel() -> void:
    if card_resolution_panel != null:
        card_resolution_panel.visible = false
    card_panel_primary_command = ""


func _send_player_command(command_type: String) -> void:
    _send_player_command_with_payload(command_type, {})


func _send_player_command_with_payload(command_type: String, payload: Dictionary) -> void:
    if connection_state != "connected":
        _refresh_overlay()
        return

    if presentation_queue.is_busy():
        view_model.last_error = "presentation_busy:%s" % command_type
        print("Evanopolis client skipped command while presenting: %s" % command_type)
        _refresh_overlay()
        return

    if not view_model.has_action(command_type):
        view_model.last_error = "action_not_available:%s" % command_type
        print("Evanopolis client skipped command: %s actions=%s" % [
            command_type,
            view_model.get_available_actions_text()
        ])
        _refresh_overlay()
        return

    view_model.last_sent_command = command_type
    view_model.last_sent_command_payload = payload.duplicate(true)
    var command: Dictionary = view_model.build_player_command(command_type, payload)
    print("Evanopolis client sending command: %s revision=%d player=%s" % [
        command_type,
        view_model.revision,
        view_model.local_player_id
    ])
    if DisplayServer.get_name() != "headless":
        if command_type == "request_resolve_card":
            var pending_card: Dictionary = view_model.get_pending_card_resolution()
            assert(not pending_card.is_empty())
            var effect: Dictionary = pending_card.get("effect", {})
            var amount_micro: int = EvaMoney.required_micro(effect, "amount_micro")
            card_apply_sound_player.stream = PositiveCardSound if amount_micro > 0 else NegativeCardSound
            card_apply_sound_player.play()
        elif command_type != "request_roll":
            main_button_sound_player.play()
    game_server_client.send_command(command)
    _refresh_overlay()


func _apply_snapshot_to_presentation(force_immediate: bool) -> void:
    if not view_model.has_snapshot():
        return

    var snapshot_revision: int = int(view_model.snapshot.get("revision", 0))
    if not force_immediate and presentation_queue.is_busy():
        return
    if not force_immediate and snapshot_revision < presentation_queue.get_target_revision():
        return

    if force_immediate:
        presentation_queue.cancel_and_resync_to_revision(snapshot_revision)

    var positions: Array[int] = view_model.get_player_positions()
    if positions.is_empty():
        return

    if player_pawn_layer.player_pawns.size() != positions.size():
        player_pawn_layer.setup_players(positions)
    else:
        player_pawn_layer.player_tile_indices = positions.duplicate()

    var visible_player_count: int = clampi(view_model.get_joined_player_count(), 1, positions.size())
    player_pawn_layer.set_visible_player_count(visible_player_count)
    player_pawn_layer.update_pawn_positions(tiles)
    _refresh_property_tile_faces_from_snapshot()
    _refresh_containers_from_snapshot()
    _hydrate_camera_from_snapshot(force_immediate)

    if force_immediate:
        presentation_queue.reset_player_race_distances_from_snapshot(view_model.snapshot.get("players", []))
    else:
        presentation_queue.initialize_player_race_distances_from_snapshot(view_model.snapshot.get("players", []))
        presentation_queue.set_visual_revision(snapshot_revision)

    var dice: Dictionary = view_model.get_dice()
    if not dice.is_empty() and not dice_controller.is_presenting():
        dice_controller.set_dice_values(int(dice["die_1"]), int(dice["die_2"]))

    is_synchronizing = false


func _focus_active_player_from_snapshot() -> void:
    var active_player_index: int = _player_index_from_id(view_model.active_player_id)
    if active_player_index < 0 or active_player_index >= player_pawn_layer.player_tile_indices.size():
        return

    var active_space_index: int = player_pawn_layer.player_tile_indices[active_player_index]
    board_camera_controller.focus_on_space(active_space_index, true)


func _refresh_property_tile_faces_from_snapshot() -> void:
    var spaces: Array = view_model.definition.get("spaces", [])
    var refreshed_region_ids: Dictionary[String, bool] = {}
    for space_value: Variant in spaces:
        assert(space_value is Dictionary)
        var space: Dictionary = space_value as Dictionary
        var space_index: int = int(space.get("index", -1))
        var space_kind: String = str(space.get("kind", ""))
        if space_kind == "terrain":
            var group_id: String = str(space.get("group_id", ""))
            if not refreshed_region_ids.has(group_id):
                region_label_chair_controller.set_region_price_micro(
                    group_id,
                    EvaMoney.required_micro(space, "purchase_price_micro")
                )
                refreshed_region_ids[group_id] = true
            var owner_player_id: String = view_model.get_owner_player_id_for_space(str(space.get("space_id", "")))
            if owner_player_id == "":
                property_tile_face_layer.set_property_available(space_index, EvaMoney.required_micro(space, "purchase_price_micro"))
            else:
                property_tile_face_layer.set_property_owned(
                    space_index,
                    _effective_rent_for_space(space, owner_player_id),
                    _player_color_for_id(owner_player_id)
                )
        elif space_kind == "special_property":
            var special_property_id: String = str(space.get("special_property_id", ""))
            assert(not special_property_id.is_empty())
            var special_owner_player_id: String = view_model.get_owner_player_id_for_special_property(str(space.get("space_id", "")))
            if special_owner_player_id == "":
                property_tile_face_layer.set_special_property_available(special_property_id, EvaMoney.required_micro(space, "purchase_price_micro"))
            else:
                property_tile_face_layer.set_special_property_owned(
                    special_property_id,
                    _player_color_for_id(special_owner_player_id)
                )


func _refresh_containers_from_snapshot() -> void:
    container_layer.clear_all_containers()

    var developments: Array = view_model.snapshot.get("terrain_developments", [])
    for development_value: Variant in developments:
        assert(development_value is Dictionary)
        var development: Dictionary = development_value as Dictionary
        var level: int = int(development.get("level", 0))
        if level <= 0:
            continue

        var space_id: String = str(development.get("space_id", ""))
        var owner_player_id: String = view_model.get_owner_player_id_for_space(space_id)
        if owner_player_id == "":
            continue

        var space: Dictionary = view_model.get_space_definition_by_id(space_id)
        if space.is_empty():
            continue

        var space_index: int = int(space.get("index", -1))
        if space_index < 0:
            continue

        var machine_lot_count: int = int(development.get("machine_lot_count", max(0, level - 1)))
        container_layer.set_container(
            space_index,
            bool(development.get("has_container", true)),
            machine_lot_count,
            _player_color_for_id(owner_player_id)
        )


func _hydrate_camera_from_snapshot(force_immediate: bool) -> void:
    if force_immediate:
        has_hydrated_snapshot_camera = false

    if has_hydrated_snapshot_camera:
        return

    has_hydrated_snapshot_camera = true
    if _should_snap_to_post_landing_snapshot_camera():
        var active_player_index: int = _player_index_from_id(view_model.active_player_id)
        assert(active_player_index >= 0 and active_player_index < player_pawn_layer.player_tile_indices.size())
        var active_space_index: int = player_pawn_layer.player_tile_indices[active_player_index]
        board_camera_controller.snap_to_post_landing_focus(active_space_index)
        return

    _focus_active_player_from_snapshot()


func _should_snap_to_post_landing_snapshot_camera() -> bool:
    if not view_model.get_has_rolled_current_turn():
        return false

    var active_player_index: int = _player_index_from_id(view_model.active_player_id)
    assert(active_player_index >= 0 and active_player_index < player_pawn_layer.player_tile_indices.size())
    return player_pawn_layer.player_tile_indices[active_player_index] > 0


func _apply_event_to_presentation(message: Dictionary) -> int:
    if str(message.get("type", "")) != "match_event":
        return 0

    var event: Variant = message.get("event", {})
    if not event is Dictionary:
        return 0

    var event_dictionary: Dictionary = event as Dictionary
    event_dictionary["revision"] = int(message.get("revision", event_dictionary.get("revision", 0)))
    if str(event_dictionary.get("type", "")) == "development_order_delivered":
        _record_live_delivery_event(event_dictionary)
    elif not _should_show_toast_after_presentation(event_dictionary):
        _show_toast_for_event(event_dictionary)
    if presentation_queue.enqueue_event(event_dictionary):
        return 0

    presentation_queue.cancel_and_resync_to_revision(presentation_queue.get_visual_revision())
    return 0


func _should_show_toast_after_presentation(event_dictionary: Dictionary) -> bool:
    var event_type: String = str(event_dictionary.get("type", ""))
    return event_type in ["start_bonus_collected", "player_jailed"]


func _show_toast_for_event(event_dictionary: Dictionary, replay: bool = false) -> void:
    var event_type: String = str(event_dictionary.get("type", ""))
    if event_type == "start_bonus_collected":
        _show_start_bonus_toast(event_dictionary)
    elif event_type == "card_resolved":
        _show_card_resolved_toast(event_dictionary, replay)
    elif event_type == "property_purchased" or event_type == "special_property_purchased":
        _show_property_purchased_toast(event_dictionary, replay)
    elif event_type == "development_order_delivered":
        _show_development_order_delivered_toast(event_dictionary)
    elif event_type == "development_delivery_summary":
        _show_development_delivery_summary_toast(event_dictionary)
    elif event_type == "rent_paid":
        _show_rent_paid_toast(event_dictionary, replay)
    elif event_type == "player_jailed":
        _show_player_jailed_toast(event_dictionary, replay)
    elif event_type == "jail_sentence_served":
        _show_jail_sentence_served_toast(event_dictionary, replay)
    elif event_type == "player_eliminated":
        _show_player_eliminated_toast(event_dictionary)


func _show_start_bonus_toast(event_dictionary: Dictionary) -> void:
    toast_presenter.call("show", _event_history_text(event_dictionary))


func _show_card_resolved_toast(event_dictionary: Dictionary, replay: bool = false) -> void:
    if not replay and str(event_dictionary.get("player_id", "")) == view_model.local_player_id:
        return
    if str(event_dictionary.get("effect_type", "")) != "eva_delta":
        return

    var amount_micro: int = EvaMoney.required_micro(event_dictionary, "amount_micro")
    if amount_micro == 0:
        return
    toast_presenter.call("show", _event_history_text(event_dictionary))


func _show_property_purchased_toast(event_dictionary: Dictionary, replay: bool = false) -> void:
    if not replay and str(event_dictionary.get("player_id", "")) == view_model.local_player_id:
        return

    toast_presenter.call("show", _event_history_text(event_dictionary))


func _show_development_order_delivered_toast(event_dictionary: Dictionary) -> void:
    toast_presenter.call("show", _event_history_text(event_dictionary))


func _show_development_delivery_summary_toast(event_dictionary: Dictionary) -> void:
    toast_presenter.call("show", _event_history_text(event_dictionary))


func _show_rent_paid_toast(event_dictionary: Dictionary, replay: bool = false) -> void:
    if not replay and str(event_dictionary.get("payer_player_id", "")) == view_model.local_player_id:
        return

    toast_presenter.call("show", _event_history_text(event_dictionary))


func _show_player_jailed_toast(event_dictionary: Dictionary, replay: bool = false) -> void:
    if not replay and str(event_dictionary.get("player_id", "")) == view_model.local_player_id:
        return

    toast_presenter.call("show", _event_history_text(event_dictionary))


func _show_jail_sentence_served_toast(event_dictionary: Dictionary, replay: bool = false) -> void:
    if not replay and str(event_dictionary.get("player_id", "")) == view_model.local_player_id:
        return

    toast_presenter.call("show", _event_history_text(event_dictionary))


func _show_player_eliminated_toast(event_dictionary: Dictionary) -> void:
    toast_presenter.call("show", _event_history_text(event_dictionary))


func _should_force_snapshot_sync(message: Dictionary, forced_snapshot_revision: int) -> bool:
    if forced_snapshot_revision > 0:
        return true

    if str(message.get("type", "")) != "match_snapshot":
        return false

    var next_snapshot: Variant = message.get("snapshot", {})
    if not next_snapshot is Dictionary:
        return false

    var snapshot_dictionary: Dictionary = next_snapshot as Dictionary
    var snapshot_revision: int = int(snapshot_dictionary.get("revision", 0))
    return (
        is_synchronizing
        or presentation_queue.has_pending_revision_before(snapshot_revision)
    )


func _player_index_from_id(player_id: String) -> int:
    if not player_id.begins_with("player_"):
        return -1

    var player_number: int = int(player_id.trim_prefix("player_"))
    if player_number <= 0:
        return -1

    return player_number - 1


func _print_server_message(message: Dictionary) -> void:
    var message_type: String = str(message.get("type", ""))
    if message_type == "match_snapshot":
        var next_snapshot: Variant = message.get("snapshot", {})
        if next_snapshot is Dictionary:
            var snapshot_dictionary: Dictionary = next_snapshot as Dictionary
            print("Evanopolis client received snapshot: revision=%d phase=%s active=%s actions=%s" % [
                int(snapshot_dictionary.get("revision", 0)),
                str(snapshot_dictionary.get("phase", "")),
                str(snapshot_dictionary.get("active_player_id", "")),
                ", ".join(snapshot_dictionary.get("available_actions", []))
            ])
        return

    if message_type == "match_event":
        var event: Variant = message.get("event", {})
        if event is Dictionary:
            var event_dictionary: Dictionary = event as Dictionary
            if str(event_dictionary.get("type", "")) == "dice_rolled":
                print("Evanopolis client received event: dice_rolled@%d die_1=%d die_2=%d total=%d from=%d to=%d player=%s" % [
                    int(message.get("revision", 0)),
                    int(event_dictionary.get("die_1", 0)),
                    int(event_dictionary.get("die_2", 0)),
                    int(event_dictionary.get("total", 0)),
                    int(event_dictionary.get("from_position", -1)),
                    int(event_dictionary.get("to_position", -1)),
                    str(event_dictionary.get("player_id", ""))
                ])
                return

            print("Evanopolis client received event: %s@%d" % [
                str(event_dictionary.get("type", "")),
                int(message.get("revision", 0))
            ])
        return

    if message_type == "command_rejected":
        print("Evanopolis client command rejected: %s" % str(message.get("reason", "")))
        return

    print("Evanopolis client received message: %s" % message_type)


func _refresh_overlay() -> void:
    if status_label == null:
        return

    var has_error: bool = view_model.last_error != ""
    var has_connection_notice: bool = (
        connection_state == "reconnecting"
        or connection_state == "session_replaced"
        or connection_state == "session_expired"
        or connection_state == "match_unavailable"
        or (connection_state == "connecting" and has_joined_once)
    )
    overlay_panel.custom_minimum_size = (
        Vector2(360, 132)
        if config.debug_overlay or has_error or has_connection_notice
        else Vector2.ZERO
    )
    status_label.visible = config.debug_overlay or is_synchronizing or has_error or has_connection_notice
    if config.debug_overlay:
        _refresh_debug_overlay_text()
    elif has_connection_notice:
        status_label.text = _connection_notice_text()
    elif has_error:
        status_label.text = "Server rejected request: %s" % view_model.last_error
    else:
        status_label.text = "Synchronizing..." if is_synchronizing else ""

    resume_connection_button.visible = connection_state == "session_replaced"
    var presentation_busy: bool = (
        presentation_queue.is_busy() or is_synchronizing or connection_state != "connected"
    )
    overlay_panel.visible = config.debug_overlay or is_synchronizing or has_error or has_connection_notice
    _refresh_card_resolution_panel(presentation_busy)
    _refresh_property_decision_panel(presentation_busy)
    _refresh_player_status_bar(presentation_busy)
    _refresh_portfolio_panel()


func _connection_notice_text() -> String:
    if connection_state == "session_replaced":
        return "This game was opened in another tab or device."
    if connection_state == "session_expired":
        return "Your session expired. Reconnect your wallet to continue."
    if connection_state == "match_unavailable":
        return "The server restarted and this match could not be recovered."
    if not has_joined_once:
        return "Unable to connect. Retrying..."
    return "Connection lost. Reconnecting..."


func _refresh_player_status_bar(presentation_busy: bool) -> void:
    if player_status_bar == null:
        return

    if view_model.local_player_id == "":
        player_status_bar.visible = false
        _hide_portfolio_panel()
        return

    if property_decision_panel.visible:
        player_status_bar.visible = false
        return

    var player_index: int = view_model.get_local_player_index()
    assert(player_index >= 0 and player_index < PlayerPawnLayerScript.PlayerColors.size())
    player_status_bar.visible = true
    player_status_bar.modulate = Color(1.0, 1.0, 1.0, 1.0)
    player_status_bar.set_player_summary(
        _player_label(view_model.local_player_id).to_upper(),
        PlayerPawnLayerScript.PlayerColors[player_index],
        view_model.get_local_player_eva_balance_micro(),
        view_model.get_local_player_owned_property_count()
    )
    player_status_bar.set_player_roster(_build_player_roster())
    if view_model.get_local_player_status() == "game_over":
        player_status_bar.set_game_over_state(true)
        _hide_portfolio_panel()
        return

    if view_model.is_local_winner():
        player_status_bar.set_winner_state(true)
        _hide_portfolio_panel()
        return

    if view_model.has_action("request_roll"):
        player_status_bar.set_primary_command("request_roll", "ROLL", true, presentation_busy)
        return

    if (
        view_model.has_action("request_end_turn")
        and not property_decision_panel.visible
        and not card_resolution_panel.visible
    ):
        var end_turn_label: String = _get_status_end_turn_label()
        player_status_bar.set_primary_command("request_end_turn", end_turn_label, true, presentation_busy)
        return

    player_status_bar.set_primary_command("request_roll", "ROLL", false, presentation_busy)


func _build_player_roster() -> Array[Dictionary]:
    var roster: Array[Dictionary] = []
    var players: Array = view_model.snapshot.get("players", [])
    for player_value: Variant in players:
        assert(player_value is Dictionary)
        var player: Dictionary = player_value as Dictionary
        if not bool(player.get("joined", false)):
            continue

        var player_id: String = str(player.get("player_id", ""))
        var player_index: int = view_model.get_player_index(player_id)
        assert(player_index >= 0 and player_index < PlayerPawnLayerScript.PlayerColors.size())
        var status_label: String = ""
        if str(player.get("status", "")) == "game_over":
            status_label = "GAME OVER"
        elif player_id == view_model.active_player_id:
            status_label = "ACTIVE"
        elif not bool(player.get("connected", true)):
            status_label = "OFFLINE"

        roster.append({
            "label": _player_label(player_id),
            "color": PlayerPawnLayerScript.PlayerColors[player_index],
            "balance_micro": EvaMoney.required_micro(player, "eva_balance_micro"),
            "status_label": status_label,
        })

    return roster


func _get_status_end_turn_label() -> String:
    if view_model.get_local_player_is_serving_jail_sentence():
        return "SERVE SENTENCE"
    if view_model.get_local_player_is_accepting_jail_time():
        return "ACCEPT JAIL TIME"

    return "END TURN"


func _refresh_portfolio_panel() -> void:
    if portfolio_panel == null or not portfolio_panel.visible:
        return
    if not view_model.has_definition() or not view_model.has_snapshot():
        _hide_portfolio_panel()
        return

    portfolio_panel.set_portfolio_data(portfolio_presenter.build_panel_data())


func _hide_portfolio_panel() -> void:
    if portfolio_panel != null:
        portfolio_panel.visible = false


func _rent_for_development_level(space: Dictionary, level: int) -> int:
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        if int(row.get("level", 0)) == level:
            return EvaMoney.required_micro(row, "rent_micro")

    return _base_rent_for_space(space)


func _effective_rent_for_space(space: Dictionary, owner_player_id: String) -> int:
    var space_id: String = str(space.get("space_id", ""))
    var delivered_level: int = int(view_model.get_terrain_development(space_id).get("level", 0))
    var base_rent_micro: int = _rent_for_development_level(space, delivered_level)
    var multiplier_tenths: int = 10 + _special_property_rent_bonus_tenths(owner_player_id)
    if _has_full_level_five_city_monopoly(str(space.get("group_id", "")), owner_player_id):
        multiplier_tenths *= 2
    return EvaMoney.multiply_ratio(base_rent_micro, multiplier_tenths, 10)


func _special_property_rent_bonus_tenths(owner_player_id: String) -> int:
    var bonus: int = 0
    var owns_substation_1: bool = _player_owns_special_property(owner_player_id, "substation_1")
    var owns_substation_2: bool = _player_owns_special_property(owner_player_id, "substation_2")
    if owns_substation_1 and owns_substation_2:
        bonus += 3
    elif owns_substation_1 or owns_substation_2:
        bonus += 1
    if _player_owns_special_property(owner_player_id, "private_workshop"):
        bonus += 1
    if _player_owns_special_property(owner_player_id, "cooling_plant"):
        bonus += 1

    return bonus


func _player_owns_special_property(owner_player_id: String, special_property_id: String) -> bool:
    if owner_player_id == "":
        return false

    var special_property_ownership: Array = view_model.snapshot.get("special_property_ownership", [])
    for ownership_value: Variant in special_property_ownership:
        assert(ownership_value is Dictionary)
        var ownership: Dictionary = ownership_value as Dictionary
        if str(ownership.get("owner_player_id", "")) != owner_player_id:
            continue

        var space: Dictionary = view_model.get_space_definition_by_id(str(ownership.get("space_id", "")))
        if str(space.get("special_property_id", "")) == special_property_id:
            return true

    return false


func _has_full_level_five_city_monopoly(group_id: String, owner_player_id: String) -> bool:
    if group_id == "" or owner_player_id == "":
        return false

    var city_terrain_count: int = 0
    var spaces: Array = view_model.definition.get("spaces", [])
    for space_value: Variant in spaces:
        assert(space_value is Dictionary)
        var space: Dictionary = space_value as Dictionary
        if str(space.get("kind", "")) != "terrain" or str(space.get("group_id", "")) != group_id:
            continue

        city_terrain_count += 1
        var space_id: String = str(space.get("space_id", ""))
        if view_model.get_owner_player_id_for_space(space_id) != owner_player_id:
            return false
        if int(view_model.get_terrain_development(space_id).get("level", 0)) != 5:
            return false

    return city_terrain_count == 4


func _refresh_card_resolution_panel(presentation_busy: bool) -> void:
    if card_resolution_panel == null:
        return

    var pending_card: Dictionary = view_model.get_pending_card_resolution()
    if pending_card.is_empty():
        pending_card_place_sound_played = false
    var panel_state: Dictionary = card_resolution_presenter.build_panel_state(
        view_model,
        presentation_busy,
        config.language
    )
    if not bool(panel_state.get("visible", false)):
        _hide_card_resolution_panel()
        return

    card_panel_primary_command = str(panel_state.get("command", ""))
    var card_data: Dictionary = panel_state.get("data", {})
    card_resolution_panel.set_card_data(card_data)
    card_resolution_panel.offset_left = -632.0 if bool(card_data.get("show_action", true)) else -448.0
    card_resolution_panel.visible = true
    if not pending_card.is_empty() and not pending_card_place_sound_played:
        pending_card_place_sound_played = true
        if DisplayServer.get_name() != "headless":
            card_place_sound_player.play()


func _refresh_property_decision_panel(presentation_busy: bool) -> void:
    if property_decision_panel == null:
        return

    var panel_state: Dictionary = property_decision_presenter.build_panel_state(
        view_model,
        presentation_busy,
        config.language
    )
    if not bool(panel_state.get("visible", false)):
        _hide_property_decision_panel()
        return

    property_panel_primary_command = str(panel_state.get("command", ""))
    property_decision_panel.set_property_data(panel_state.get("data", {}))
    property_decision_panel.visible = true


func _base_rent_for_space(space: Dictionary) -> int:
    var table: Array = space.get("development_rent_table", [])
    for row_value: Variant in table:
        assert(row_value is Dictionary)
        var row: Dictionary = row_value as Dictionary
        if int(row.get("level", 0)) == 0:
            return EvaMoney.required_micro(row, "rent_micro")

    return 0


func _deck_label(deck_id: String) -> String:
    if deck_id == "luck":
        return "SUERTE"
    if deck_id == "destiny":
        return "DESTINO"

    return deck_id.to_upper()


func _space_label(space_id: String) -> String:
    var space: Dictionary = view_model.get_space_definition_by_id(space_id)
    if space.is_empty():
        return space_id

    return _localized_label(space)


func _localized_label(space: Dictionary) -> String:
    var labels_value: Variant = space.get("labels", {})
    if labels_value is Dictionary:
        var labels: Dictionary = labels_value as Dictionary
        var localized_value: Variant = labels.get(config.language, labels.get("en", space.get("label", "")))
        return str(localized_value)

    return str(space.get("label", ""))


func _accent_color_for_space(space: Dictionary) -> Color:
    var group_id: String = str(space.get("group_id", ""))
    assert(TerrainAccentColors.has(group_id))
    return TerrainAccentColors[group_id]


func _player_label(player_id: String) -> String:
    var player_index: int = _player_index_from_id(player_id)
    if player_index < 0:
        return player_id

    return "Player %d" % (player_index + 1)


func _player_color_for_id(player_id: String) -> Color:
    var player_index: int = _player_index_from_id(player_id)
    if player_index < 0 or player_index >= PlayerPawnLayerScript.PlayerColors.size():
        return Color(0.12, 0.112, 0.095, 1.0)

    return PlayerPawnLayerScript.PlayerColors[player_index]


func _refresh_debug_overlay_text() -> void:
    var definition_state: String = "loaded" if view_model.has_definition() else "pending"
    status_label.text = (
        (
            "Server: %s\nMatch: %s  Client: %s\nRole: %s  Player: %s  Active: %s\n"
            + "Revision: %d  Phase: %s\nActions: %s\nDefinition: %s  Last: %s  Event: %s\n"
            + "Sent: %s  Error: %s%s"
        )
        % [
            client_status,
            config.match_id,
            config.client_id,
            view_model.role,
            view_model.local_player_id,
            view_model.active_player_id,
            view_model.revision,
            view_model.phase,
            view_model.get_available_actions_text(),
            definition_state,
            view_model.last_message_type,
            view_model.get_latest_event_text(),
            view_model.last_sent_command,
            view_model.last_error,
            "\nSynchronizing..." if is_synchronizing else ""
        ]
    )
