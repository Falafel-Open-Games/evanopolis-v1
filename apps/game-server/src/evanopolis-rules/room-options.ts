import type { MatchSession } from "../multiplayer-core/match-session.js";
import type { ParsedJoinConfiguration } from "../multiplayer-core/websocket-server.js";
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
  readonly player_count?: unknown;
  readonly room_buy_in_eva?: unknown;
  readonly random_seed?: unknown;
  readonly [key: string]: unknown;
};

type EvanopolisMatchSession = MatchSession<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>;
type JoinModeParseResult = { readonly mode: "free_play" | "paid_room" } | string;
type RandomSeedParseResult = { readonly random_seed: string } | string | undefined;

export function parseEvanopolisJoinConfiguration(
  message: EvanopolisJoinMessage,
  existing_match: EvanopolisMatchSession | undefined
): ParsedJoinConfiguration | string {
  const join_mode_result = parseJoinMode(message.mode);
  if (typeof join_mode_result === "string") {
    return join_mode_result;
  }
  if (join_mode_result.mode === "paid_room") {
    const auth_token_result = parseAuthToken(message.auth_token);
    if (typeof auth_token_result === "string") {
      return auth_token_result;
    }
    return "production_admission_required";
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
