# ---
# summary: Owns dice face orientation and delegates roll animation presentation.
# ---
class_name DiceController
extends Node

const DicePresenterScript: GDScript = preload("res://game/scripts/dice_presenter.gd")
const DieFaceNormals: Dictionary[int, Vector3] = {
    1: Vector3.DOWN,
    2: Vector3.RIGHT,
    3: Vector3.BACK,
    4: Vector3.FORWARD,
    5: Vector3.LEFT,
    6: Vector3.UP,
}

var dice_presenter: Variant


func setup(die_a: Node3D, die_b: Node3D) -> void:
    assert(die_a != null)
    assert(die_b != null)

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
    dice_presenter.present_dice_roll(die_1, die_2)


func is_presenting() -> bool:
    return dice_presenter.is_presenting()


func _basis_for_face_up(face_value: int) -> Basis:
    assert(DieFaceNormals.has(face_value))

    var face_normal: Vector3 = DieFaceNormals[face_value]
    if face_normal == Vector3.UP:
        return Basis.IDENTITY
    if face_normal == Vector3.DOWN:
        return Basis(Vector3.FORWARD, PI)

    var rotation_axis: Vector3 = face_normal.cross(Vector3.UP).normalized()
    return Basis(rotation_axis, PI * 0.5)
