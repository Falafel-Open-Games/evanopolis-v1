import type {
  CommandEnvelope,
  MatchEvent,
  MatchContext,
  RulesAdapter,
  RulesCommandOutcome,
  RulesInitialStateOptions
} from "../multiplayer-core/types.js";
import { buildEvanopolisBoardV1, EvanopolisBoardSize, type EvanopolisBoardSpace } from "./board-v1.js";
import {
  canOrderAnyDevelopment,
  deliverDevelopmentOrdersForPlayer,
  developmentLevelForSpace,
  nextDevelopmentOrderForSpace,
  spaceById,
  type EvanopolisDevelopmentKind,
  type EvanopolisDevelopmentOrder,
  type EvanopolisTerrainDevelopment,
  type EvanopolisTerrainOwnership
} from "./development-orders.js";

export const EvanopolisStartingBalanceEva = 50;
const SalidaPassRewardEva = 2;
const SalidaExactLandingRewardEva = 3;
const SalidaJackpotFreeRollReward = 1;

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

interface EvanopolisImporterCommission {
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
      dice_roll_count: 0,
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
      special_property_ownership: [],
      terrain_developments: [],
      development_orders: [],
      next_development_order_index: 1,
      pending_rent: null,
      pending_card_resolution: null,
      dice: null,
      jailed_player_ids: []
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
    if (command.type === "request_purchase_special_property") {
      return this.handlePurchaseSpecialProperty(state, command);
    }
    if (command.type === "request_order_development") {
      return this.handleOrderDevelopment(state, command, context);
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
      dice_roll_count: state.dice_roll_count,
      room_buy_in_eva: state.room_buy_in_eva,
      has_rolled_current_turn: state.has_rolled_current_turn,
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
      special_property_ownership: state.special_property_ownership,
      terrain_developments: state.terrain_developments,
      development_orders: state.development_orders,
      pending_rent: state.pending_rent,
      pending_card_resolution: state.pending_card_resolution,
      dice: state.dice,
      jailed_player_ids: state.jailed_player_ids ?? [],
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
    if (this.isPlayerJailed(state, active_player.player_id)) {
      return {
        accepted: false,
        reason: "player_jailed"
      };
    }

    const dice = this.rollDice(state.random_seed, state.dice_roll_count);
    const from_position = active_player.position;
    const to_position = (active_player.position + dice.total) % EvanopolisBoardSize;
    const start_reward_eva = this.startRewardForMove(from_position, dice.total);
    const pending_rent = this.pendingRentForLanding(state, active_player.player_id, to_position);
    const card_draw = this.drawCardForLanding(state, active_player.player_id, to_position);
    const jail_event: MatchEvent[] = spaceAt(to_position)?.kind === "jail"
      ? [
        {
          type: "player_jailed",
          player_id: active_player.player_id,
          space_id: "jail",
          skip_turns: 1
        }
      ]
      : [];
    const moved_players = state.players.map((player) => {
      if (player.player_id !== active_player.player_id) {
        return player;
      }
      return {
        ...player,
        position: to_position
      };
    });
    const players = start_reward_eva > 0
      ? this.creditPlayer(moved_players, active_player.player_id, start_reward_eva)
      : moved_players;
    const start_reward_events: MatchEvent[] = start_reward_eva > 0
      ? [
        {
          type: "start_bonus_collected",
          player_id: active_player.player_id,
          from_position,
          to_position,
          amount_eva: start_reward_eva,
          jackpot_free_rolls_awarded: SalidaJackpotFreeRollReward,
          exact_landing: to_position === 0
        }
      ]
      : [];

    return {
      accepted: true,
      state: {
        ...state,
        dice_roll_count: state.dice_roll_count + 1,
        has_rolled_current_turn: true,
        players,
        card_decks: card_draw.card_decks,
        pending_rent,
        pending_card_resolution: card_draw.pending_card_resolution,
        dice,
        jailed_player_ids: jail_event.length > 0
          ? this.addJailedPlayer(state, active_player.player_id)
          : state.jailed_player_ids ?? []
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
        ...start_reward_events,
        ...jail_event,
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

  private handlePurchaseSpecialProperty(
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
    if (space?.kind !== "special_property") {
      return {
        accepted: false,
        reason: "space_not_special_property"
      };
    }
    if (this.ownerForSpecialProperty(state, space.space_id) !== undefined) {
      return {
        accepted: false,
        reason: "special_property_already_owned"
      };
    }

    const price_eva = space.purchase_price_eva ?? 0;
    if (active_player.eva_balance < price_eva) {
      return {
        accepted: false,
        reason: "insufficient_eva"
      };
    }
    assertDefined(space.special_property_id, "special property id");

    const ownership: EvanopolisSpecialPropertyOwnership = {
      space_id: space.space_id,
      owner_player_id: active_player.player_id
    };

    return {
      accepted: true,
      state: {
        ...state,
        players: this.debitPlayer(state.players, active_player.player_id, price_eva),
        special_property_ownership: [...state.special_property_ownership, ownership]
      },
      events: [
        {
          type: "special_property_purchased",
          player_id: active_player.player_id,
          space_id: space.space_id,
          special_property_id: space.special_property_id,
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

  private handleOrderDevelopment(
    state: EvanopolisMatchState,
    command: CommandEnvelope,
    context: MatchContext
  ): RulesCommandOutcome<EvanopolisMatchState> {
    const player = state.players.find((candidate) => candidate.player_id === command.player_id);
    if (player === undefined) {
      return {
        accepted: false,
        reason: "invalid_player_id"
      };
    }
    if (player.status !== "active") {
      return {
        accepted: false,
        reason: "player_game_over"
      };
    }
    if (this.isPlayerInOwnPostRollPhase(state, player.player_id)) {
      return {
        accepted: false,
        reason: "post_roll_resolution_required"
      };
    }
    const space_id = command.payload.space_id;
    if (typeof space_id !== "string" || space_id.trim() === "") {
      return {
        accepted: false,
        reason: "invalid_payload"
      };
    }

    const space = spaceById(space_id);
    if (space?.kind !== "terrain") {
      return {
        accepted: false,
        reason: "space_not_terrain"
      };
    }
    if (this.ownerForSpace(state, space.space_id) !== player.player_id) {
      return {
        accepted: false,
        reason: "property_not_owned"
      };
    }

    const next_order = nextDevelopmentOrderForSpace(
      state.terrain_developments,
      state.development_orders,
      player.player_id,
      space
    );
    if (next_order === null) {
      return {
        accepted: false,
        reason: "development_maxed"
      };
    }
    if (player.eva_balance < next_order.price_eva) {
      return {
        accepted: false,
        reason: "insufficient_eva"
      };
    }

    const order: EvanopolisDevelopmentOrder = {
      order_id: `order_${state.next_development_order_index}`,
      player_id: player.player_id,
      space_id: space.space_id,
      development_kind: next_order.development_kind,
      price_eva: next_order.price_eva,
      target_level: next_order.target_level,
      created_revision: context.revision + 1
    };
    const commissions = this.importerCommissionsForOrder(state, order.price_eva);

    return {
      accepted: true,
      state: {
        ...state,
        players: this.applyImporterCommissions(
          this.debitPlayer(state.players, player.player_id, order.price_eva),
          commissions
        ),
        development_orders: [...state.development_orders, order],
        next_development_order_index: state.next_development_order_index + 1
      },
      events: [
        {
          type: "development_ordered",
          player_id: order.player_id,
          order_id: order.order_id,
          space_id: order.space_id,
          development_kind: order.development_kind,
          price_eva: order.price_eva,
          target_level: order.target_level
        },
        ...commissions.map((commission) => ({
          type: "special_property_commission_collected",
          player_id: commission.owner_player_id,
          source_player_id: order.player_id,
          order_id: order.order_id,
          space_id: order.space_id,
          amount_eva: commission.amount_eva,
          commission_rate: commission.rate
        }))
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
    if (state.pending_card_resolution !== null) {
      return this.handleAcceptCardGameOver(state, active_player);
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
    const terrain_ownership = this.transferTerrainOwnership(
      state.terrain_ownership,
      active_player.player_id,
      unpaid_rent.owner_player_id
    );
    const special_property_ownership = this.transferSpecialPropertyOwnership(
      state.special_property_ownership,
      active_player.player_id,
      unpaid_rent.owner_player_id
    );
    const delivery = deliverDevelopmentOrdersForPlayer(
      terrain_ownership,
      state.terrain_developments,
      state.development_orders,
      players[next_player_index]?.player_id ?? ""
    );
    const delivered_players = this.applyDevelopmentRefunds(players, delivery.refunds);
    const next_player = delivered_players[next_player_index];
    const active_players = this.activePlayers(delivered_players);
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
        players: delivered_players,
        terrain_ownership,
        special_property_ownership,
        terrain_developments: delivery.terrain_developments,
        development_orders: delivery.development_orders,
        pending_rent: null,
        pending_card_resolution: null
      },
      events: [...events, ...delivery.events]
    };
  }

  private handleAcceptCardGameOver(
    state: EvanopolisMatchState,
    active_player: EvanopolisPlayerState
  ): RulesCommandOutcome<EvanopolisMatchState> {
    const pending_card = state.pending_card_resolution;
    assertDefined(pending_card, "pending card resolution");
    if (pending_card.player_id !== active_player.player_id) {
      return {
        accepted: false,
        reason: "card_not_pending_for_player"
      };
    }
    if (this.canAffordCardEffect(active_player, pending_card)) {
      return {
        accepted: false,
        reason: "card_can_be_resolved"
      };
    }

    const players = this.markPlayerGameOver(state.players, active_player.player_id);
    const next_player_index = this.nextActivePlayerIndex(players, state.active_player_index);
    const delivery = deliverDevelopmentOrdersForPlayer(
      state.terrain_ownership,
      state.terrain_developments,
      state.development_orders,
      players[next_player_index]?.player_id ?? ""
    );
    const delivered_players = this.applyDevelopmentRefunds(players, delivery.refunds);
    const next_player = delivered_players[next_player_index];
    const active_players = this.activePlayers(delivered_players);
    const events: MatchEvent[] = [
      {
        type: "player_eliminated",
        player_id: active_player.player_id,
        reason: "insufficient_card_eva",
        space_id: pending_card.space_id,
        deck_id: pending_card.deck_id,
        card_id: pending_card.card_id,
        amount_eva: pending_card.effect.amount_eva,
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
        players: delivered_players,
        terrain_developments: delivery.terrain_developments,
        development_orders: delivery.development_orders,
        pending_card_resolution: null
      },
      events: [...events, ...delivery.events]
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
    if (!this.canAffordCardEffect(active_player, pending_card)) {
      return {
        accepted: false,
        reason: "insufficient_eva"
      };
    }

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
    const active_player_is_jailed = this.isPlayerJailed(state, active_player.player_id);
    if (!state.has_rolled_current_turn && !active_player_is_jailed) {
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

    const active_player_serves_jail_sentence = active_player_is_jailed && !state.has_rolled_current_turn;
    const next_player_index = this.nextActivePlayerIndex(state.players, state.active_player_index);
    const delivery = deliverDevelopmentOrdersForPlayer(
      state.terrain_ownership,
      state.terrain_developments,
      state.development_orders,
      state.players[next_player_index]?.player_id ?? ""
    );
    const delivered_players = this.applyDevelopmentRefunds(state.players, delivery.refunds);
    const next_player = delivered_players[next_player_index];
    const served_sentence_events: MatchEvent[] = active_player_serves_jail_sentence
      ? [
        {
          type: "jail_sentence_served",
          player_id: active_player.player_id,
          space_id: "jail"
        }
      ]
      : [];
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
        has_rolled_current_turn: false,
        players: delivered_players,
        terrain_developments: delivery.terrain_developments,
        development_orders: delivery.development_orders,
        jailed_player_ids: active_player_serves_jail_sentence
          ? this.removeJailedPlayer(state, active_player.player_id)
          : state.jailed_player_ids ?? []
      },
      events: [...served_sentence_events, event, ...delivery.events]
    };
  }

  private availableActions(state: EvanopolisMatchState, context: MatchContext, player_id?: string): string[] {
    if (context.phase !== "active") {
      return [];
    }
    const local_player = state.players.find((player) => player.player_id === player_id);
    if (local_player === undefined || local_player.status !== "active") {
      return [];
    }
    if (this.activePlayers(state.players).length <= 1) {
      return [];
    }
    const portfolio_actions = this.canOrderAnyDevelopment(state, local_player.player_id)
      ? ["request_order_development"]
      : [];

    const active_player = state.players[state.active_player_index];
    if (active_player === undefined || active_player.player_id !== player_id || active_player.status !== "active") {
      return portfolio_actions;
    }
    if (!state.has_rolled_current_turn && this.isPlayerJailed(state, active_player.player_id)) {
      return ["request_end_turn"];
    }
    if (state.has_rolled_current_turn) {
      if (state.pending_card_resolution?.player_id === active_player.player_id) {
        if (!this.canAffordCardEffect(active_player, state.pending_card_resolution)) {
          return ["request_accept_game_over"];
        }
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
      if (
        space?.kind === "special_property"
        && this.ownerForSpecialProperty(state, space.space_id) === undefined
        && active_player.eva_balance >= (space.purchase_price_eva ?? 0)
      ) {
        actions.push("request_purchase_special_property");
      }
      actions.push("request_end_turn");
      return actions;
    }
    return [...portfolio_actions, "request_roll"];
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

  private isPlayerJailed(state: EvanopolisMatchState, player_id: string): boolean {
    return (state.jailed_player_ids ?? []).includes(player_id);
  }

  private addJailedPlayer(state: EvanopolisMatchState, player_id: string): readonly string[] {
    const jailed_player_ids = state.jailed_player_ids ?? [];
    if (jailed_player_ids.includes(player_id)) {
      return jailed_player_ids;
    }

    return [...jailed_player_ids, player_id];
  }

  private removeJailedPlayer(state: EvanopolisMatchState, player_id: string): readonly string[] {
    return (state.jailed_player_ids ?? []).filter((jailed_player_id) => jailed_player_id !== player_id);
  }

  private ownerForSpace(state: EvanopolisMatchState, space_id: string): string | undefined {
    return state.terrain_ownership.find((ownership) => ownership.space_id === space_id)?.owner_player_id;
  }

  private ownerForSpecialProperty(state: EvanopolisMatchState, space_id: string): string | undefined {
    return state.special_property_ownership.find((ownership) => ownership.space_id === space_id)?.owner_player_id;
  }

  private startRewardForMove(from_position: number, dice_total: number): number {
    if (from_position + dice_total < EvanopolisBoardSize) {
      return 0;
    }
    if ((from_position + dice_total) % EvanopolisBoardSize === 0) {
      return SalidaExactLandingRewardEva;
    }

    return SalidaPassRewardEva;
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

  private canAffordCardEffect(
    player: EvanopolisPlayerState,
    pending_card: EvanopolisPendingCardResolution
  ): boolean {
    if (pending_card.effect.type === "eva_delta" && pending_card.effect.amount_eva < 0) {
      return player.eva_balance >= Math.abs(pending_card.effect.amount_eva);
    }

    return true;
  }

  private markPlayerGameOver(
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

  private transferSpecialPropertyOwnership(
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

  private applyDevelopmentRefunds(
    players: readonly EvanopolisPlayerState[],
    refunds: readonly { readonly player_id: string; readonly amount_eva: number }[]
  ): EvanopolisPlayerState[] {
    return refunds.reduce(
      (next_players, refund) => this.creditPlayer(next_players, refund.player_id, refund.amount_eva),
      players.slice()
    );
  }

  private isPlayerInOwnPostRollPhase(state: EvanopolisMatchState, player_id: string): boolean {
    const active_player = state.players[state.active_player_index];
    return active_player?.player_id === player_id && state.has_rolled_current_turn;
  }

  private canOrderAnyDevelopment(state: EvanopolisMatchState, player_id: string): boolean {
    const player = state.players.find((candidate) => candidate.player_id === player_id);
    if (player === undefined || player.status !== "active") {
      return false;
    }
    if (this.isPlayerInOwnPostRollPhase(state, player_id)) {
      return false;
    }
    return canOrderAnyDevelopment(
      state.terrain_ownership,
      state.terrain_developments,
      state.development_orders,
      player_id,
      player.eva_balance
    );
  }

  private importerCommissionsForOrder(
    state: EvanopolisMatchState,
    price_eva: number
  ): EvanopolisImporterCommission[] {
    const importer_1_owners = this.specialPropertyOwnersById(state, "importer_1");
    const importer_2_owners = this.specialPropertyOwnersById(state, "importer_2");
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

  private applyImporterCommissions(
    players: readonly EvanopolisPlayerState[],
    commissions: readonly EvanopolisImporterCommission[]
  ): EvanopolisPlayerState[] {
    return commissions.reduce(
      (next_players, commission) => this.creditPlayer(next_players, commission.owner_player_id, commission.amount_eva),
      players.slice()
    );
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

    const rent_eva = this.effectiveRentForTerrain(state, space.space_id, owner_player_id);
    return {
      space_id: space.space_id,
      payer_player_id: active_player_id,
      owner_player_id,
      rent_eva
    };
  }

  private effectiveRentForTerrain(
    state: EvanopolisMatchState,
    space_id: string,
    owner_player_id: string
  ): number {
    const space = spaceById(space_id);
    if (space?.kind !== "terrain") {
      throw new Error(`Missing terrain for rent ${space_id}`);
    }

    const base_rent = this.baseRentForTerrain(state, space_id);
    const special_multiplier = this.specialPropertyRentMultiplier(state, owner_player_id);
    const monopoly_multiplier = this.hasFullLevelFiveCityMonopoly(state, owner_player_id, space.group_id) ? 2 : 1;
    return roundTenths(base_rent * special_multiplier * monopoly_multiplier);
  }

  private specialPropertyRentMultiplier(state: EvanopolisMatchState, owner_player_id: string): number {
    return 1 + this.specialPropertyRentBonus(state, owner_player_id);
  }

  private specialPropertyRentBonus(state: EvanopolisMatchState, owner_player_id: string): number {
    let bonus = 0;
    const owns_substation_1 = this.playerOwnsSpecialProperty(state, owner_player_id, "substation_1");
    const owns_substation_2 = this.playerOwnsSpecialProperty(state, owner_player_id, "substation_2");
    if (owns_substation_1 && owns_substation_2) {
      bonus += 0.3;
    } else if (owns_substation_1 || owns_substation_2) {
      bonus += 0.1;
    }
    if (this.playerOwnsSpecialProperty(state, owner_player_id, "private_workshop")) {
      bonus += 0.1;
    }
    if (this.playerOwnsSpecialProperty(state, owner_player_id, "cooling_plant")) {
      bonus += 0.1;
    }

    return bonus;
  }

  private playerOwnsSpecialProperty(
    state: EvanopolisMatchState,
    owner_player_id: string,
    special_property_id: string
  ): boolean {
    return this.specialPropertyOwnersById(state, special_property_id).includes(owner_player_id);
  }

  private specialPropertyOwnersById(state: EvanopolisMatchState, special_property_id: string): string[] {
    return state.special_property_ownership.flatMap((ownership) => {
      const space = spaceById(ownership.space_id);
      if (space?.kind !== "special_property" || space.special_property_id !== special_property_id) {
        return [];
      }
      return [ownership.owner_player_id];
    });
  }

  private baseRentForTerrain(state: EvanopolisMatchState, space_id: string): number {
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

  private hasFullLevelFiveCityMonopoly(
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
      this.ownerForSpace(state, space.space_id) === owner_player_id
      && developmentLevelForSpace(state.terrain_developments, space.space_id) === 5
    ));
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

  private rollDice(random_seed: string, dice_roll_count: number): EvanopolisDiceState {
    const die_1 = deterministicDie(random_seed, dice_roll_count, 1);
    const die_2 = deterministicDie(random_seed, dice_roll_count, 2);
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

function assertDefined<T>(value: T | null | undefined, label: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${label}`);
  }
}

function deterministicDie(random_seed: string, dice_roll_count: number, die_index: number): number {
  return Math.floor(seededRandom(`${random_seed}:dice:${dice_roll_count}:${die_index}`)() * 6) + 1;
}

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10;
}
