/*
 * Player and EVA balance mutation helpers for Evanopolis V1.
 * Owns pure transformations for payments, credits, card effects, and eliminations.
 */

import type { EvanopolisPendingCardResolution } from "./cards.js";
import type { EvanopolisPlayerState } from "./evanopolis-state.js";
import { roundTenths } from "./rule-utils.js";

export function debitPlayer(
  players: readonly EvanopolisPlayerState[],
  player_id: string,
  amount_eva: number
): EvanopolisPlayerState[] {
  return players.map((player) => {
    if (player.player_id !== player_id) {
      return player;
    }
    return {
      ...player,
      eva_balance: roundTenths(player.eva_balance - amount_eva)
    };
  });
}

export function creditPlayer(
  players: readonly EvanopolisPlayerState[],
  player_id: string,
  amount_eva: number
): EvanopolisPlayerState[] {
  return players.map((player) => {
    if (player.player_id !== player_id) {
      return player;
    }
    return {
      ...player,
      eva_balance: roundTenths(player.eva_balance + amount_eva)
    };
  });
}

export function transferBetweenPlayers(
  players: readonly EvanopolisPlayerState[],
  payer_player_id: string,
  owner_player_id: string,
  amount_eva: number
): EvanopolisPlayerState[] {
  return players.map((player) => {
    if (player.player_id === payer_player_id) {
      return {
        ...player,
        eva_balance: roundTenths(player.eva_balance - amount_eva)
      };
    }
    if (player.player_id === owner_player_id) {
      return {
        ...player,
        eva_balance: roundTenths(player.eva_balance + amount_eva)
      };
    }
    return player;
  });
}

export function transferGameOverAssets(
  players: readonly EvanopolisPlayerState[],
  eliminated_player_id: string,
  creditor_player_id: string,
  transferred_balance_eva: number
): EvanopolisPlayerState[] {
  return players.map((player) => {
    if (player.player_id === eliminated_player_id) {
      return {
        ...player,
        status: "game_over",
        eva_balance: 0
      };
    }
    if (player.player_id === creditor_player_id) {
      return {
        ...player,
        eva_balance: roundTenths(player.eva_balance + transferred_balance_eva)
      };
    }
    return player;
  });
}

export function markPlayerGameOver(
  players: readonly EvanopolisPlayerState[],
  player_id: string
): EvanopolisPlayerState[] {
  return players.map((player) => {
    if (player.player_id !== player_id) {
      return player;
    }
    return {
      ...player,
      status: "game_over",
      eva_balance: 0
    };
  });
}

export function applyCardEffect(
  players: readonly EvanopolisPlayerState[],
  pending_card: EvanopolisPendingCardResolution
): EvanopolisPlayerState[] {
  if (pending_card.effect.type === "eva_delta") {
    return creditPlayer(players, pending_card.player_id, pending_card.effect.amount_eva);
  }

  return players.slice();
}

export function canAffordCardEffect(
  player: EvanopolisPlayerState,
  pending_card: EvanopolisPendingCardResolution
): boolean {
  if (pending_card.effect.type === "eva_delta" && pending_card.effect.amount_eva < 0) {
    return player.eva_balance >= Math.abs(pending_card.effect.amount_eva);
  }

  return true;
}

export function applyDevelopmentRefunds(
  players: readonly EvanopolisPlayerState[],
  refunds: readonly { readonly player_id: string; readonly amount_eva: number }[]
): EvanopolisPlayerState[] {
  return refunds.reduce(
    (next_players, refund) => creditPlayer(next_players, refund.player_id, refund.amount_eva),
    players.slice()
  );
}
