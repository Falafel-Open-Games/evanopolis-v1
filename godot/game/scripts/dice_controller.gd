# ---
# summary: Owns dice face orientation and delegates roll animation presentation.
# ---
class_name DiceController
extends Node

const DicePresenterScript: GDScript = preload("res://game/scripts/dice_presenter.gd")
const DiceSetTurnDurationSeconds: float = 0.35
const DieFaceNormals: Dictionary[int, Vector3] = {
    1: Vector3.DOWN,
    2: Vector3.RIGHT,
    3: Vector3.BACK,
    4: Vector3.FORWARD,
    5: Vector3.LEFT,
    6: Vector3.UP,
}

var dice_root: Node3D
var camera: Camera3D
var dice_presenter: Variant
var dice_set_turn_tween: Tween


func setup(required_dice_root: Node3D, die_a: Node3D, die_b: Node3D, required_camera: Camera3D) -> void:
    assert(required_dice_root != null)
    assert(die_a != null)
    assert(die_b != null)
    assert(required_camera != null)

    dice_root = required_dice_root
    camera = required_camera
    dice_presenter = DicePresenterScript.new()
    dice_presenter.name = "DicePresenter"
    add_child(dice_presenter)
    dice_presenter.configure(die_a, die_b, Callable(self, "_basis_for_face_up"))
    dice_presenter.set_dice_values(6, 6)


func set_dice_values(die_1: int, die_2: int) -> void:
    assert(DieFaceNormals.has(die_1))
    assert(DieFaceNormals.has(die_2))
    dice_presenter.set_dice_values(die_1, die_2)


func present_dice_roll(die_1: int, die_2: int) -> void:
    assert(DieFaceNormals.has(die_1))
    assert(DieFaceNormals.has(die_2))
    _turn_dice_set_toward_camera()
    dice_presenter.present_dice_roll(die_1, die_2)


func is_presenting() -> bool:
    return dice_presenter.is_presenting()


func _turn_dice_set_toward_camera() -> void:
    assert(dice_root != null)
    assert(camera != null)

    var dice_parent: Node3D = dice_root.get_parent() as Node3D
    assert(dice_parent != null)

    var camera_position: Vector3 = dice_parent.to_local(camera.global_position)
    var camera_direction: Vector3 = camera_position - dice_root.position
    camera_direction.y = 0.0
    assert(camera_direction.length_squared() > 0.0)

    var target_yaw: float = atan2(camera_direction.x, camera_direction.z)
    var current_yaw: float = dice_root.rotation.y
    var shortest_yaw_delta: float = wrapf(target_yaw - current_yaw, -PI, PI)
    var animated_target_yaw: float = current_yaw + shortest_yaw_delta

    if dice_set_turn_tween != null and dice_set_turn_tween.is_valid():
        dice_set_turn_tween.kill()

    dice_set_turn_tween = create_tween()
    dice_set_turn_tween.set_trans(Tween.TRANS_SINE)
    dice_set_turn_tween.set_ease(Tween.EASE_OUT)
    dice_set_turn_tween.tween_property(
        dice_root,
        "rotation:y",
        animated_target_yaw,
        DiceSetTurnDurationSeconds
    ).from(dice_root.rotation.y)


func _basis_for_face_up(face_value: int) -> Basis:
    assert(DieFaceNormals.has(face_value))

    var face_normal: Vector3 = DieFaceNormals[face_value]
    if face_normal == Vector3.UP:
        return Basis.IDENTITY
    if face_normal == Vector3.DOWN:
        return Basis(Vector3.FORWARD, PI)

    var rotation_axis: Vector3 = face_normal.cross(Vector3.UP).normalized()
    return Basis(rotation_axis, PI * 0.5)
