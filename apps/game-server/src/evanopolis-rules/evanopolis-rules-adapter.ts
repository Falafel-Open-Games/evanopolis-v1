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

export type EvanopolisCardDeckId = "luck" | "destiny";
export type EvanopolisCardEffectType = "eva_delta";

export interface EvanopolisCardEffect {
  readonly type: EvanopolisCardEffectType;
  readonly amount_eva: number;
}

export interface EvanopolisCardDefinition {
  readonly card_id: string;
  readonly deck_id: EvanopolisCardDeckId;
  readonly labels: {
    readonly en: string;
    readonly es: string;
    readonly pt_br: string;
  };
  readonly effect: EvanopolisCardEffect;
}

export interface EvanopolisCardDeckDefinition {
  readonly deck_id: EvanopolisCardDeckId;
  readonly labels: {
    readonly en: string;
    readonly es: string;
    readonly pt_br: string;
  };
  readonly cards: readonly EvanopolisCardDefinition[];
}

export interface EvanopolisCardDeckState {
  readonly deck_id: EvanopolisCardDeckId;
  readonly card_ids: readonly string[];
}

export interface EvanopolisPendingCardResolution {
  readonly deck_id: EvanopolisCardDeckId;
  readonly card_id: string;
  readonly player_id: string;
  readonly space_id: string;
  readonly effect: EvanopolisCardEffect;
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
  readonly random_seed: string;
  readonly room_buy_in_eva: number;
  readonly active_player_index: number;
  readonly has_rolled_current_turn: boolean;
  readonly players: readonly EvanopolisPlayerState[];
  readonly card_decks: readonly EvanopolisCardDeckState[];
  readonly terrain_ownership: readonly EvanopolisTerrainOwnership[];
  readonly pending_rent: EvanopolisPendingRent | null;
  readonly pending_card_resolution: EvanopolisPendingCardResolution | null;
  readonly dice: EvanopolisDiceState | null;
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
  readonly room_buy_in_eva: number;
  readonly local_player_id?: string;
  readonly active_player_id: string;
  readonly winner_player_id: string;
  readonly players: readonly EvanopolisPlayerSnapshot[];
  readonly spectators: readonly { spectator_id: string; connected: boolean }[];
  readonly terrain_ownership: readonly EvanopolisTerrainOwnership[];
  readonly pending_rent: EvanopolisPendingRent | null;
  readonly pending_card_resolution: EvanopolisPendingCardResolution | null;
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
    const random_seed = String(options.random_seed ?? `evanopolis:${match_id}`);
    return {
      match_id,
      random_seed,
      room_buy_in_eva,
      active_player_index: 0,
      has_rolled_current_turn: false,
      players: Array.from({ length: player_count }, (_value, index) => ({
        player_id: `player_${index + 1}`,
        position: 0,
        status: "active",
        eva_balance: room_buy_in_eva
      })),
      card_decks: createInitialCardDecks(random_seed),
      terrain_ownership: [],
      pending_rent: null,
      pending_card_resolution: null,
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
    if (command.type === "request_resolve_card") {
      return this.handleResolveCard(state, command);
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
      random_seed: state.random_seed,
      room_buy_in_eva: state.room_buy_in_eva,
      spaces: buildEvanopolisBoardV1(),
      card_decks: EvanopolisCardDecks
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
      random_seed: state.random_seed,
      room_buy_in_eva: state.room_buy_in_eva,
      ...(local_player === undefined ? {} : { local_player_id: local_player.player_id }),
      active_player_id: state.players[state.active_player_index]?.player_id ?? "",
      winner_player_id: this.winnerPlayerId(state),
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
      pending_card_resolution: state.pending_card_resolution,
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
    const card_draw = this.drawCardForLanding(state, active_player.player_id, to_position);
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
        card_decks: card_draw.card_decks,
        pending_rent,
        pending_card_resolution: card_draw.pending_card_resolution,
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
        },
        ...card_draw.events
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
    if (state.pending_card_resolution !== null) {
      return {
        accepted: false,
        reason: "card_resolution_required"
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
    if (state.pending_card_resolution !== null) {
      return {
        accepted: false,
        reason: "card_resolution_required"
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
    if (state.pending_card_resolution !== null) {
      return {
        accepted: false,
        reason: "card_resolution_required"
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
    const active_players = this.activePlayers(players);
    const events: MatchEvent[] = [
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
    ];
    if (active_players.length === 1) {
      events.push({
        type: "game_ended",
        winner_player_id: active_players[0]?.player_id ?? "",
        reason: "last_player_standing"
      });
    }

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
        pending_rent: null,
        pending_card_resolution: null
      },
      events
    };
  }

  private handleResolveCard(
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
    if (state.pending_card_resolution === null) {
      return {
        accepted: false,
        reason: "card_not_pending"
      };
    }
    if (state.pending_card_resolution.player_id !== active_player.player_id) {
      return {
        accepted: false,
        reason: "card_not_pending_for_player"
      };
    }

    const pending_card = state.pending_card_resolution;
    const players = this.applyCardEffect(state.players, pending_card);
    return {
      accepted: true,
      state: {
        ...state,
        players,
        pending_card_resolution: null
      },
      events: [
        {
          type: "card_resolved",
          player_id: pending_card.player_id,
          space_id: pending_card.space_id,
          deck_id: pending_card.deck_id,
          card_id: pending_card.card_id,
          effect_type: pending_card.effect.type,
          amount_eva: pending_card.effect.amount_eva
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
    if (state.pending_card_resolution !== null) {
      return {
        accepted: false,
        reason: "card_resolution_required"
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
    if (this.activePlayers(state.players).length <= 1) {
      return [];
    }

    const active_player = state.players[state.active_player_index];
    if (active_player === undefined || active_player.player_id !== player_id || active_player.status !== "active") {
      return [];
    }
    if (state.has_rolled_current_turn) {
      if (state.pending_card_resolution?.player_id === active_player.player_id) {
        return ["request_resolve_card"];
      }
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

  private activePlayers(players: readonly EvanopolisPlayerState[]): EvanopolisPlayerState[] {
    return players.filter((player) => player.status === "active");
  }

  private winnerPlayerId(state: EvanopolisMatchState): string {
    const active_players = this.activePlayers(state.players);
    if (active_players.length !== 1) {
      return "";
    }
    return active_players[0]?.player_id ?? "";
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

  private applyCardEffect(
    players: readonly EvanopolisPlayerState[],
    pending_card: EvanopolisPendingCardResolution
  ): EvanopolisPlayerState[] {
    if (pending_card.effect.type === "eva_delta") {
      return this.creditPlayer(players, pending_card.player_id, pending_card.effect.amount_eva);
    }

    return players.slice();
  }

  private creditPlayer(
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

  private drawCardForLanding(
    state: EvanopolisMatchState,
    player_id: string,
    position: number
  ): {
    readonly card_decks: readonly EvanopolisCardDeckState[];
    readonly pending_card_resolution: EvanopolisPendingCardResolution | null;
    readonly events: readonly MatchEvent[];
  } {
    const space = spaceAt(position);
    const deck_id = deckIdForSpace(space);
    if (space === undefined || deck_id === null) {
      return {
        card_decks: state.card_decks,
        pending_card_resolution: null,
        events: []
      };
    }

    const deck = state.card_decks.find((candidate) => candidate.deck_id === deck_id);
    const card_id = deck?.card_ids[0];
    const card = card_id === undefined ? undefined : cardDefinition(deck_id, card_id);
    if (deck === undefined || card === undefined) {
      throw new Error(`Missing ${deck_id} card deck state`);
    }

    const next_card_ids = [...deck.card_ids.slice(1), card.card_id];
    const card_decks = state.card_decks.map((candidate) =>
      candidate.deck_id === deck_id ? { ...candidate, card_ids: next_card_ids } : candidate
    );
    const pending_card_resolution: EvanopolisPendingCardResolution = {
      deck_id,
      card_id: card.card_id,
      player_id,
      space_id: space.space_id,
      effect: card.effect
    };
    return {
      card_decks,
      pending_card_resolution,
      events: [
        {
          type: "card_drawn",
          player_id,
          space_id: space.space_id,
          deck_id,
          card_id: card.card_id
        }
      ]
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

const EvanopolisCardDecks: readonly EvanopolisCardDeckDefinition[] = [
  {
    deck_id: "luck",
    labels: {
      en: "Luck",
      es: "Suerte",
      pt_br: "Sorte"
    },
    cards: [
      {
        card_id: "luck_mining_bonus",
        deck_id: "luck",
        labels: {
          en: "Mining bonus. Receive 2 EVA.",
          es: "Bono de minería. Cobra 2 EVA.",
          pt_br: "Bonus de mineração. Receba 2 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: 2
        }
      },
      {
        card_id: "luck_unexpected_client",
        deck_id: "luck",
        labels: {
          en: "Unexpected client. Receive 1 EVA.",
          es: "Cliente inesperado. Cobra 1 EVA.",
          pt_br: "Cliente inesperado. Receba 1 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: 1
        }
      },
      {
        card_id: "luck_market_rally",
        deck_id: "luck",
        labels: {
          en: "Market rally. Receive 3 EVA.",
          es: "Subida del mercado. Cobra 3 EVA.",
          pt_br: "Alta do mercado. Receba 3 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: 3
        }
      }
    ]
  },
  {
    deck_id: "destiny",
    labels: {
      en: "Destiny",
      es: "Destino",
      pt_br: "Destino"
    },
    cards: [
      {
        card_id: "destiny_operating_tax",
        deck_id: "destiny",
        labels: {
          en: "Operating tax. Pay 2 EVA.",
          es: "Impuesto operativo. Paga 2 EVA.",
          pt_br: "Imposto operacional. Pague 2 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: -2
        }
      },
      {
        card_id: "destiny_urgent_maintenance",
        deck_id: "destiny",
        labels: {
          en: "Urgent maintenance. Pay 1 EVA.",
          es: "Mantenimiento urgente. Paga 1 EVA.",
          pt_br: "Manutenção urgente. Pague 1 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: -1
        }
      },
      {
        card_id: "destiny_favorable_market",
        deck_id: "destiny",
        labels: {
          en: "Favorable market. Receive 2 EVA.",
          es: "Mercado favorable. Cobra 2 EVA.",
          pt_br: "Mercado favorável. Receba 2 EVA."
        },
        effect: {
          type: "eva_delta",
          amount_eva: 2
        }
      }
    ]
  }
];

function spaceAt(position: number): EvanopolisBoardSpace | undefined {
  return buildEvanopolisBoardV1().find((space) => space.index === position);
}

function deckIdForSpace(space: EvanopolisBoardSpace | undefined): EvanopolisCardDeckId | null {
  if (space?.kind === "luck") {
    return "luck";
  }
  if (space?.kind === "destiny") {
    return "destiny";
  }
  return null;
}

function cardDefinition(
  deck_id: EvanopolisCardDeckId,
  card_id: string
): EvanopolisCardDefinition | undefined {
  return EvanopolisCardDecks
    .find((deck) => deck.deck_id === deck_id)
    ?.cards.find((card) => card.card_id === card_id);
}

function createInitialCardDecks(random_seed: string): readonly EvanopolisCardDeckState[] {
  return EvanopolisCardDecks.map((deck) => ({
    deck_id: deck.deck_id,
    card_ids: shuffleStrings(
      deck.cards.map((card) => card.card_id),
      `${random_seed}:${deck.deck_id}`
    )
  }));
}

function shuffleStrings(values: readonly string[], seed: string): readonly string[] {
  const shuffled = values.slice();
  const random = seededRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap_index = Math.floor(random() * (index + 1));
    const current_value = shuffled[index];
    const swap_value = shuffled[swap_index];
    assertDefined(current_value, "current shuffle value");
    assertDefined(swap_value, "swap shuffle value");
    shuffled[index] = swap_value;
    shuffled[swap_index] = current_value;
  }
  return shuffled;
}

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function assertDefined<T>(value: T | undefined, label: string): asserts value is T {
  if (value === undefined) {
    throw new Error(`Missing ${label}`);
  }
}

function randomDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10;
}
