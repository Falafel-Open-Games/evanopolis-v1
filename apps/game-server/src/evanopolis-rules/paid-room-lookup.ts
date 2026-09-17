// ---
// summary: Fetches and validates paid-room metadata from the Rooms API.
// ---

export interface PaidRoomRecord {
  readonly game_id: string;
  readonly creator_display_name: string;
  readonly entry_fee_tier: "cheap" | "average" | "deluxe";
  readonly entry_fee_amount: string;
  readonly player_count: 2 | 3 | 4;
  readonly created_at: string;
}

export async function lookupPaidRoom(
  rooms_api_base_url: string,
  game_id: string
): Promise<PaidRoomRecord | string> {
  let room_url: URL;
  try {
    room_url = new URL(`/v0/rooms/${encodeURIComponent(game_id)}`, rooms_api_base_url);
  } catch {
    return "invalid_rooms_api_url";
  }

  let response: Response;
  try {
    response = await fetch(room_url);
  } catch {
    return "rooms_api_unavailable";
  }

  if (response.status === 404) {
    return "room_not_found";
  }
  if (!response.ok) {
    return "rooms_api_unavailable";
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return "invalid_room_response";
  }

  return parsePaidRoomRecord(body);
}

export function configuredRoomsApiUrl(): string | undefined {
  const value = process.env.EVANOPOLIS_ROOMS_API_URL?.trim();
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}

function parsePaidRoomRecord(value: unknown): PaidRoomRecord | string {
  if (typeof value !== "object" || value === null) {
    return "invalid_room_response";
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.game_id !== "string"
    || typeof record.creator_display_name !== "string"
    || !isEntryFeeTier(record.entry_fee_tier)
    || typeof record.entry_fee_amount !== "string"
    || !/^[0-9]+$/.test(record.entry_fee_amount)
    || !isPlayerCount(record.player_count)
    || typeof record.created_at !== "string"
  ) {
    return "invalid_room_response";
  }

  return {
    game_id: record.game_id,
    creator_display_name: record.creator_display_name,
    entry_fee_tier: record.entry_fee_tier,
    entry_fee_amount: record.entry_fee_amount,
    player_count: record.player_count,
    created_at: record.created_at
  };
}

function isEntryFeeTier(value: unknown): value is PaidRoomRecord["entry_fee_tier"] {
  return value === "cheap" || value === "average" || value === "deluxe";
}

function isPlayerCount(value: unknown): value is PaidRoomRecord["player_count"] {
  return value === 2 || value === 3 || value === 4;
}
