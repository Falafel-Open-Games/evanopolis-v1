# ---
# summary: Animates two visible dice between explicit face values.
# ---
class_name DicePresenter
extends Node

const DieRollDurationSeconds: float = 0.5
const DieRollStaggerSeconds: float = 0.1
const DieHopHeight: float = 0.75
const DieExtraSpins: float = 2.0
const DieSpinAxis: Vector3 = Vector3(1.0, 0.35, 0.75)
const PostRollPauseSeconds: float = 0.7

signal presentation_finished(die_1: int, die_2: int)

var die_a: Node3D
var die_b: Node3D
var die_a_rest_transform: Transform3D = Transform3D.IDENTITY
var die_b_rest_transform: Transform3D = Transform3D.IDENTITY
var basis_for_face_up_callback: Callable
var dice_roll_tween: Tween
var presenting_die_1: int = -1
var presenting_die_2: int = -1


func configure(required_die_a: Node3D, required_die_b: Node3D, required_basis_for_face_up_callback: Callable) -> void:
    assert(required_die_a != null)
    assert(required_die_b != null)
    assert(required_basis_for_face_up_callback.is_valid())

    die_a = required_die_a
    die_b = required_die_b
    die_a_rest_transform = die_a.transform
    die_b_rest_transform = die_b.transform
    basis_for_face_up_callback = required_basis_for_face_up_callback


func set_dice_values(die_1: int, die_2: int) -> void:
    assert(die_a != null)
    assert(die_b != null)

    if dice_roll_tween != null and die_1 == presenting_die_1 and die_2 == presenting_die_2:
        return

    cancel_presentation()
    die_a.basis = basis_for_face_up_callback.call(die_1)
    die_b.basis = basis_for_face_up_callback.call(die_2)
    die_a.transform = Transform3D(die_a.basis, die_a_rest_transform.origin)
    die_b.transform = Transform3D(die_b.basis, die_b_rest_transform.origin)


func present_dice_roll(die_1: int, die_2: int) -> void:
    assert(die_a != null)
    assert(die_b != null)

    cancel_presentation()
    presenting_die_1 = die_1
    presenting_die_2 = die_2

    var from_basis_a: Basis = die_a.basis
    var from_basis_b: Basis = die_b.basis
    var to_basis_a: Basis = basis_for_face_up_callback.call(die_1)
    var to_basis_b: Basis = basis_for_face_up_callback.call(die_2)
    var total_duration_seconds: float = DieRollDurationSeconds + DieRollStaggerSeconds

    dice_roll_tween = create_tween()
    dice_roll_tween.tween_method(
        _set_dice_roll_presentation.bind(from_basis_a, to_basis_a, from_basis_b, to_basis_b),
        0.0,
        1.0,
        total_duration_seconds
    )
    dice_roll_tween.finished.connect(_on_dice_roll_presentation_finished.bind(die_1, die_2))


func is_presenting() -> bool:
    return dice_roll_tween != null


func cancel_presentation() -> void:
    if dice_roll_tween == null:
        return

    if dice_roll_tween.is_running():
        dice_roll_tween.kill()

    dice_roll_tween = null
    presenting_die_1 = -1
    presenting_die_2 = -1


func _set_dice_roll_presentation(
    progress: float,
    from_basis_a: Basis,
    to_basis_a: Basis,
    from_basis_b: Basis,
    to_basis_b: Basis
) -> void:
    var total_duration_seconds: float = DieRollDurationSeconds + DieRollStaggerSeconds
    var elapsed_seconds: float = clampf(progress, 0.0, 1.0) * total_duration_seconds
    var die_a_progress: float = clampf(elapsed_seconds / DieRollDurationSeconds, 0.0, 1.0)
    var die_b_progress: float = clampf(
        (elapsed_seconds - DieRollStaggerSeconds) / DieRollDurationSeconds,
        0.0,
        1.0
    )

    _set_die_roll_pose(die_a, die_a_rest_transform, die_a_progress, from_basis_a, to_basis_a)
    _set_die_roll_pose(die_b, die_b_rest_transform, die_b_progress, from_basis_b, to_basis_b)


func _set_die_roll_pose(
    die_node: Node3D,
    rest_transform: Transform3D,
    progress: float,
    from_basis: Basis,
    to_basis: Basis
) -> void:
    var clamped_progress: float = clampf(progress, 0.0, 1.0)
    var hop_offset: float = sin(clamped_progress * PI) * DieHopHeight
    var spin_basis: Basis = Basis(DieSpinAxis.normalized(), TAU * DieExtraSpins * clamped_progress)
    var oriented_basis: Basis = from_basis.slerp(to_basis, clamped_progress) * spin_basis

    die_node.transform = Transform3D(
        oriented_basis,
        rest_transform.origin + Vector3.UP * hop_offset
    )


func _on_dice_roll_presentation_finished(die_1: int, die_2: int) -> void:
    dice_roll_tween = null
    presenting_die_1 = -1
    presenting_die_2 = -1
    die_a.basis = basis_for_face_up_callback.call(die_1)
    die_b.basis = basis_for_face_up_callback.call(die_2)
    die_a.transform = Transform3D(die_a.basis, die_a_rest_transform.origin)
    die_b.transform = Transform3D(die_b.basis, die_b_rest_transform.origin)

    if PostRollPauseSeconds > 0.0:
        var pause_tween: Tween = create_tween()
        pause_tween.tween_interval(PostRollPauseSeconds)
        pause_tween.finished.connect(func() -> void:
            presentation_finished.emit(die_1, die_2)
        )
        return

    presentation_finished.emit(die_1, die_2)
