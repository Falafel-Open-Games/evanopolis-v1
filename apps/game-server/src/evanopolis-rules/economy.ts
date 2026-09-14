/*
 * Evanopolis V1 economy rules.
 * Owns rent calculation, special property bonuses, commissions, and ownership transfers.
 */

import { buildEvanopolisBoardV1, spaceAt } from "./board-v1.js";
import {
  developmentLevelForSpace,
  spaceById,
  type EvanopolisTerrainOwnership
} from "./development-orders.js";
import type {
  EvanopolisImporterCommission,
  EvanopolisMatchState,
  EvanopolisPendingRent,
  EvanopolisPlayerState,
  EvanopolisSpecialPropertyOwnership
} from "./evanopolis-state.js";
import { creditPlayer } from "./player-ledger.js";
import { roundTenths } from "./rule-utils.js";

export function ownerForSpace(state: EvanopolisMatchState, space_id: string): string | undefined {
  return state.terrain_ownership.find((ownership) => ownership.space_id === space_id)?.owner_player_id;
}

export function ownerForSpecialProperty(state: EvanopolisMatchState, space_id: string): string | undefined {
  return state.special_property_ownership.find((ownership) => ownership.space_id === space_id)?.owner_player_id;
}

export function pendingRentForLanding(
  state: EvanopolisMatchState,
  active_player_id: string,
  position: number
): EvanopolisPendingRent | null {
  const space = spaceAt(position);
  if (space?.kind !== "terrain") {
    return null;
  }

  const owner_player_id = ownerForSpace(state, space.space_id);
  if (owner_player_id === undefined || owner_player_id === active_player_id) {
    return null;
  }

  return {
    space_id: space.space_id,
    payer_player_id: active_player_id,
    owner_player_id,
    rent_eva: effectiveRentForTerrain(state, space.space_id, owner_player_id)
  };
}

export function importerCommissionsForOrder(
  state: EvanopolisMatchState,
  price_eva: number
): EvanopolisImporterCommission[] {
  const importer_1_owners = specialPropertyOwnersById(state, "importer_1");
  const importer_2_owners = specialPropertyOwnersById(state, "importer_2");
  const importer_1_owner = importer_1_owners[0];
  const importer_2_owner = importer_2_owners[0];
  if (importer_1_owner === undefined && importer_2_owner === undefined) {
    return [];
  }

  if (
    importer_1_owner !== undefined
    && importer_2_owner !== undefined
    && importer_1_owner === importer_2_owner
  ) {
    return [
      {
        owner_player_id: importer_1_owner,
        amount_eva: roundTenths(price_eva * 0.2),
        rate: 0.2
      }
    ];
  }

  const commissions: EvanopolisImporterCommission[] = [];
  if (importer_1_owner !== undefined) {
    commissions.push({
      owner_player_id: importer_1_owner,
      amount_eva: roundTenths(price_eva * 0.1),
      rate: 0.1
    });
  }
  if (importer_2_owner !== undefined) {
    commissions.push({
      owner_player_id: importer_2_owner,
      amount_eva: roundTenths(price_eva * 0.1),
      rate: 0.1
    });
  }

  return commissions;
}

export function applyImporterCommissions(
  players: readonly EvanopolisPlayerState[],
  commissions: readonly EvanopolisImporterCommission[]
): EvanopolisPlayerState[] {
  return commissions.reduce(
    (next_players, commission) => creditPlayer(next_players, commission.owner_player_id, commission.amount_eva),
    players.slice()
  );
}

export function transferTerrainOwnership(
  terrain_ownership: readonly EvanopolisTerrainOwnership[],
  eliminated_player_id: string,
  creditor_player_id: string
): EvanopolisTerrainOwnership[] {
  return terrain_ownership.map((ownership) => {
    if (ownership.owner_player_id !== eliminated_player_id) {
      return ownership;
    }
    return {
      ...ownership,
      owner_player_id: creditor_player_id
    };
  });
}

