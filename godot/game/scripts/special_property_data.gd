# ---
# summary: Defines shared identifiers and display data for non-land purchasable board spaces.
# ---
class_name SpecialPropertyData
extends RefCounted

enum SpecialProperty {
    IMPORTADORA_1,
    IMPORTADORA_2,
    SUBESTACION_1,
    SUBESTACION_2,
    TALLER_PROPIO,
    COOLING_PLANT,
}

const IconNodeNames: Dictionary[SpecialProperty, StringName] = {
    SpecialProperty.IMPORTADORA_1: &"IMPORTADORA_1",
    SpecialProperty.IMPORTADORA_2: &"IMPORTADORA_2",
    SpecialProperty.SUBESTACION_1: &"SUBESTACION_1",
    SpecialProperty.SUBESTACION_2: &"SUBESTACION_2",
    SpecialProperty.TALLER_PROPIO: &"TALLER_PROPIO",
    SpecialProperty.COOLING_PLANT: &"COOLING_PLANT",
}

const Names: Dictionary[SpecialProperty, StringName] = {
    SpecialProperty.IMPORTADORA_1: &"Importadora 1",
    SpecialProperty.IMPORTADORA_2: &"Importadora 2",
    SpecialProperty.SUBESTACION_1: &"Subestacion 1",
    SpecialProperty.SUBESTACION_2: &"Subestacion 2",
    SpecialProperty.TALLER_PROPIO: &"Taller Propio",
    SpecialProperty.COOLING_PLANT: &"Cooling Plant",
}

const Prices: Dictionary[SpecialProperty, int] = {
    SpecialProperty.IMPORTADORA_1: 5,
    SpecialProperty.IMPORTADORA_2: 5,
    SpecialProperty.SUBESTACION_1: 6,
    SpecialProperty.SUBESTACION_2: 6,
    SpecialProperty.TALLER_PROPIO: 8,
    SpecialProperty.COOLING_PLANT: 10,
}
