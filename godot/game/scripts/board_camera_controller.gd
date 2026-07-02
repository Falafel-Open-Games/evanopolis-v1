# ---
# summary: Controls board camera focus and debug zoom presets.
# ---
class_name BoardCameraController
extends Node

const BoardSpacesModule: GDScript = preload("res://game/scripts/board_spaces.gd")

const FocusDuration: float = 0.55
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

    if zoom_tween != null and zoom_tween.is_valid():
        zoom_tween.kill()

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
    assert(tiles != null)
    assert(camera_rig != null)

    var tile_node: Node3D = BoardSpacesModule.get_tile_node(tiles, space_index)
    var tile_center_marker: Node3D = BoardSpacesModule.get_tile_center_marker(tile_node)
    var focus_direction: Vector3 = tile_center_marker.global_position
    focus_direction.y = 0.0
    assert(focus_direction.length_squared() > 0.0)

    var target_yaw: float = atan2(focus_direction.x, focus_direction.z)
    if immediate:
        camera_rig.rotation.y = target_yaw
        return

    if focus_tween != null and focus_tween.is_valid():
        focus_tween.kill()

    var current_yaw: float = camera_rig.rotation.y
    var shortest_yaw_delta: float = wrapf(target_yaw - current_yaw, -PI, PI)
    var animated_target_yaw: float = current_yaw + shortest_yaw_delta

    focus_tween = create_tween()
    focus_tween.set_trans(Tween.TRANS_SINE)
    focus_tween.set_ease(Tween.EASE_OUT)
    focus_tween.tween_property(
        camera_rig,
        "rotation:y",
        animated_target_yaw,
        FocusDuration
    ).from(camera_rig.rotation.y)
