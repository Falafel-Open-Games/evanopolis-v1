# ---
# summary: Provides reusable local offsets for arranging one to four pawns on the same board space.
# ---
class_name PawnClusterLayout
extends RefCounted

const TwoPawnTileOffset: float = 0.035
const ThreePawnTileOffset: float = 0.032
const FourPawnTileOffset: float = 0.032


static func get_offsets(pawn_count: int) -> Array[Vector2]:
    assert(pawn_count >= 1 and pawn_count <= 4)

    if pawn_count == 1:
        return [Vector2.ZERO]
    if pawn_count == 2:
        return [
            Vector2(-TwoPawnTileOffset, 0.0),
            Vector2(TwoPawnTileOffset, 0.0),
        ]
    if pawn_count == 3:
        return [
            Vector2(-ThreePawnTileOffset, -ThreePawnTileOffset),
            Vector2(ThreePawnTileOffset, -ThreePawnTileOffset),
            Vector2(0.0, ThreePawnTileOffset),
        ]

    return [
        Vector2(-FourPawnTileOffset, -FourPawnTileOffset),
        Vector2(FourPawnTileOffset, -FourPawnTileOffset),
        Vector2(-FourPawnTileOffset, FourPawnTileOffset),
        Vector2(FourPawnTileOffset, FourPawnTileOffset),
    ]
