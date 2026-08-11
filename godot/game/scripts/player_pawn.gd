# ---
# summary: Controls the reusable 3D pawn scene and applies per-player material colors.
# ---
@tool
extends Node3D

signal movement_finished(movement_serial: int)

@export var player_color: Color = Color("E84855"):
    set(value):
        player_color = value
        _apply_player_color()

@onready var body: MeshInstance3D = $Body
@onready var head: MeshInstance3D = $Head

const StepArcHeight: float = 0.20
const StepDurationSeconds: float = 0.30
const StepPauseSeconds: float = 0.10

var movement_tween: Tween
var movement_target_position: Vector3 = Vector3.ZERO
var has_movement_target: bool = false
var next_movement_serial: int = 1
var active_movement_serial: int = 0


func _ready() -> void:
    _apply_player_color()


func _apply_player_color() -> void:
    if not is_node_ready():
        return

    _set_mesh_color(body, player_color)
    _set_mesh_color(head, player_color.lightened(0.18))


func _set_mesh_color(mesh_instance: MeshInstance3D, color: Color) -> void:
    var override_material: Material = mesh_instance.get_surface_override_material(0)
    assert(override_material is StandardMaterial3D)

    var typed_material: StandardMaterial3D = override_material as StandardMaterial3D
    if not typed_material.resource_local_to_scene:
        typed_material = typed_material.duplicate() as StandardMaterial3D
        typed_material.resource_local_to_scene = true
        mesh_instance.set_surface_override_material(0, typed_material)

    typed_material.albedo_color = color


func stop_movement_animation() -> void:
    if movement_tween != null and movement_tween.is_running():
        movement_tween.kill()
    movement_tween = null
    has_movement_target = false


func is_animating() -> bool:
    return movement_tween != null and movement_tween.is_running()


func is_animating_to_position(target_position: Vector3) -> bool:
    return is_animating() and has_movement_target and movement_target_position.is_equal_approx(target_position)


func animate_global_positions(step_positions: Array[Vector3]) -> int:
    if step_positions.is_empty():
        return -1

    stop_movement_animation()
    active_movement_serial = next_movement_serial
    next_movement_serial += 1

    movement_target_position = step_positions[step_positions.size() - 1]
    has_movement_target = true
    movement_tween = create_tween()
    movement_tween.set_parallel(false)
    for step_index: int in range(step_positions.size()):
        var from_position: Vector3 = global_position if step_index == 0 else step_positions[step_index - 1]
        var to_position: Vector3 = step_positions[step_index]
        movement_tween.tween_method(
            _set_arc_position.bind(from_position, to_position),
            0.0,
            1.0,
            StepDurationSeconds
        ).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
        if StepPauseSeconds > 0.0 and step_index < step_positions.size() - 1:
            movement_tween.tween_interval(StepPauseSeconds)
    movement_tween.finished.connect(_on_movement_finished.bind(active_movement_serial))
    return active_movement_serial


func estimate_global_positions_duration(step_count: int) -> float:
    if step_count <= 0:
        return 0.0

    return (
        float(step_count) * StepDurationSeconds
        + float(maxi(step_count - 1, 0)) * StepPauseSeconds
    )


func _set_arc_position(progress: float, from_position: Vector3, to_position: Vector3) -> void:
    var clamped_progress: float = clampf(progress, 0.0, 1.0)
    var next_position: Vector3 = from_position.lerp(to_position, clamped_progress)
    next_position.y += sin(clamped_progress * PI) * StepArcHeight
    global_position = next_position


func _on_movement_finished(movement_serial: int) -> void:
    movement_tween = null
    has_movement_target = false
    _emit_movement_finished(movement_serial)


func _emit_movement_finished(movement_serial: int) -> void:
    movement_finished.emit(movement_serial)
