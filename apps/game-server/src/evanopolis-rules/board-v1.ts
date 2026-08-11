export const EvanopolisBoardSize = 36;

export type EvanopolisBoardSpaceKind = "start" | "terrain" | "special_property" | "luck" | "destiny" | "jail";

export interface LocalizedLabels {
  readonly en: string;
  readonly es: string;
  readonly pt_br: string;
}

export interface EvanopolisBoardSpace {
  readonly index: number;
  readonly space_id: string;
  readonly kind: EvanopolisBoardSpaceKind;
  readonly label: string;
  readonly labels: LocalizedLabels;
  readonly group_id?: string;
  readonly group_label?: string;
  readonly group_labels?: LocalizedLabels;
  readonly terrain_index?: number;
  readonly special_property_id?: string;
  readonly purchase_price_eva?: number;
}

interface CityDefinition {
  readonly group_id: string;
  readonly labels: LocalizedLabels;
  readonly purchase_price_eva: number;
}

interface SpecialPropertyDefinition {
  readonly special_property_id: string;
  readonly label: string;
  readonly labels: LocalizedLabels;
  readonly purchase_price_eva: number;
}

const VertexSpaces: Readonly<Record<number, Omit<EvanopolisBoardSpace, "index">>> = {
  0: {
    space_id: "start",
    kind: "start",
    label: "Start",
    labels: {
      en: "Start",
      es: "Salida",
      pt_br: "Saída"
    }
  },
  6: {
    space_id: "luck_1",
    kind: "luck",
    label: "Luck",
    labels: {
      en: "Luck",
      es: "Suerte",
      pt_br: "Sorte"
    }
  },
  12: {
    space_id: "destiny_1",
    kind: "destiny",
    label: "Destiny",
    labels: {
      en: "Destiny",
      es: "Destino",
      pt_br: "Destino"
    }
  },
  18: {
    space_id: "jail",
    kind: "jail",
    label: "Jail",
    labels: {
      en: "Jail",
      es: "Cárcel",
      pt_br: "Cadeia"
    }
  },
  24: {
    space_id: "luck_2",
    kind: "luck",
    label: "Luck",
    labels: {
      en: "Luck",
      es: "Suerte",
      pt_br: "Sorte"
    }
  },
  30: {
    space_id: "destiny_2",
    kind: "destiny",
    label: "Destiny",
    labels: {
      en: "Destiny",
      es: "Destino",
      pt_br: "Destino"
    }
  }
};

const SideCities: readonly CityDefinition[] = [
  {
    group_id: "caracas",
    labels: {
      en: "Caracas",
      es: "Caracas",
      pt_br: "Caracas"
    },
    purchase_price_eva: 1
  },
  {
    group_id: "asuncion",
    labels: {
      en: "Asuncion",
      es: "Asunción",
      pt_br: "Assunção"
    },
    purchase_price_eva: 2
  },
  {
    group_id: "ciudad_del_este",
    labels: {
      en: "Ciudad del Este",
      es: "Ciudad del Este",
      pt_br: "Ciudad del Este"
    },
    purchase_price_eva: 2
  },
  {
    group_id: "minsk",
    labels: {
      en: "Minsk",
      es: "Minsk",
      pt_br: "Minsk"
    },
    purchase_price_eva: 3
  },
  {
    group_id: "siberia",
    labels: {
      en: "Siberia",
      es: "Siberia",
      pt_br: "Sibéria"
    },
    purchase_price_eva: 3
  },
  {
    group_id: "texas",
    labels: {
      en: "Texas",
      es: "Texas",
      pt_br: "Texas"
    },
    purchase_price_eva: 4
  }
];

const SideSpecialProperties: readonly SpecialPropertyDefinition[] = [
  {
    special_property_id: "importer_1",
    label: "Importadora 1",
    labels: {
      en: "Importer 1",
      es: "Importadora 1",
      pt_br: "Importadora 1"
    },
    purchase_price_eva: 5
  },
  {
    special_property_id: "substation_1",
    label: "Subestación 1",
    labels: {
      en: "Substation 1",
      es: "Subestación 1",
      pt_br: "Subestação 1"
    },
    purchase_price_eva: 6
  },
  {
    special_property_id: "private_workshop",
    label: "Taller Propio",
    labels: {
      en: "Private Workshop",
      es: "Taller Propio",
      pt_br: "Oficina Própria"
    },
    purchase_price_eva: 8
  },
  {
    special_property_id: "importer_2",
    label: "Importadora 2",
    labels: {
      en: "Importer 2",
      es: "Importadora 2",
      pt_br: "Importadora 2"
    },
    purchase_price_eva: 5
  },
  {
    special_property_id: "substation_2",
    label: "Subestación 2",
    labels: {
      en: "Substation 2",
      es: "Subestación 2",
      pt_br: "Subestação 2"
    },
    purchase_price_eva: 6
  },
  {
    special_property_id: "cooling_plant",
    label: "Cooling Plant",
    labels: {
      en: "Cooling Plant",
      es: "Planta de Refrigeración",
      pt_br: "Usina de Refrigeração"
    },
    purchase_price_eva: 10
  }
];

export function buildEvanopolisBoardV1(): EvanopolisBoardSpace[] {
  const spaces: EvanopolisBoardSpace[] = [];
  for (let index = 0; index < EvanopolisBoardSize; index += 1) {
    const vertex_space = VertexSpaces[index];
    if (vertex_space !== undefined) {
      spaces.push({
        index,
        ...vertex_space
      });
      continue;
    }

    spaces.push(buildSideSpace(index));
  }
  return spaces;
}

function buildSideSpace(index: number): EvanopolisBoardSpace {
  const side_index = Math.floor(index / 6);
  const side_offset = index % 6;
  const city = SideCities[side_index];
  if (city === undefined) {
    throw new Error(`Missing city definition for board side ${side_index}`);
  }

  if (side_offset === 3) {
    const special_property = SideSpecialProperties[side_index];
    if (special_property === undefined) {
      throw new Error(`Missing special property definition for board side ${side_index}`);
    }
    return {
      index,
      space_id: `special_${special_property.special_property_id}`,
      kind: "special_property",
      label: special_property.label,
      labels: special_property.labels,
      special_property_id: special_property.special_property_id,
      purchase_price_eva: special_property.purchase_price_eva
    };
  }

  const terrain_index = terrainIndexForSideOffset(side_offset);
  return {
    index,
    space_id: `terrain_${city.group_id}_${terrain_index}`,
    kind: "terrain",
    label: city.labels.en,
    labels: city.labels,
    group_id: city.group_id,
    group_label: city.labels.en,
    group_labels: city.labels,
    terrain_index,
    purchase_price_eva: city.purchase_price_eva
  };
}

function terrainIndexForSideOffset(side_offset: number): number {
  if (side_offset === 1 || side_offset === 2) {
    return side_offset;
  }
  if (side_offset === 4 || side_offset === 5) {
    return side_offset - 1;
  }
  throw new Error(`Board side offset ${side_offset} is not a terrain space`);
}
