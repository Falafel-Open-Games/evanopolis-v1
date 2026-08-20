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

type EvanopolisJoinMessage = {
  readonly player_count?: unknown;
  readonly room_buy_in_eva?: unknown;
  readonly [key: string]: unknown;
};

type EvanopolisMatchSession = MatchSession<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>;

export function parseEvanopolisJoinConfiguration(
  message: EvanopolisJoinMessage,
  existing_match: EvanopolisMatchSession | undefined
): ParsedJoinConfiguration | string {
  const player_count_result = parsePlayerCount(message.player_count);
  if (typeof player_count_result === "string") {
    return player_count_result;
  }
  const room_buy_in_result = parseRoomBuyInEva(message.room_buy_in_eva);
  if (typeof room_buy_in_result === "string") {
    return room_buy_in_result;
  }

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

  return {
    player_count,
    initial_state_options: { room_buy_in_eva },
    log_fields: { room_buy_in_eva }
  };
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
