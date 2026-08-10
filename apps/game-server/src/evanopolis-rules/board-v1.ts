export const EvanopolisBoardSize = 36;

export interface EvanopolisBoardSpace {
  readonly index: number;
  readonly kind: "start" | "terrain" | "special_property" | "luck" | "destiny" | "jail";
  readonly label: string;
}

const VertexSpaces: Readonly<Record<number, EvanopolisBoardSpace["kind"]>> = {
  0: "start",
  6: "luck",
  12: "destiny",
  18: "jail",
  24: "luck",
  30: "destiny"
};

export function buildEvanopolisBoardV1(): EvanopolisBoardSpace[] {
  const spaces: EvanopolisBoardSpace[] = [];
  for (let index = 0; index < EvanopolisBoardSize; index += 1) {
    const vertex_kind = VertexSpaces[index];
    if (vertex_kind !== undefined) {
      spaces.push({
        index,
        kind: vertex_kind,
        label: labelForKind(vertex_kind)
      });
      continue;
    }

    const side_offset = index % 6;
    const kind: EvanopolisBoardSpace["kind"] = side_offset === 3 ? "special_property" : "terrain";
    spaces.push({
      index,
      kind,
      label: kind === "terrain" ? `Terrain ${index}` : `Special ${index}`
    });
  }
  return spaces;
}

function labelForKind(kind: EvanopolisBoardSpace["kind"]): string {
  if (kind === "start") {
    return "Salida";
  }
  if (kind === "luck") {
    return "Suerte";
  }
  if (kind === "destiny") {
    return "Destino";
  }
  if (kind === "jail") {
    return "Carcel";
  }
  return kind;
}
