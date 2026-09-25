import type { MatchSession } from "../multiplayer-core/match-session.js";
import type { ParsedJoinConfiguration } from "../multiplayer-core/websocket-server.js";
import { checkPaidAdmission, configuredAuthApiUrl } from "./paid-admission.js";
import { configuredRoomsApiUrl, lookupPaidRoom } from "./paid-room-lookup.js";
import { economyProfileForTier } from "./economy-profile.js";
import { evaMicroFromTokenAtomic, formatEvaMicro } from "./eva-money.js";
import type { EvanopolisDefinition, EvanopolisMatchState, EvanopolisSnapshot } from "./evanopolis-rules-adapter.js";
import { EvanopolisStartingBalanceEva } from "./evanopolis-rules-adapter.js";

const DefaultPlayerCount = 3;
const MinPlayerCount = 2;
const MaxPlayerCount = 4;
const DefaultRoomBuyInEva = EvanopolisStartingBalanceEva;
const MinRoomBuyInEva = 1;
const MaxRoomBuyInEva = 1000;
const MaxRandomSeedLength = 128;

type EvanopolisJoinMessage = {
  readonly mode?: unknown;
  readonly auth_token?: unknown;
  readonly match_id?: unknown;
  readonly player_count?: unknown;
  readonly room_buy_in_eva?: unknown;
  readonly random_seed?: unknown;
  readonly [key: string]: unknown;
};

type EvanopolisMatchSession = MatchSession<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>;
type JoinModeParseResult = { readonly mode: "free_play" | "paid_room" } | string;
type RandomSeedParseResult = { readonly random_seed: string } | string | undefined;

export async function parseEvanopolisJoinConfiguration(
  message: EvanopolisJoinMessage,
  existing_match: EvanopolisMatchSession | undefined
): Promise<ParsedJoinConfiguration | string> {
  const join_mode_result = parseJoinMode(message.mode);
  if (typeof join_mode_result === "string") {
    return join_mode_result;
  }
  if (join_mode_result.mode === "paid_room") {
    if (existing_match !== undefined && existing_match.join_mode !== "paid_room") {
      return "join_mode_mismatch";
    }
    const auth_token_result = parseAuthToken(message.auth_token);
    if (typeof auth_token_result === "string") {
      return auth_token_result;
    }
    const rooms_api_base_url = configuredRoomsApiUrl();
    if (rooms_api_base_url === undefined) {
      return "rooms_api_unconfigured";
    }
    if (typeof message.match_id !== "string") {
      return "invalid_match_id";
    }
    const room_result = await lookupPaidRoom(rooms_api_base_url, message.match_id);
    if (typeof room_result === "string") {
      return room_result;
    }
    if (room_result.game_id !== message.match_id) {
      return "room_mismatch";
    }
    const economy_profile = economyProfileForTier(room_result.entry_fee_tier);
    let ticket_micro: number;
    try {
      ticket_micro = evaMicroFromTokenAtomic(room_result.entry_fee_amount);
    } catch {
      return "invalid_room_response";
    }
    if (ticket_micro !== economy_profile.ticket_micro) {
      return "room_ticket_mismatch";
    }
    if (existing_match !== undefined && existing_match.player_count !== room_result.player_count) {
      return "player_count_mismatch";
    }
    const auth_api_base_url = configuredAuthApiUrl();
    if (auth_api_base_url === undefined) {
      return "auth_api_unconfigured";
    }
    const admission_result = await checkPaidAdmission({
      auth_api_base_url,
      auth_token: auth_token_result.auth_token,
      game_id: room_result.game_id,
      amount: room_result.entry_fee_amount
    });
    if (typeof admission_result === "string") {
      return admission_result;
    }
    return {
      player_count: room_result.player_count,
      join_mode: "paid_room",
      seat_client_id: `wallet:${admission_result.player.toLowerCase()}`,
      initial_state_options: {
        room_buy_in_eva: Number(formatEvaMicro(ticket_micro)),
        entry_fee_tier: room_result.entry_fee_tier,
        ticket_micro
      },
      log_fields: {
        mode: "paid_room",
        entry_fee_tier: room_result.entry_fee_tier,
        entry_fee_amount: room_result.entry_fee_amount,
        admitted_wallet: admission_result.player,
        payment_tx_hash: admission_result.tx_hash
      }
    };
  }

  if (existing_match !== undefined && existing_match.join_mode !== "free_play") {
    return "join_mode_mismatch";
  }

  const player_count_result = parsePlayerCount(message.player_count);
  if (typeof player_count_result === "string") {
    return player_count_result;
  }
  const room_buy_in_result = parseRoomBuyInEva(message.room_buy_in_eva);
  if (typeof room_buy_in_result === "string") {
    return room_buy_in_result;
  }
  const random_seed_result = parseRandomSeed(message.random_seed);
  if (typeof random_seed_result === "string") {
    return random_seed_result;
  }
  if (random_seed_result !== undefined && !allowsClientRandomSeed()) {
    return "client_random_seed_disabled";
  }
  const random_seed = random_seed_result?.random_seed;

  const player_count = player_count_result ?? DefaultPlayerCount;
  const room_buy_in_eva = room_buy_in_result ?? DefaultRoomBuyInEva;
  if (existing_match !== undefined && player_count_result !== undefined && existing_match.player_count !== player_count) {
    return "player_count_mismatch";
  }

  const existing_room_buy_in_eva = Number(
    existing_match?.initial_state_options?.room_buy_in_eva ?? DefaultRoomBuyInEva
  );
  if (
    existing_match !== undefined
    && room_buy_in_result !== undefined
    && existing_room_buy_in_eva !== room_buy_in_eva
  ) {
    return "room_buy_in_mismatch";
  }

  const existing_random_seed = existing_match?.definition().random_seed;
  if (
    existing_match !== undefined
    && random_seed !== undefined
    && existing_random_seed !== random_seed
  ) {
    return "random_seed_mismatch";
  }

  const initial_state_options = random_seed === undefined
    ? { room_buy_in_eva }
    : { room_buy_in_eva, random_seed };

  return {
    player_count,
    initial_state_options,
    log_fields: random_seed === undefined
      ? { room_buy_in_eva }
      : { room_buy_in_eva, random_seed }
  };
}

function parseJoinMode(value: unknown): JoinModeParseResult {
  if (value === undefined) {
    return { mode: "free_play" };
  }
  if (value === "free_play" || value === "paid_room") {
    return { mode: value };
  }
  return "invalid_join_mode";
}

function parseAuthToken(value: unknown): { readonly auth_token: string } | string {
  if (typeof value !== "string" || value.trim() === "") {
    return "missing_auth_token";
  }

  return { auth_token: value };
}

function parsePlayerCount(value: unknown): number | string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return "invalid_player_count";
  }
  if (value < MinPlayerCount || value > MaxPlayerCount) {
    return "invalid_player_count";
  }
  return value;
}

function parseRoomBuyInEva(value: unknown): number | string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return "invalid_room_buy_in";
  }
  if (value < MinRoomBuyInEva || value > MaxRoomBuyInEva) {
    return "invalid_room_buy_in";
  }
  return value;
}

function parseRandomSeed(value: unknown): RandomSeedParseResult {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    return "invalid_random_seed";
  }
  const random_seed = value.trim();
  if (random_seed === "" || random_seed.length > MaxRandomSeedLength) {
    return "invalid_random_seed";
  }
  return { random_seed };
}

function allowsClientRandomSeed(): boolean {
  const value = process.env.EVANOPOLIS_ALLOW_CLIENT_RANDOM_SEED?.trim().toLowerCase();
  return value === "1" || value === "true";
}
