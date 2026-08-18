# ---
# summary: Controls board camera focus and debug zoom presets.
# ---
class_name BoardCameraController
extends Node

const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")

const FocusDuration: float = 0.55
const FollowMinDuration: float = 0.35
const FollowStartDelaySeconds: float = 0.08
const FollowArrivalLeadSeconds: float = 0.00
const FollowZoomProgress: float = 0.50
const TurnFocusZoomOutLeadSeconds: float = 0.35
const TurnFocusMinDuration: float = 0.50
const TurnFocusDurationPerSpace: float = 0.06
const BoardForwardCameraDirectionSign: int = 1
const CameraYawSnapDegrees: float = 30.0
const ZoomDuration: float = 0.35
const FarCameraFov: float = 25.8
const FarCameraRigRotationX: float = 42.8
const FarCameraPositionY: float = 5.0
const FarCameraRotationX: float = -90.0
const NearCameraFov: float = 8.0
const NearCameraRigRotationX: float = 40.0
const NearCameraPositionY: float = 5.0
const NearCameraRotationX: float = -100.0

var focus_tween: Tween
var zoom_tween: Tween
var is_near_zoom: bool = false
var tiles: Node3D
var camera_rig: Node3D
var camera: Camera3D


func setup(required_tiles: Node3D, required_camera_rig: Node3D, required_camera: Camera3D) -> void:
    tiles = required_tiles
    camera_rig = required_camera_rig
    camera = required_camera
    apply_zoom(false, true)


func toggle_zoom() -> void:
    is_near_zoom = not is_near_zoom
    apply_zoom(is_near_zoom, false)


func apply_zoom(use_near_zoom: bool, immediate: bool) -> void:
    assert(camera_rig != null)
    assert(camera != null)

    var target_fov: float = FarCameraFov
    var target_rig_rotation_x: float = FarCameraRigRotationX
    var target_camera_position_y: float = FarCameraPositionY
    var target_camera_rotation_x: float = FarCameraRotationX
    if use_near_zoom:
        target_fov = NearCameraFov
        target_rig_rotation_x = NearCameraRigRotationX
        target_camera_position_y = NearCameraPositionY
        target_camera_rotation_x = NearCameraRotationX

    if immediate:
        camera.fov = target_fov
        camera_rig.rotation_degrees.x = target_rig_rotation_x
        camera.position.y = target_camera_position_y
        camera.rotation_degrees.x = target_camera_rotation_x
        return

    cancel_zoom_animation()

    zoom_tween = create_tween()
    zoom_tween.set_parallel(true)
    zoom_tween.set_trans(Tween.TRANS_SINE)
    zoom_tween.set_ease(Tween.EASE_OUT)
    zoom_tween.tween_property(camera, "fov", target_fov, ZoomDuration)
    zoom_tween.tween_property(
        camera_rig,
        "rotation_degrees:x",
        target_rig_rotation_x,
        ZoomDuration
    )
    zoom_tween.tween_property(
        camera,
        "position:y",
        target_camera_position_y,
        ZoomDuration
    )
    zoom_tween.tween_property(
        camera,
        "rotation_degrees:x",
        target_camera_rotation_x,
        ZoomDuration
    )


func focus_on_space(space_index: int, immediate: bool) -> void:
    focus_on_space_with_duration(space_index, immediate, FocusDuration)


func snap_to_post_landing_focus(space_index: int) -> void:
    cancel_focus_animation()
    cancel_zoom_animation()
    focus_on_space(space_index, true)
    is_near_zoom = true
    apply_zoom(true, true)


func cancel_focus_animation() -> void:
    if focus_tween != null and focus_tween.is_valid():
        focus_tween.kill()
    focus_tween = null


func cancel_zoom_animation() -> void:
    if zoom_tween != null and zoom_tween.is_valid():
        zoom_tween.kill()
    zoom_tween = null


func follow_pawn_move_to_space(space_index: int, pawn_move_duration: float) -> void:
    var duration: float = maxf(
        FollowMinDuration,
        pawn_move_duration - FollowStartDelaySeconds - FollowArrivalLeadSeconds
    )
    focus_on_space_with_duration_and_delay(space_index, false, duration, FollowStartDelaySeconds)


