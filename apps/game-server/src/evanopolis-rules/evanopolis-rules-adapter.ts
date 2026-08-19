import type {
  CommandEnvelope,
  MatchEvent,
  MatchContext,
  RulesAdapter,
  RulesCommandOutcome,
  RulesInitialStateOptions
} from "../multiplayer-core/types.js";
import { buildEvanopolisBoardV1, EvanopolisBoardSize, type EvanopolisBoardSpace } from "./board-v1.js";

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

export interface EvanopolisTerrainOwnership {
  readonly space_id: string;
  readonly owner_player_id: string;
}

export interface EvanopolisPendingRent {
  readonly space_id: string;
  readonly payer_player_id: string;
  readonly owner_player_id: string;
  readonly rent_eva: number;
}

export interface EvanopolisMatchState {
  readonly match_id: string;
  readonly room_buy_in_eva: number;
  readonly active_player_index: number;
  readonly has_rolled_current_turn: boolean;
  readonly players: readonly EvanopolisPlayerState[];
  readonly terrain_ownership: readonly EvanopolisTerrainOwnership[];
  readonly pending_rent: EvanopolisPendingRent | null;
  readonly dice: EvanopolisDiceState | null;
}

export interface EvanopolisDefinition {
  readonly match_id: string;
  readonly ruleset_id: "evanopolis_v1";
  readonly room_buy_in_eva: number;
  readonly spaces: readonly EvanopolisBoardSpace[];
}

export interface EvanopolisSnapshot {
  readonly match_id: string;
  readonly revision: number;
  readonly phase: string;
  readonly room_buy_in_eva: number;
  readonly local_player_id?: string;
  readonly active_player_id: string;
  readonly players: readonly EvanopolisPlayerSnapshot[];
  readonly spectators: readonly { spectator_id: string; connected: boolean }[];
  readonly terrain_ownership: readonly EvanopolisTerrainOwnership[];
  readonly pending_rent: EvanopolisPendingRent | null;
  readonly dice: EvanopolisDiceState | null;
  readonly available_actions: readonly string[];
}

