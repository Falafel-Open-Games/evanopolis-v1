/*
 * Multiplayer-core adapter for the Evanopolis V1 ruleset.
 * Owns command dispatch, validation flow, public definitions, and public snapshots.
 */

import type {
  CommandEnvelope,
  MatchEvent,
  MatchContext,
  RulesAdapter,
  RulesCommandOutcome,
  RulesInitialStateOptions
} from "../multiplayer-core/types.js";
import { buildEvanopolisBoardV1, EvanopolisBoardSize, spaceAt } from "./board-v1.js";
import {
  createInitialCardDecks,
  buildEvanopolisCardDecks,
  drawCardForLanding
} from "./cards.js";
import { rollDice } from "./dice.js";
import {
  deliverDevelopmentOrdersForPlayer,
  nextDevelopmentOrderForSpace,
  spaceById,
  type EvanopolisDevelopmentOrder,
  type EvanopolisTerrainOwnership
} from "./development-orders.js";
import {
  applyImporterCommissions,
  importerCommissionsForOrder,
  ownerForSpace,
  ownerForSpecialProperty,
  pendingRentForLanding,
  transferSpecialPropertyOwnership,
  transferTerrainOwnership
} from "./economy.js";
import type {
  EvanopolisDefinition,
  EvanopolisMatchState,
  EvanopolisPlayerState,
  EvanopolisSnapshot,
  EvanopolisSpecialPropertyOwnership
} from "./evanopolis-state.js";
import { EvanopolisStartingBalanceEva } from "./evanopolis-state.js";
import {
  economyProfileForTier,
  initialBankReserveForMatch,
  initialJackpotForMatch,
  type EvanopolisEntryFeeTier
} from "./economy-profile.js";
import { EvaMicroUnitsPerEva, evaMicroFromDecimal, formatEvaMicro } from "./eva-money.js";
import {
  applyCardEffect,
  applyDevelopmentRefunds,
  canAffordCardEffect,
  creditPlayer,
  debitPlayer,
  markPlayerGameOver,
  transferBetweenPlayers,
  transferGameOverAssets
} from "./player-ledger.js";
import { assertDefined } from "./rule-utils.js";
import {
  activePlayers,
  addJailedPlayer,
  availableActions,
  isPlayerInOwnPostRollPhase,
  isPlayerJailed,
  nextActivePlayerIndex,
  removeJailedPlayer,
  startRewardMicroForMove,
  winnerPlayerId
} from "./turn-state.js";

const SalidaJackpotFreeRollReward = 1;

