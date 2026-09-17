/*
 * Shared Evanopolis V1 protocol and state shapes.
 * Keeps match state, public snapshot, and public definition contracts in one place.
 */

import type { EvanopolisBoardSpace } from "./board-v1.js";
import type {
  EvanopolisDevelopmentOrder,
  EvanopolisTerrainDevelopment,
  EvanopolisTerrainOwnership
} from "./development-orders.js";
import type {
  EvanopolisCardDeckDefinition,
  EvanopolisCardDeckId,
  EvanopolisCardDeckState,
  EvanopolisCardDefinition,
  EvanopolisCardEffect,
  EvanopolisCardEffectType,
  EvanopolisPendingCardResolution
} from "./cards.js";
import type { RevisionedMatchEvent } from "../multiplayer-core/types.js";

export const EvanopolisStartingBalanceEva = 50;

export type EvanopolisPlayerStatus = "active" | "game_over";

export interface EvanopolisPlayerState {
  readonly player_id: string;
  readonly position: number;
  readonly status: EvanopolisPlayerStatus;
  readonly eva_balance: number;
}

export interface EvanopolisPlayerSnapshot extends EvanopolisPlayerState {
  readonly joined: boolean;
  readonly connected: boolean;
}

export interface EvanopolisDiceState {
  readonly die_1: number;
  readonly die_2: number;
  readonly total: number;
}

export interface EvanopolisPendingRent {
  readonly space_id: string;
  readonly payer_player_id: string;
  readonly owner_player_id: string;
  readonly rent_eva: number;
}

export interface EvanopolisSpecialPropertyOwnership {
  readonly space_id: string;
  readonly owner_player_id: string;
}

export interface EvanopolisImporterCommission {
  readonly owner_player_id: string;
  readonly amount_eva: number;
  readonly rate: number;
}

export interface EvanopolisMatchState {
  readonly match_id: string;
  readonly random_seed: string;
  readonly dice_roll_count: number;
  readonly room_buy_in_eva: number;
  readonly active_player_index: number;
  readonly has_rolled_current_turn: boolean;
  readonly players: readonly EvanopolisPlayerState[];
  readonly card_decks: readonly EvanopolisCardDeckState[];
  readonly terrain_ownership: readonly EvanopolisTerrainOwnership[];
  readonly special_property_ownership: readonly EvanopolisSpecialPropertyOwnership[];
  readonly terrain_developments: readonly EvanopolisTerrainDevelopment[];
  readonly development_orders: readonly EvanopolisDevelopmentOrder[];
  readonly next_development_order_index: number;
  readonly pending_rent: EvanopolisPendingRent | null;
  readonly pending_card_resolution: EvanopolisPendingCardResolution | null;
  readonly dice: EvanopolisDiceState | null;
  readonly jailed_player_ids?: readonly string[];
}

export interface EvanopolisDefinition {
  readonly match_id: string;
  readonly ruleset_id: "evanopolis_v1";
  readonly random_seed: string;
  readonly room_buy_in_eva: number;
  readonly spaces: readonly EvanopolisBoardSpace[];
  readonly card_decks: readonly EvanopolisCardDeckDefinition[];
}

export interface EvanopolisSnapshot {
  readonly match_id: string;
  readonly revision: number;
  readonly phase: string;
  readonly random_seed: string;
  readonly dice_roll_count: number;
  readonly room_buy_in_eva: number;
  readonly has_rolled_current_turn: boolean;
  readonly local_player_id?: string;
  readonly active_player_id: string;
  readonly winner_player_id: string;
  readonly players: readonly EvanopolisPlayerSnapshot[];
  readonly spectators: readonly { spectator_id: string; connected: boolean }[];
  readonly terrain_ownership: readonly EvanopolisTerrainOwnership[];
  readonly special_property_ownership: readonly EvanopolisSpecialPropertyOwnership[];
  readonly terrain_developments: readonly EvanopolisTerrainDevelopment[];
  readonly development_orders: readonly EvanopolisDevelopmentOrder[];
  readonly pending_rent: EvanopolisPendingRent | null;
  readonly pending_card_resolution: EvanopolisPendingCardResolution | null;
  readonly dice: EvanopolisDiceState | null;
  readonly jailed_player_ids: readonly string[];
  readonly available_actions: readonly string[];
  readonly recent_events: readonly RevisionedMatchEvent[];
}

export type {
  EvanopolisCardDeckDefinition,
  EvanopolisCardDeckId,
  EvanopolisCardDeckState,
  EvanopolisCardDefinition,
  EvanopolisCardEffect,
  EvanopolisCardEffectType,
  EvanopolisPendingCardResolution
};