export class EvanopolisRulesAdapter
  implements RulesAdapter<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>
{
  createInitialState(
    match_id: string,
    player_count: number,
    options: RulesInitialStateOptions = {}
  ): EvanopolisMatchState {
    const room_buy_in_eva = Number(options.room_buy_in_eva ?? EvanopolisStartingBalanceEva);
    return {
      match_id,
      room_buy_in_eva,
      active_player_index: 0,
      has_rolled_current_turn: false,
      players: Array.from({ length: player_count }, (_value, index) => ({
        player_id: `player_${index + 1}`,
        position: 0,
        status: "active",
        eva_balance: room_buy_in_eva
      })),
      terrain_ownership: [],
      pending_rent: null,
      dice: null
    };
  }

  handleCommand(
    state: EvanopolisMatchState,
    command: CommandEnvelope,
    context: MatchContext
  ): RulesCommandOutcome<EvanopolisMatchState> {
    if (context.phase !== "active") {
      return {
        accepted: false,
        reason: "match_not_active"
      };
    }

    if (command.type === "request_roll") {
      return this.handleRoll(state, command);
    }
    if (command.type === "request_purchase_property") {
      return this.handlePurchaseProperty(state, command);
    }
    if (command.type === "request_pay_rent") {
      return this.handlePayRent(state, command);
    }
    if (command.type === "request_accept_game_over") {
      return this.handleAcceptGameOver(state, command);
    }
    if (command.type === "request_end_turn") {
      return this.handleEndTurn(state, command);
    }
    return {
      accepted: false,
      reason: "unknown_command"
    };
  }

  buildPublicDefinition(state: EvanopolisMatchState): EvanopolisDefinition {
    return {
      match_id: state.match_id,
      ruleset_id: "evanopolis_v1",
      room_buy_in_eva: state.room_buy_in_eva,
      spaces: buildEvanopolisBoardV1()
    };
  }

  buildPublicSnapshot(
    state: EvanopolisMatchState,
    context: MatchContext,
    local_client_id?: string
  ): EvanopolisSnapshot {
    const local_player = context.players.find((player) => player.client_id === local_client_id);
    return {
      match_id: state.match_id,
      revision: context.revision,
      phase: context.phase,
      room_buy_in_eva: state.room_buy_in_eva,
      ...(local_player === undefined ? {} : { local_player_id: local_player.player_id }),
      active_player_id: state.players[state.active_player_index]?.player_id ?? "",
      players: state.players.map((player) => {
        const seat = context.players.find((candidate) => candidate.player_id === player.player_id);
        return {
          ...player,
          joined: seat !== undefined,
          connected: seat?.connected ?? false
        };
      }),
      spectators: context.spectators.map((spectator) => ({
        spectator_id: spectator.spectator_id,
        connected: spectator.connected
      })),
      terrain_ownership: state.terrain_ownership,
      pending_rent: state.pending_rent,
      dice: state.dice,
      available_actions: this.availableActions(state, context, local_player?.player_id)
    };
  }

  private handleRoll(state: EvanopolisMatchState, command: CommandEnvelope): RulesCommandOutcome<EvanopolisMatchState> {
    const active_player = state.players[state.active_player_index];
    if (active_player === undefined || command.player_id !== active_player.player_id) {
      return {
        accepted: false,
        reason: "not_active_player"
      };
    }
    if (active_player.status !== "active") {
      return {
        accepted: false,
        reason: "player_game_over"
      };
    }
    if (state.has_rolled_current_turn) {
      return {
        accepted: false,
        reason: "turn_already_rolled"
      };
    }

    const dice = this.rollDice();
    const from_position = active_player.position;
    const to_position = (active_player.position + dice.total) % EvanopolisBoardSize;
    const pending_rent = this.pendingRentForLanding(state, active_player.player_id, to_position);
    const players = state.players.map((player) => {
      if (player.player_id !== active_player.player_id) {
        return player;
      }
      return {
        ...player,
        position: to_position
      };
    });

    return {
      accepted: true,
      state: {
        ...state,
        has_rolled_current_turn: true,
        players,
        pending_rent,
        dice
      },
      events: [
        {
          type: "dice_rolled",
          player_id: active_player.player_id,
          die_1: dice.die_1,
          die_2: dice.die_2,
          total: dice.total,
          from_position,
          to_position
        }
      ]
    };
  }

  private handlePurchaseProperty(
    state: EvanopolisMatchState,
    command: CommandEnvelope
  ): RulesCommandOutcome<EvanopolisMatchState> {
    const active_player = state.players[state.active_player_index];
    if (active_player === undefined || command.player_id !== active_player.player_id) {
      return {
        accepted: false,
        reason: "not_active_player"
      };
    }
    if (active_player.status !== "active") {
      return {
        accepted: false,
        reason: "player_game_over"
      };
    }
    if (!state.has_rolled_current_turn) {
      return {
        accepted: false,
        reason: "roll_required"
      };
    }
    if (state.pending_rent !== null) {
      return {
        accepted: false,
        reason: "rent_payment_required"
      };
    }

    const space = spaceAt(active_player.position);
    if (space?.kind !== "terrain") {
      return {
        accepted: false,
        reason: "space_not_purchasable"
      };
    }
    if (this.ownerForSpace(state, space.space_id) !== undefined) {
      return {
        accepted: false,
        reason: "property_already_owned"
      };
    }

    const price_eva = space.purchase_price_eva ?? 0;
    if (active_player.eva_balance < price_eva) {
      return {
        accepted: false,
        reason: "insufficient_eva"
      };
    }

    const ownership: EvanopolisTerrainOwnership = {
      space_id: space.space_id,
      owner_player_id: active_player.player_id
    };

    return {
      accepted: true,
      state: {
        ...state,
        players: this.debitPlayer(state.players, active_player.player_id, price_eva),
        terrain_ownership: [...state.terrain_ownership, ownership]
      },
      events: [
        {
          type: "property_purchased",
          player_id: active_player.player_id,
          space_id: space.space_id,
          price_eva
        }
      ]
    };
  }

  private handlePayRent(
    state: EvanopolisMatchState,
    command: CommandEnvelope
  ): RulesCommandOutcome<EvanopolisMatchState> {
    const active_player = state.players[state.active_player_index];
    if (active_player === undefined || command.player_id !== active_player.player_id) {
      return {
        accepted: false,
        reason: "not_active_player"
      };
    }
    if (active_player.status !== "active") {
      return {
        accepted: false,
        reason: "player_game_over"
      };
    }
    if (!state.has_rolled_current_turn) {
      return {
        accepted: false,
        reason: "roll_required"
      };
    }
    if (state.pending_rent === null || state.pending_rent.payer_player_id !== active_player.player_id) {
      return {
        accepted: false,
        reason: "rent_not_due"
      };
    }

    const paid_rent = state.pending_rent;
    if (active_player.eva_balance < paid_rent.rent_eva) {
      return {
        accepted: false,
        reason: "insufficient_eva"
      };
    }

    return {
      accepted: true,
      state: {
        ...state,
        players: this.transferBetweenPlayers(
          state.players,
          paid_rent.payer_player_id,
          paid_rent.owner_player_id,
          paid_rent.rent_eva
        ),
        pending_rent: null
      },
      events: [
        {
          type: "rent_paid",
          payer_player_id: paid_rent.payer_player_id,
          owner_player_id: paid_rent.owner_player_id,
          space_id: paid_rent.space_id,
          rent_eva: paid_rent.rent_eva
        }
      ]
    };
  }

  private handleAcceptGameOver(
    state: EvanopolisMatchState,
    command: CommandEnvelope
  ): RulesCommandOutcome<EvanopolisMatchState> {
    const active_player = state.players[state.active_player_index];
    if (active_player === undefined || command.player_id !== active_player.player_id) {
      return {
        accepted: false,
        reason: "not_active_player"
      };
    }
    if (active_player.status !== "active") {
      return {
        accepted: false,
        reason: "player_game_over"
      };
    }
    if (!state.has_rolled_current_turn) {
      return {
        accepted: false,
        reason: "roll_required"
      };
    }
    if (state.pending_rent === null || state.pending_rent.payer_player_id !== active_player.player_id) {
      return {
        accepted: false,
        reason: "rent_not_due"
      };
    }

    const unpaid_rent = state.pending_rent;
    if (active_player.eva_balance >= unpaid_rent.rent_eva) {
      return {
        accepted: false,
        reason: "rent_can_be_paid"
      };
    }

    const transferred_balance_eva = active_player.eva_balance;
    const transferred_space_ids = state.terrain_ownership
      .filter((ownership) => ownership.owner_player_id === active_player.player_id)
      .map((ownership) => ownership.space_id);
    const players = this.transferGameOverAssets(
      state.players,
      active_player.player_id,
      unpaid_rent.owner_player_id,
      transferred_balance_eva
    );
    const next_player_index = this.nextActivePlayerIndex(players, state.active_player_index);
    const next_player = players[next_player_index];

    return {
      accepted: true,
      state: {
        ...state,
        active_player_index: next_player_index,
        has_rolled_current_turn: false,
        players,
        terrain_ownership: this.transferTerrainOwnership(
          state.terrain_ownership,
          active_player.player_id,
          unpaid_rent.owner_player_id
        ),
        pending_rent: null
      },
      events: [
        {
          type: "player_eliminated",
          player_id: active_player.player_id,
          creditor_player_id: unpaid_rent.owner_player_id,
          reason: "insufficient_rent",
          space_id: unpaid_rent.space_id,
          unpaid_rent_eva: unpaid_rent.rent_eva,
          transferred_balance_eva,
          transferred_space_ids,
          next_player_id: next_player?.player_id ?? ""
        }
      ]
    };
  }

  private handleEndTurn(
    state: EvanopolisMatchState,
    command: CommandEnvelope
  ): RulesCommandOutcome<EvanopolisMatchState> {
    const active_player = state.players[state.active_player_index];
    if (active_player === undefined || command.player_id !== active_player.player_id) {
      return {
        accepted: false,
        reason: "not_active_player"
      };
    }
    if (active_player.status !== "active") {
      return {
        accepted: false,
        reason: "player_game_over"
      };
    }
    if (!state.has_rolled_current_turn) {
      return {
        accepted: false,
        reason: "roll_required"
      };
    }
    if (state.pending_rent !== null) {
      return {
        accepted: false,
        reason: "rent_payment_required"
      };
    }

    const next_player_index = this.nextActivePlayerIndex(state.players, state.active_player_index);
    const next_player = state.players[next_player_index];
    const event: MatchEvent = {
      type: "turn_ended",
      player_id: active_player.player_id,
      next_player_id: next_player?.player_id ?? ""
    };

    return {
      accepted: true,
      state: {
        ...state,
        active_player_index: next_player_index,
        has_rolled_current_turn: false
      },
      events: [event]
    };
  }

  private availableActions(state: EvanopolisMatchState, context: MatchContext, player_id?: string): string[] {
    if (context.phase !== "active") {
      return [];
    }

    const active_player = state.players[state.active_player_index];
    if (active_player === undefined || active_player.player_id !== player_id || active_player.status !== "active") {
      return [];
    }
    if (state.has_rolled_current_turn) {
      if (state.pending_rent?.payer_player_id === active_player.player_id) {
        if (active_player.eva_balance >= state.pending_rent.rent_eva) {
          return ["request_pay_rent"];
        }
        return ["request_accept_game_over"];
      }

      const actions: string[] = [];
      const space = spaceAt(active_player.position);
      if (
        space?.kind === "terrain"
        && this.ownerForSpace(state, space.space_id) === undefined
        && active_player.eva_balance >= (space.purchase_price_eva ?? 0)
      ) {
        actions.push("request_purchase_property");
      }
      actions.push("request_end_turn");
      return actions;
    }
    return ["request_roll"];
  }

  private ownerForSpace(state: EvanopolisMatchState, space_id: string): string | undefined {
    return state.terrain_ownership.find((ownership) => ownership.space_id === space_id)?.owner_player_id;
  }

  private debitPlayer(
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

  private transferBetweenPlayers(
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

  private transferGameOverAssets(
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

  private transferTerrainOwnership(
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

  private nextActivePlayerIndex(players: readonly EvanopolisPlayerState[], current_player_index: number): number {
    for (let offset = 1; offset <= players.length; offset += 1) {
      const candidate_index = (current_player_index + offset) % players.length;
      if (players[candidate_index]?.status === "active") {
        return candidate_index;
      }
    }
    return current_player_index;
  }

  private pendingRentForLanding(
    state: EvanopolisMatchState,
    active_player_id: string,
    position: number
  ): EvanopolisPendingRent | null {
    const space = spaceAt(position);
    if (space?.kind !== "terrain") {
      return null;
    }

    const owner_player_id = this.ownerForSpace(state, space.space_id);
    if (owner_player_id === undefined || owner_player_id === active_player_id) {
      return null;
    }

    const base_rent = space.development_rent_table?.find((row) => row.level === 0)?.rent_eva;
    if (base_rent === undefined) {
      throw new Error(`Missing base rent for terrain ${space.space_id}`);
    }
    return {
      space_id: space.space_id,
      payer_player_id: active_player_id,
      owner_player_id,
      rent_eva: base_rent
    };
  }

  private rollDice(): EvanopolisDiceState {
    const die_1 = randomDie();
    const die_2 = randomDie();
    return {
      die_1,
      die_2,
      total: die_1 + die_2
    };
  }
}

function spaceAt(position: number): EvanopolisBoardSpace | undefined {
  return buildEvanopolisBoardV1().find((space) => space.index === position);
}

function randomDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10;
}
