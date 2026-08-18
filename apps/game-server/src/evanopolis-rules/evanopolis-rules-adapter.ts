import type {
  CommandEnvelope,
  MatchEvent,
  MatchContext,
  RulesAdapter,
  RulesCommandOutcome
} from "../multiplayer-core/types.js";
import { buildEvanopolisBoardV1, EvanopolisBoardSize, type EvanopolisBoardSpace } from "./board-v1.js";

export interface EvanopolisPlayerState {
  readonly player_id: string;
  readonly position: number;
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
  readonly spaces: readonly EvanopolisBoardSpace[];
}

export interface EvanopolisSnapshot {
  readonly match_id: string;
  readonly revision: number;
  readonly phase: string;
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
  createInitialState(match_id: string, player_count: number): EvanopolisMatchState {
    return {
      match_id,
      active_player_index: 0,
      has_rolled_current_turn: false,
      players: Array.from({ length: player_count }, (_value, index) => ({
        player_id: `player_${index + 1}`,
        position: 0
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
    const ownership: EvanopolisTerrainOwnership = {
      space_id: space.space_id,
      owner_player_id: active_player.player_id
    };

    return {
      accepted: true,
      state: {
        ...state,
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
    return {
      accepted: true,
      state: {
        ...state,
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

    const next_player = state.players[(state.active_player_index + 1) % state.players.length];
    const event: MatchEvent = {
      type: "turn_ended",
      player_id: active_player.player_id,
      next_player_id: next_player?.player_id ?? ""
    };

    return {
      accepted: true,
      state: {
        ...state,
        active_player_index: (state.active_player_index + 1) % state.players.length,
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
    if (active_player === undefined || active_player.player_id !== player_id) {
      return [];
    }
    if (state.has_rolled_current_turn) {
      if (state.pending_rent?.payer_player_id === active_player.player_id) {
        return ["request_pay_rent"];
      }

      const actions: string[] = [];
      const space = spaceAt(active_player.position);
      if (space?.kind === "terrain" && this.ownerForSpace(state, space.space_id) === undefined) {
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
