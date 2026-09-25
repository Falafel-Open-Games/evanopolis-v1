import type { MatchEvent } from "../multiplayer-core/types.js";
import { buildEvanopolisBoardV1, type EvanopolisBoardSpace } from "./board-v1.js";

export type EvanopolisDevelopmentKind = "container" | "machine_lot";

export interface EvanopolisTerrainOwnership {
  readonly space_id: string;
  readonly owner_player_id: string;
}

export interface EvanopolisTerrainDevelopment {
  readonly space_id: string;
  readonly level: number;
  readonly has_container: boolean;
  readonly machine_lot_count: number;
}

export interface EvanopolisDevelopmentOrder {
  readonly order_id: string;
  readonly player_id: string;
  readonly space_id: string;
  readonly development_kind: EvanopolisDevelopmentKind;
  readonly price_eva: number;
  readonly price_micro: number;
  readonly target_level: number;
  readonly created_revision: number;
}

export interface EvanopolisDevelopmentDeliveryResult {
  readonly terrain_developments: readonly EvanopolisTerrainDevelopment[];
  readonly development_orders: readonly EvanopolisDevelopmentOrder[];
  readonly refunds: readonly {
    readonly player_id: string;
    readonly amount_eva: number;
    readonly amount_micro: number;
  }[];
  readonly events: readonly MatchEvent[];
}

export function canOrderAnyDevelopment(
  terrain_ownership: readonly EvanopolisTerrainOwnership[],
  terrain_developments: readonly EvanopolisTerrainDevelopment[],
  development_orders: readonly EvanopolisDevelopmentOrder[],
  player_id: string,
  eva_balance_micro: number,
  raw_eva_scale_micro: number
): boolean {
  return terrain_ownership.some((ownership) => {
    if (ownership.owner_player_id !== player_id) {
      return false;
    }
    const space = spaceById(ownership.space_id, raw_eva_scale_micro);
    if (space?.kind !== "terrain") {
      return false;
    }
    const order = nextDevelopmentOrderForSpace(terrain_developments, development_orders, player_id, space);
    return order !== null && eva_balance_micro >= order.price_micro;
  });
}

export function nextDevelopmentOrderForSpace(
  terrain_developments: readonly EvanopolisTerrainDevelopment[],
  development_orders: readonly EvanopolisDevelopmentOrder[],
  player_id: string,
  space: EvanopolisBoardSpace
): {
  readonly development_kind: EvanopolisDevelopmentKind;
  readonly price_eva: number;
  readonly price_micro: number;
  readonly target_level: number;
} | null {
  const target_level = orderedDevelopmentTargetLevel(
    terrain_developments,
    development_orders,
    player_id,
    space.space_id
  ) + 1;
  if (target_level > 5) {
    return null;
  }
  if (target_level === 1) {
    return {
      development_kind: "container",
      price_eva: space.container_price_eva ?? 0,
      price_micro: space.container_price_micro ?? 0,
      target_level
    };
  }
  return {
    development_kind: "machine_lot",
    price_eva: space.machine_lot_price_eva ?? 0,
    price_micro: space.machine_lot_price_micro ?? 0,
    target_level
  };
}

export function developmentLevelForSpace(
  terrain_developments: readonly EvanopolisTerrainDevelopment[],
  space_id: string
): number {
  return terrain_developments.find((development) => development.space_id === space_id)?.level ?? 0;
}

