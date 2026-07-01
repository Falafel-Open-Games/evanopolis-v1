# ---
# summary: Defines shared land identifiers and display data used by board visuals and gameplay.
# ---
class_name LandData
extends RefCounted

enum LandName {
    CARACAS,
    ASSUNCION,
    CIUDAD_DEL_ESTE,
    MINSK,
    SIBERIA,
    TEXAS,
}

const Names: Dictionary[LandName, StringName] = {
    LandName.CARACAS: &"Caracas",
    LandName.ASSUNCION: &"Asunción",
    LandName.CIUDAD_DEL_ESTE: &"Ciudad del Este",
    LandName.MINSK: &"Minsk",
    LandName.SIBERIA: &"Siberia",
    LandName.TEXAS: &"Texas",
}

const Colors: Dictionary[LandName, Color] = {
    LandName.CARACAS: Color("4A90E2"),
    LandName.ASSUNCION: Color("6BBF59"),
    LandName.CIUDAD_DEL_ESTE: Color("F2C94C"),
    LandName.MINSK: Color("F2994A"),
    LandName.SIBERIA: Color("E85D5A"),
    LandName.TEXAS: Color("C77DFF"),
}

const Prices: Dictionary[LandName, int] = {
    LandName.CARACAS: 1,
    LandName.ASSUNCION: 2,
    LandName.CIUDAD_DEL_ESTE: 2,
    LandName.MINSK: 3,
    LandName.SIBERIA: 3,
    LandName.TEXAS: 4,
}
