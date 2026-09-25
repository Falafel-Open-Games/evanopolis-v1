/*
 * Evanopolis V1 turn-state helpers.
 * Owns available action derivation, active-player navigation, jail flags, and salida rewards.
 */

import type { MatchContext } from "../multiplayer-core/types.js";
import { spaceAt } from "./board-v1.js";
import { canOrderAnyDevelopment as playerCanOrderAnyDevelopment } from "./development-orders.js";
import type { EvanopolisMatchState, EvanopolisPlayerState } from "./evanopolis-state.js";
import { ownerForSpace, ownerForSpecialProperty } from "./economy.js";
import { canAffordCardEffect } from "./player-ledger.js";

const SalidaPassRewardEva = 2;
const SalidaExactLandingRewardEva = 3;

export function availableActions(
  state: EvanopolisMatchState,
  context: MatchContext,
  player_id?: string
): string[] {
  if (context.phase !== "active") {
    return [];
  }
  const local_player = state.players.find((player) => player.player_id === player_id);
  if (local_player === undefined || local_player.status !== "active") {
    return [];
  }
  if (activePlayers(state.players).length <= 1) {
    return [];
  }
  const portfolio_actions = canOrderAnyDevelopment(state, local_player.player_id)
    ? ["request_order_development"]
    : [];

  const active_player = state.players[state.active_player_index];
  if (active_player === undefined || active_player.player_id !== player_id || active_player.status !== "active") {
    return portfolio_actions;
  }
  if (!state.has_rolled_current_turn && isPlayerJailed(state, active_player.player_id)) {
    return ["request_end_turn"];
  }
  if (state.has_rolled_current_turn) {
    if (state.pending_card_resolution?.player_id === active_player.player_id) {
      if (!canAffordCardEffect(active_player, state.pending_card_resolution)) {
        return ["request_accept_game_over"];
      }
      return ["request_resolve_card"];
    }
    if (state.pending_rent?.payer_player_id === active_player.player_id) {
      if (active_player.eva_balance_micro >= state.pending_rent.rent_micro) {
        return ["request_pay_rent"];
      }
      return ["request_accept_game_over"];
    }

    const actions: string[] = [];
    const space = spaceAt(active_player.position, state.raw_eva_scale_micro);
    if (
      space?.kind === "terrain"
      && ownerForSpace(state, space.space_id) === undefined
      && active_player.eva_balance_micro >= (space.purchase_price_micro ?? 0)
    ) {
      actions.push("request_purchase_property");
    }
    if (
      space?.kind === "special_property"
      && ownerForSpecialProperty(state, space.space_id) === undefined
      && active_player.eva_balance_micro >= (space.purchase_price_micro ?? 0)
    ) {
      actions.push("request_purchase_special_property");
    }
    actions.push("request_end_turn");
    return actions;
  }
  return [...portfolio_actions, "request_roll"];
}

export function activePlayers(players: readonly EvanopolisPlayerState[]): EvanopolisPlayerState[] {
  return players.filter((player) => player.status === "active");
}

export function winnerPlayerId(state: EvanopolisMatchState): string {
  const current_active_players = activePlayers(state.players);
  if (current_active_players.length !== 1) {
    return "";
  }
  return current_active_players[0]?.player_id ?? "";
}

export function isPlayerJailed(state: EvanopolisMatchState, player_id: string): boolean {
  return (state.jailed_player_ids ?? []).includes(player_id);
}

export function addJailedPlayer(state: EvanopolisMatchState, player_id: string): readonly string[] {
  const jailed_player_ids = state.jailed_player_ids ?? [];
  if (jailed_player_ids.includes(player_id)) {
    return jailed_player_ids;
  }

  return [...jailed_player_ids, player_id];
}

export function removeJailedPlayer(state: EvanopolisMatchState, player_id: string): readonly string[] {
  return (state.jailed_player_ids ?? []).filter((jailed_player_id) => jailed_player_id !== player_id);
}

export function nextActivePlayerIndex(players: readonly EvanopolisPlayerState[], current_player_index: number): number {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidate_index = (current_player_index + offset) % players.length;
    if (players[candidate_index]?.status === "active") {
      return candidate_index;
    }
  }
  return current_player_index;
}

export function isPlayerInOwnPostRollPhase(state: EvanopolisMatchState, player_id: string): boolean {
  const active_player = state.players[state.active_player_index];
  return active_player?.player_id === player_id && state.has_rolled_current_turn;
}

export function startRewardForMove(board_size: number, from_position: number, dice_total: number): number {
  if (from_position + dice_total < board_size) {
    return 0;
  }
  if ((from_position + dice_total) % board_size === 0) {
    return SalidaExactLandingRewardEva;
  }

  return SalidaPassRewardEva;
}

export function startRewardMicroForMove(
  board_size: number,
  from_position: number,
  dice_total: number,
  raw_eva_scale_micro: number
): number {
  return startRewardForMove(board_size, from_position, dice_total) * raw_eva_scale_micro;
}

function canOrderAnyDevelopment(state: EvanopolisMatchState, player_id: string): boolean {
  const player = state.players.find((candidate) => candidate.player_id === player_id);
  if (player === undefined || player.status !== "active") {
    return false;
  }
  if (isPlayerInOwnPostRollPhase(state, player_id)) {
    return false;
  }
  return playerCanOrderAnyDevelopment(
    state.terrain_ownership,
    state.terrain_developments,
    state.development_orders,
    player_id,
    player.eva_balance_micro,
    state.raw_eva_scale_micro
  );
}
