import type {
  CommandEnvelope,
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
  readonly connected: boolean;
}

export interface EvanopolisDiceState {
  readonly die_1: number;
  readonly die_2: number;
  readonly total: number;
}

export interface EvanopolisMatchState {
  readonly match_id: string;
  readonly active_player_index: number;
  readonly has_rolled_current_turn: boolean;
  readonly players: readonly EvanopolisPlayerState[];
  readonly spaces: readonly EvanopolisBoardSpace[];
  readonly dice: EvanopolisDiceState | null;
}

export interface EvanopolisSnapshot {
  readonly match_id: string;
  readonly revision: number;
  readonly phase: string;
  readonly local_player_id?: string;
  readonly active_player_id: string;
  readonly players: readonly EvanopolisPlayerSnapshot[];
  readonly spectators: readonly { spectator_id: string; connected: boolean }[];
  readonly spaces: readonly EvanopolisBoardSpace[];
  readonly dice: EvanopolisDiceState | null;
  readonly available_actions: readonly string[];
}

export class EvanopolisRulesAdapter implements RulesAdapter<EvanopolisMatchState, EvanopolisSnapshot> {
  createInitialState(match_id: string, player_count: number): EvanopolisMatchState {
    return {
      match_id,
      active_player_index: 0,
      has_rolled_current_turn: false,
      players: Array.from({ length: player_count }, (_value, index) => ({
        player_id: `player_${index + 1}`,
        position: 0
      })),
      spaces: buildEvanopolisBoardV1(),
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
    if (command.type === "request_end_turn") {
      return this.handleEndTurn(state, command);
    }
    return {
      accepted: false,
      reason: "unknown_command"
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
          connected: seat?.connected ?? false
        };
      }),
      spectators: context.spectators.map((spectator) => ({
        spectator_id: spectator.spectator_id,
        connected: spectator.connected
      })),
      spaces: state.spaces,
      dice: state.dice,
      available_actions: this.availableActions(state, local_player?.player_id)
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
    const players = state.players.map((player) => {
      if (player.player_id !== active_player.player_id) {
        return player;
      }
      return {
        ...player,
        position: (player.position + dice.total) % EvanopolisBoardSize
      };
    });

    return {
      accepted: true,
      state: {
        ...state,
        has_rolled_current_turn: true,
        players,
        dice
      }
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

    return {
      accepted: true,
      state: {
        ...state,
        active_player_index: (state.active_player_index + 1) % state.players.length,
        has_rolled_current_turn: false
      }
    };
  }

  private availableActions(state: EvanopolisMatchState, player_id?: string): string[] {
    const active_player = state.players[state.active_player_index];
    if (active_player === undefined || active_player.player_id !== player_id) {
      return [];
    }
    if (state.has_rolled_current_turn) {
      return ["request_end_turn"];
    }
    return ["request_roll"];
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

function randomDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}
