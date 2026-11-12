extends SceneTree

const ServerClientScene: PackedScene = preload("res://game/server-client-main.tscn")


func _init() -> void:
    call_deferred("_run")


func _run() -> void:
    var server_client: Node = ServerClientScene.instantiate()
    assert(server_client != null)
    root.add_child(server_client)
    await process_frame

    var camera_controller: Variant = server_client.get("board_camera_controller")
    var camera: Camera3D = server_client.get_node("CameraRig/Camera3D") as Camera3D
    assert(camera_controller != null)
    assert(camera != null)
    assert(is_equal_approx(camera.fov, 25.8))

    camera_controller.zoom_in_during_pawn_move(0.6)
    await create_timer(1.0).timeout
    if not is_equal_approx(camera.fov, 8.0):
        push_error("automatic pawn-follow zoom should finish near; got fov=%f" % camera.fov)
        quit(1)
        return

    camera_controller.apply_zoom(false, true)
    var player_pawn_layer: Variant = server_client.get("player_pawn_layer")
    var presentation_queue: Variant = server_client.get("presentation_queue")
    var tiles: Node3D = server_client.get_node("BoardRoot/Tiles") as Node3D
    assert(player_pawn_layer != null)
    assert(presentation_queue != null)
    assert(tiles != null)
    var initial_positions: Array[int] = [2, 11, 17]
    player_pawn_layer.setup_players(initial_positions)
    player_pawn_layer.set_visible_player_count(3)
    player_pawn_layer.update_pawn_positions(tiles)
    presentation_queue.cancel_and_resync_to_revision(12)
    presentation_queue.initialize_player_race_distances_from_snapshot([
        {"player_id": "player_1", "position": 2},
        {"player_id": "player_2", "position": 11},
        {"player_id": "player_3", "position": 17},
    ])
    assert(presentation_queue.enqueue_event({
        "type": "dice_rolled",
        "revision": 13,
        "player_id": "player_1",
        "die_1": 1,
        "die_2": 4,
        "total": 5,
        "from_position": 2,
        "to_position": 7,
    }))
    await create_timer(1.8).timeout
    camera_controller.cancel_zoom_animation()
    await create_timer(2.2).timeout
    if not is_equal_approx(camera.fov, 8.0):
        push_error("dice event presentation should finish near; got fov=%f" % camera.fov)
        quit(1)
        return

    print("Board camera event zoom tests passed")
    quit()