export function deliverDevelopmentOrdersForPlayer(
  terrain_ownership: readonly EvanopolisTerrainOwnership[],
  terrain_developments: readonly EvanopolisTerrainDevelopment[],
  development_orders: readonly EvanopolisDevelopmentOrder[],
  player_id: string,
  raw_eva_scale_micro: number
): EvanopolisDevelopmentDeliveryResult {
  if (player_id === "") {
    return {
      terrain_developments,
      development_orders,
      refunds: [],
      events: []
    };
  }

  let next_terrain_developments = terrain_developments.slice();
  const remaining_orders: EvanopolisDevelopmentOrder[] = [];
  const refunds: { player_id: string; amount_eva: number; amount_micro: number }[] = [];
  const events: MatchEvent[] = [];

  for (const order of development_orders) {
    if (order.player_id !== player_id) {
      remaining_orders.push(order);
      continue;
    }

    if (ownerForSpace(terrain_ownership, order.space_id) !== player_id) {
      refunds.push({
        player_id,
        amount_eva: order.price_eva,
        amount_micro: order.price_micro
      });
      events.push({
        type: "development_order_cancelled",
        player_id,
        order_id: order.order_id,
        space_id: order.space_id,
        reason: "property_not_owned",
        refunded_eva: order.price_eva,
        refunded_micro: order.price_micro
      });
      continue;
    }

    const current_level = developmentLevelForSpace(next_terrain_developments, order.space_id);
    if (current_level + 1 !== order.target_level) {
      refunds.push({
        player_id,
        amount_eva: order.price_eva,
        amount_micro: order.price_micro
      });
      events.push({
        type: "development_order_cancelled",
        player_id,
        order_id: order.order_id,
        space_id: order.space_id,
        reason: "invalid_target_level",
        refunded_eva: order.price_eva,
        refunded_micro: order.price_micro
      });
      continue;
    }

    const next_development = developmentForLevel(order.space_id, order.target_level);
    next_terrain_developments = upsertTerrainDevelopment(next_terrain_developments, next_development);
    events.push({
      type: "development_order_delivered",
      player_id,
      order_id: order.order_id,
      space_id: order.space_id,
      from_level: current_level,
      to_level: next_development.level,
      development_kind: order.development_kind,
      price_eva: order.price_eva,
      price_micro: order.price_micro,
      rent_eva: rentForDevelopmentLevel(order.space_id, next_development.level, raw_eva_scale_micro),
      rent_micro: rentMicroForDevelopmentLevel(order.space_id, next_development.level, raw_eva_scale_micro)
    });
  }

  return {
    terrain_developments: next_terrain_developments,
    development_orders: remaining_orders,
    refunds,
    events
  };
}

export function rentForDevelopmentLevel(
  space_id: string,
  level: number,
  raw_eva_scale_micro: number = 1_000_000
): number {
  const space = spaceById(space_id, raw_eva_scale_micro);
  const rent_eva = space?.development_rent_table?.find((row) => row.level === level)?.rent_eva;
  if (rent_eva === undefined) {
    throw new Error(`Missing rent for terrain ${space_id} level ${level}`);
  }
  return rent_eva;
}

export function rentMicroForDevelopmentLevel(
  space_id: string,
  level: number,
  raw_eva_scale_micro: number = 1_000_000
): number {
  const space = spaceById(space_id, raw_eva_scale_micro);
  const rent_micro = space?.development_rent_table?.find((row) => row.level === level)?.rent_micro;
  if (rent_micro === undefined) {
    throw new Error(`Missing rent for terrain ${space_id} level ${level}`);
  }
  return rent_micro;
}

export function spaceById(
  space_id: string,
  raw_eva_scale_micro: number = 1_000_000
): EvanopolisBoardSpace | undefined {
  return buildEvanopolisBoardV1(raw_eva_scale_micro).find((space) => space.space_id === space_id);
}

function ownerForSpace(
  terrain_ownership: readonly EvanopolisTerrainOwnership[],
  space_id: string
): string | undefined {
  return terrain_ownership.find((ownership) => ownership.space_id === space_id)?.owner_player_id;
}

function orderedDevelopmentTargetLevel(
  terrain_developments: readonly EvanopolisTerrainDevelopment[],
  development_orders: readonly EvanopolisDevelopmentOrder[],
  player_id: string,
  space_id: string
): number {
  const delivered_level = developmentLevelForSpace(terrain_developments, space_id);
  const ordered_count = development_orders.filter((order) =>
    order.player_id === player_id && order.space_id === space_id
  ).length;
  return delivered_level + ordered_count;
}

function developmentForLevel(space_id: string, level: number): EvanopolisTerrainDevelopment {
  return {
    space_id,
    level,
    has_container: level >= 1,
    machine_lot_count: Math.max(0, level - 1)
  };
}

function upsertTerrainDevelopment(
  terrain_developments: readonly EvanopolisTerrainDevelopment[],
  next_development: EvanopolisTerrainDevelopment
): EvanopolisTerrainDevelopment[] {
  const existing = terrain_developments.find((development) => development.space_id === next_development.space_id);
  if (existing === undefined) {
    return [...terrain_developments, next_development];
  }
  return terrain_developments.map((development) =>
    development.space_id === next_development.space_id ? next_development : development
  );
}