func zoom_in_during_pawn_move(pawn_move_duration: float) -> void:
    var zoom_delay: float = maxf(0.0, pawn_move_duration * FollowZoomProgress)
    apply_zoom_after_delay(true, zoom_delay)


func zoom_out_before_turn_focus() -> float:
    apply_zoom(false, false)
    return TurnFocusZoomOutLeadSeconds


func focus_on_turn_player(space_index: int, board_direction: int, space_distance: int) -> void:
    var duration: float = maxf(
        TurnFocusMinDuration,
        float(maxi(space_distance, 1)) * TurnFocusDurationPerSpace
    )
    var camera_direction: int = board_direction * BoardForwardCameraDirectionSign
    focus_on_space_with_duration_direction_and_delay(space_index, false, duration, camera_direction, 0.0)


func focus_on_space_with_duration(space_index: int, immediate: bool, duration: float) -> void:
    focus_on_space_with_duration_and_delay(space_index, immediate, duration, 0.0)


func apply_zoom_after_delay(use_near_zoom: bool, delay: float) -> void:
    assert(delay >= 0.0)

    cancel_zoom_animation()
    if delay <= 0.0:
        apply_zoom(use_near_zoom, false)
        return

    zoom_tween = create_tween()
    zoom_tween.tween_interval(delay)
    zoom_tween.finished.connect(func() -> void:
        zoom_tween = null
        apply_zoom(use_near_zoom, false)
    )


func focus_on_space_with_duration_and_delay(
    space_index: int,
    immediate: bool,
    duration: float,
    delay: float
) -> void:
    focus_on_space_with_duration_direction_and_delay(space_index, immediate, duration, 0, delay)


func focus_on_space_with_duration_direction_and_delay(
    space_index: int,
    immediate: bool,
    duration: float,
    camera_direction: int,
    delay: float
) -> void:
    assert(tiles != null)
    assert(camera_rig != null)
    assert(duration > 0.0)
    assert(delay >= 0.0)

    var tile_node: Node3D = BoardSpacesModule.get_tile_node(tiles, space_index)
    var tile_center_marker: Node3D = BoardSpacesModule.get_tile_center_marker(tile_node)
    var focus_direction: Vector3 = tile_center_marker.global_position
    focus_direction.y = 0.0
    assert(focus_direction.length_squared() > 0.0)

    var target_yaw: float = atan2(focus_direction.x, focus_direction.z)
    target_yaw = _snap_yaw(target_yaw)
    if immediate:
        camera_rig.rotation.y = target_yaw
        return

    cancel_focus_animation()

    var current_yaw: float = camera_rig.rotation.y
    var shortest_yaw_delta: float = _yaw_delta_for_direction(current_yaw, target_yaw, camera_direction)
    var animated_target_yaw: float = current_yaw + shortest_yaw_delta

    focus_tween = create_tween()
    focus_tween.set_trans(Tween.TRANS_SINE)
    focus_tween.set_ease(Tween.EASE_IN_OUT)
    if delay > 0.0:
        focus_tween.tween_interval(delay)
    focus_tween.tween_property(
        camera_rig,
        "rotation:y",
        animated_target_yaw,
        duration
    ).from(camera_rig.rotation.y)


func _yaw_delta_for_direction(current_yaw: float, target_yaw: float, camera_direction: int) -> float:
    var shortest_yaw_delta: float = wrapf(target_yaw - current_yaw, -PI, PI)
    if is_zero_approx(shortest_yaw_delta):
        return 0.0

    if camera_direction > 0:
        return wrapf(target_yaw - current_yaw, 0.0, TAU)
    if camera_direction < 0:
        return wrapf(target_yaw - current_yaw, -TAU, 0.0)

    return shortest_yaw_delta


func _snap_yaw(yaw: float) -> float:
    if CameraYawSnapDegrees <= 0.0:
        return yaw

    var snap_step: float = deg_to_rad(CameraYawSnapDegrees)
    assert(snap_step > 0.0)
    return roundf(yaw / snap_step) * snap_step