export function transferSpecialPropertyOwnership(
  special_property_ownership: readonly EvanopolisSpecialPropertyOwnership[],
  eliminated_player_id: string,
  creditor_player_id: string
): EvanopolisSpecialPropertyOwnership[] {
  return special_property_ownership.map((ownership) => {
    if (ownership.owner_player_id !== eliminated_player_id) {
      return ownership;
    }
    return {
      ...ownership,
      owner_player_id: creditor_player_id
    };
  });
}

function effectiveRentForTerrain(
  state: EvanopolisMatchState,
  space_id: string,
  owner_player_id: string
): number {
  const space = spaceById(space_id);
  if (space?.kind !== "terrain") {
    throw new Error(`Missing terrain for rent ${space_id}`);
  }

  const base_rent = baseRentForTerrain(state, space_id);
  const special_multiplier = specialPropertyRentMultiplier(state, owner_player_id);
  const monopoly_multiplier = hasFullLevelFiveCityMonopoly(state, owner_player_id, space.group_id) ? 2 : 1;
  return roundTenths(base_rent * special_multiplier * monopoly_multiplier);
}

function specialPropertyRentMultiplier(state: EvanopolisMatchState, owner_player_id: string): number {
  return 1 + specialPropertyRentBonus(state, owner_player_id);
}

function specialPropertyRentBonus(state: EvanopolisMatchState, owner_player_id: string): number {
  let bonus = 0;
  const owns_substation_1 = playerOwnsSpecialProperty(state, owner_player_id, "substation_1");
  const owns_substation_2 = playerOwnsSpecialProperty(state, owner_player_id, "substation_2");
  if (owns_substation_1 && owns_substation_2) {
    bonus += 0.3;
  } else if (owns_substation_1 || owns_substation_2) {
    bonus += 0.1;
  }
  if (playerOwnsSpecialProperty(state, owner_player_id, "private_workshop")) {
    bonus += 0.1;
  }
  if (playerOwnsSpecialProperty(state, owner_player_id, "cooling_plant")) {
    bonus += 0.1;
  }

  return bonus;
}

function playerOwnsSpecialProperty(
  state: EvanopolisMatchState,
  owner_player_id: string,
  special_property_id: string
): boolean {
  return specialPropertyOwnersById(state, special_property_id).includes(owner_player_id);
}

function specialPropertyOwnersById(state: EvanopolisMatchState, special_property_id: string): string[] {
  return state.special_property_ownership.flatMap((ownership) => {
    const space = spaceById(ownership.space_id);
    if (space?.kind !== "special_property" || space.special_property_id !== special_property_id) {
      return [];
    }
    return [ownership.owner_player_id];
  });
}

function baseRentForTerrain(state: EvanopolisMatchState, space_id: string): number {
  const space = spaceById(space_id);
  if (space?.kind !== "terrain") {
    throw new Error(`Missing terrain for rent ${space_id}`);
  }

  const development_level = developmentLevelForSpace(state.terrain_developments, space.space_id);
  const base_rent = space.development_rent_table?.find((row) => row.level === development_level)?.rent_eva;
  if (base_rent === undefined) {
    throw new Error(`Missing base rent for terrain ${space.space_id}`);
  }

  return base_rent;
}

function hasFullLevelFiveCityMonopoly(
  state: EvanopolisMatchState,
  owner_player_id: string,
  group_id: string | undefined
): boolean {
  if (group_id === undefined || group_id === "") {
    return false;
  }

  const city_terrain_spaces = buildEvanopolisBoardV1().filter((space) => (
    space.kind === "terrain"
    && space.group_id === group_id
  ));
  if (city_terrain_spaces.length !== 4) {
    return false;
  }

  return city_terrain_spaces.every((space) => (
    ownerForSpace(state, space.space_id) === owner_player_id
    && developmentLevelForSpace(state.terrain_developments, space.space_id) === 5
  ));
}