export { EvanopolisStartingBalanceEva };
export type {
  EvanopolisCardDeckDefinition,
  EvanopolisCardDeckId,
  EvanopolisCardDeckState,
  EvanopolisCardDefinition,
  EvanopolisCardEffect,
  EvanopolisCardEffectType,
  EvanopolisDefinition,
  EvanopolisMatchState,
  EvanopolisPendingCardResolution,
  EvanopolisPendingRent,
  EvanopolisPlayerStatus,
  EvanopolisSnapshot
} from "./evanopolis-state.js";

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
    const entry_fee_tier = parseInitialEntryFeeTier(options.entry_fee_tier);
    const economy_profile = entry_fee_tier === null ? null : economyProfileForTier(entry_fee_tier);
    const ticket_micro = economy_profile?.ticket_micro ?? evaMicroFromDecimal(String(room_buy_in_eva));
    if (options.ticket_micro !== undefined && Number(options.ticket_micro) !== ticket_micro) {
      throw new Error(`Ticket micro amount does not match ${entry_fee_tier ?? "legacy"} economy`);
    }
    const player_starting_balance_micro = economy_profile?.player_starting_balance_micro ?? ticket_micro;
    const raw_eva_scale_micro = economy_profile?.raw_eva_scale_micro ?? EvaMicroUnitsPerEva;
    const jackpot_balance_micro = economy_profile === null
      ? 0
      : initialJackpotForMatch(economy_profile, player_count);
    const bank_reserve_micro = economy_profile === null
      ? 0
      : initialBankReserveForMatch(economy_profile, player_count);
    const player_starting_balance_eva = Number(formatEvaMicro(player_starting_balance_micro));
    return {
      match_id,
      random_seed,
      dice_roll_count: 0,
      room_buy_in_eva,
      entry_fee_tier,
      ticket_micro,
      player_starting_balance_micro,
      raw_eva_scale_micro,
      jackpot_balance_micro,
      bank_reserve_micro,
      active_player_index: 0,
      has_rolled_current_turn: false,
      players: Array.from({ length: player_count }, (_value, index) => ({
        player_id: `player_${index + 1}`,
        position: 0,
        status: "active",
        eva_balance: player_starting_balance_eva,
        eva_balance_micro: player_starting_balance_micro
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
      entry_fee_tier: state.entry_fee_tier,
      ticket_micro: state.ticket_micro,
      player_starting_balance_micro: state.player_starting_balance_micro,
      raw_eva_scale_micro: state.raw_eva_scale_micro,
      initial_jackpot_balance_micro: state.jackpot_balance_micro,
      initial_bank_reserve_micro: state.bank_reserve_micro,
      spaces: buildEvanopolisBoardV1(state.raw_eva_scale_micro),
      card_decks: buildEvanopolisCardDecks(state.raw_eva_scale_micro)
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
      entry_fee_tier: state.entry_fee_tier,
      ticket_micro: state.ticket_micro,
      jackpot_balance_micro: state.jackpot_balance_micro,
      bank_reserve_micro: state.bank_reserve_micro,
      has_rolled_current_turn: state.has_rolled_current_turn,
      ...(local_player === undefined ? {} : { local_player_id: local_player.player_id }),
      active_player_id: state.players[state.active_player_index]?.player_id ?? "",
      winner_player_id: winnerPlayerId(state),
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
      available_actions: availableActions(state, context, local_player?.player_id),
      recent_events: context.recent_events ?? []
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
    if (isPlayerJailed(state, active_player.player_id)) {
      return {
        accepted: false,
        reason: "player_jailed"
      };
    }

    const dice = rollDice(state.random_seed, state.dice_roll_count);
    const from_position = active_player.position;
    const to_position = (active_player.position + dice.total) % EvanopolisBoardSize;
    const start_reward_micro = startRewardMicroForMove(
      EvanopolisBoardSize,
      from_position,
      dice.total,
      state.raw_eva_scale_micro
    );
    const start_reward_eva = Number(formatEvaMicro(start_reward_micro));
    const pending_rent = pendingRentForLanding(state, active_player.player_id, to_position);
    const card_draw = drawCardForLanding(
      state.card_decks,
      active_player.player_id,
      to_position,
      state.raw_eva_scale_micro
    );
    const jail_event: MatchEvent[] = spaceAt(to_position, state.raw_eva_scale_micro)?.kind === "jail"
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
    const players = start_reward_micro > 0
      ? creditPlayer(moved_players, active_player.player_id, start_reward_micro)
      : moved_players;
    const start_reward_events: MatchEvent[] = start_reward_eva > 0
      ? [
        {
          type: "start_bonus_collected",
          player_id: active_player.player_id,
          from_position,
          to_position,
          amount_eva: start_reward_eva,
          amount_micro: start_reward_micro,
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
          ? addJailedPlayer(state, active_player.player_id)
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

    const space = spaceAt(active_player.position, state.raw_eva_scale_micro);
    if (space?.kind !== "terrain") {
      return {
        accepted: false,
        reason: "space_not_purchasable"
      };
    }
    if (ownerForSpace(state, space.space_id) !== undefined) {
      return {
        accepted: false,
        reason: "property_already_owned"
      };
    }

    const price_eva = space.purchase_price_eva ?? 0;
    const price_micro = space.purchase_price_micro ?? 0;
    if (active_player.eva_balance_micro < price_micro) {
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
        players: debitPlayer(state.players, active_player.player_id, price_micro),
        terrain_ownership: [...state.terrain_ownership, ownership]
      },
      events: [
        {
          type: "property_purchased",
          player_id: active_player.player_id,
          space_id: space.space_id,
          price_eva,
          price_micro
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

    const space = spaceAt(active_player.position, state.raw_eva_scale_micro);
    if (space?.kind !== "special_property") {
      return {
        accepted: false,
        reason: "space_not_special_property"
      };
    }
    if (ownerForSpecialProperty(state, space.space_id) !== undefined) {
      return {
        accepted: false,
        reason: "special_property_already_owned"
      };
    }

    const price_eva = space.purchase_price_eva ?? 0;
    const price_micro = space.purchase_price_micro ?? 0;
    if (active_player.eva_balance_micro < price_micro) {
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
        players: debitPlayer(state.players, active_player.player_id, price_micro),
        special_property_ownership: [...state.special_property_ownership, ownership]
      },
      events: [
        {
          type: "special_property_purchased",
          player_id: active_player.player_id,
          space_id: space.space_id,
          special_property_id: space.special_property_id,
          price_eva,
          price_micro
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
    if (active_player.eva_balance_micro < paid_rent.rent_micro) {
      return {
        accepted: false,
        reason: "insufficient_eva"
      };
    }

    return {
      accepted: true,
      state: {
        ...state,
        players: transferBetweenPlayers(
          state.players,
          paid_rent.payer_player_id,
          paid_rent.owner_player_id,
          paid_rent.rent_micro
        ),
        pending_rent: null
      },
      events: [
        {
          type: "rent_paid",
          payer_player_id: paid_rent.payer_player_id,
          owner_player_id: paid_rent.owner_player_id,
          space_id: paid_rent.space_id,
          rent_eva: paid_rent.rent_eva,
          rent_micro: paid_rent.rent_micro
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
    if (isPlayerInOwnPostRollPhase(state, player.player_id)) {
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

    const space = spaceById(space_id, state.raw_eva_scale_micro);
    if (space?.kind !== "terrain") {
      return {
        accepted: false,
        reason: "space_not_terrain"
      };
    }
    if (ownerForSpace(state, space.space_id) !== player.player_id) {
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
    if (player.eva_balance_micro < next_order.price_micro) {
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
      price_micro: next_order.price_micro,
      target_level: next_order.target_level,
      created_revision: context.revision + 1
    };
    const commissions = importerCommissionsForOrder(state, order.price_micro);

    return {
      accepted: true,
      state: {
        ...state,
        players: applyImporterCommissions(
          debitPlayer(state.players, player.player_id, order.price_micro),
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
          price_micro: order.price_micro,
          target_level: order.target_level
        },
        ...commissions.map((commission) => ({
          type: "special_property_commission_collected",
          player_id: commission.owner_player_id,
          source_player_id: order.player_id,
          order_id: order.order_id,
          space_id: order.space_id,
          amount_eva: commission.amount_eva,
          amount_micro: commission.amount_micro,
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
    if (active_player.eva_balance_micro >= unpaid_rent.rent_micro) {
      return {
        accepted: false,
        reason: "rent_can_be_paid"
      };
    }

    const transferred_balance_eva = active_player.eva_balance;
    const transferred_balance_micro = active_player.eva_balance_micro;
    const transferred_space_ids = state.terrain_ownership
      .filter((ownership) => ownership.owner_player_id === active_player.player_id)
      .map((ownership) => ownership.space_id);
    const players = transferGameOverAssets(
      state.players,
      active_player.player_id,
      unpaid_rent.owner_player_id,
      transferred_balance_micro
    );
    const next_player_index = nextActivePlayerIndex(players, state.active_player_index);
    const terrain_ownership = transferTerrainOwnership(
      state.terrain_ownership,
      active_player.player_id,
      unpaid_rent.owner_player_id
    );
    const special_property_ownership = transferSpecialPropertyOwnership(
      state.special_property_ownership,
      active_player.player_id,
      unpaid_rent.owner_player_id
    );
    const delivery = deliverDevelopmentOrdersForPlayer(
      terrain_ownership,
      state.terrain_developments,
      state.development_orders,
      players[next_player_index]?.player_id ?? "",
      state.raw_eva_scale_micro
    );
    const delivered_players = applyDevelopmentRefunds(players, delivery.refunds);
    const next_player = delivered_players[next_player_index];
    const active_players = activePlayers(delivered_players);
    const events: MatchEvent[] = [
      {
        type: "player_eliminated",
        player_id: active_player.player_id,
        creditor_player_id: unpaid_rent.owner_player_id,
        reason: "insufficient_rent",
        space_id: unpaid_rent.space_id,
        unpaid_rent_eva: unpaid_rent.rent_eva,
        unpaid_rent_micro: unpaid_rent.rent_micro,
        transferred_balance_eva,
        transferred_balance_micro,
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
    if (canAffordCardEffect(active_player, pending_card)) {
      return {
        accepted: false,
        reason: "card_can_be_resolved"
      };
    }

    const players = markPlayerGameOver(state.players, active_player.player_id);
    const next_player_index = nextActivePlayerIndex(players, state.active_player_index);
    const delivery = deliverDevelopmentOrdersForPlayer(
      state.terrain_ownership,
      state.terrain_developments,
      state.development_orders,
      players[next_player_index]?.player_id ?? "",
      state.raw_eva_scale_micro
    );
    const delivered_players = applyDevelopmentRefunds(players, delivery.refunds);
    const next_player = delivered_players[next_player_index];
    const active_players = activePlayers(delivered_players);
    const events: MatchEvent[] = [
      {
        type: "player_eliminated",
        player_id: active_player.player_id,
        reason: "insufficient_card_eva",
        space_id: pending_card.space_id,
        deck_id: pending_card.deck_id,
        card_id: pending_card.card_id,
        amount_eva: pending_card.effect.amount_eva,
        amount_micro: pending_card.effect.amount_micro,
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
    if (!canAffordCardEffect(active_player, pending_card)) {
      return {
        accepted: false,
        reason: "insufficient_eva"
      };
    }

    const players = applyCardEffect(state.players, pending_card);
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
          amount_eva: pending_card.effect.amount_eva,
          amount_micro: pending_card.effect.amount_micro
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
    const active_player_is_jailed = isPlayerJailed(state, active_player.player_id);
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
    const next_player_index = nextActivePlayerIndex(state.players, state.active_player_index);
    const delivery = deliverDevelopmentOrdersForPlayer(
      state.terrain_ownership,
      state.terrain_developments,
      state.development_orders,
      state.players[next_player_index]?.player_id ?? "",
      state.raw_eva_scale_micro
    );
    const delivered_players = applyDevelopmentRefunds(state.players, delivery.refunds);
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
          ? removeJailedPlayer(state, active_player.player_id)
          : state.jailed_player_ids ?? []
      },
      events: [...served_sentence_events, event, ...delivery.events]
    };
  }

}

function parseInitialEntryFeeTier(value: unknown): EvanopolisEntryFeeTier | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (value === "cheap" || value === "average" || value === "deluxe") {
    return value;
  }
  throw new Error(`Invalid initial entry fee tier: ${String(value)}`);
}
