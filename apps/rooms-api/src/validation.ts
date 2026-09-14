import type {
  CreateRoomRequest,
  EntryFeeTier,
  ExperimentalRoomOptions,
  RoomRecord,
  ValidationDetail
} from "./types.js";

export const EntryFeeAmounts: Readonly<Record<EntryFeeTier, string>> = {
  cheap: "100000000000000000",
  average: "500000000000000000",
  deluxe: "1000000000000000000"
};

const EntryFeeTiers = Object.keys(EntryFeeAmounts);

export function parseCreateRoomRequest(value: unknown): {
  readonly ok: true;
  readonly request: CreateRoomRequest;
} | {
  readonly ok: false;
  readonly details: readonly ValidationDetail[];
} {
  if (!isRecord(value)) {
    return invalid("request", "must be an object");
  }

  const extra_keys = Object.keys(value).filter((key) =>
    !["creator_display_name", "entry_fee_tier", "player_count", "experimental"].includes(key)
  );
  if (extra_keys.length > 0) {
    return invalid(extra_keys[0] ?? "request", "is not allowed");
  }

  const details: ValidationDetail[] = [];
  const creator_display_name = typeof value.creator_display_name === "string"
    ? value.creator_display_name.trim()
    : "";
  if (creator_display_name.length < 1 || creator_display_name.length > 32) {
    details.push({
      field: "creator_display_name",
      message: "must be between 1 and 32 characters"
    });
  }

  const entry_fee_tier = value.entry_fee_tier;
  if (!isEntryFeeTier(entry_fee_tier)) {
    details.push({
      field: "entry_fee_tier",
      message: `must be one of ${EntryFeeTiers.join(", ")}`
    });
  }

  const player_count = value.player_count;
  if (player_count !== 2 && player_count !== 3 && player_count !== 4) {
    details.push({
      field: "player_count",
      message: "must be one of 2, 3, or 4"
    });
  }

  const experimental_result = parseExperimental(value.experimental);
  if (!experimental_result.ok) {
    details.push(...experimental_result.details);
  }

  if (!experimental_result.ok) {
    return {
      ok: false,
      details
    };
  }

  if (details.length > 0 || !isEntryFeeTier(entry_fee_tier) || !isPlayerCount(player_count)) {
    return {
      ok: false,
      details
    };
  }

  return {
    ok: true,
    request: {
      creator_display_name,
      entry_fee_tier,
      player_count,
      ...(experimental_result.experimental === undefined ? {} : { experimental: experimental_result.experimental })
    }
  };
}

export function isRoomRecord(value: unknown): value is RoomRecord {
  if (!isRecord(value)) {
    return false;
  }
  if (
    typeof value.game_id !== "string"
    || !isUuid(value.game_id)
    || typeof value.created_by !== "string"
    || value.created_by.length < 1
    || typeof value.creator_display_name !== "string"
    || value.creator_display_name.trim().length < 1
    || value.creator_display_name.trim().length > 32
    || !isEntryFeeTier(value.entry_fee_tier)
    || typeof value.entry_fee_amount !== "string"
    || !/^[0-9]+$/.test(value.entry_fee_amount)
    || !isPlayerCount(value.player_count)
    || typeof value.created_at !== "string"
    || Number.isNaN(Date.parse(value.created_at))
  ) {
    return false;
  }

  const experimental = parseExperimental(value.experimental);
  return experimental.ok;
}

function parseExperimental(value: unknown): {
  readonly ok: true;
  readonly experimental?: ExperimentalRoomOptions;
} | {
  readonly ok: false;
  readonly details: readonly ValidationDetail[];
} {
  if (value === undefined) {
    return { ok: true };
  }
  if (!isRecord(value)) {
    return {
      ok: false,
      details: [{ field: "experimental", message: "must be an object" }]
    };
  }

  const extra_keys = Object.keys(value).filter((key) => key !== "turn_duration_seconds");
  if (extra_keys.length > 0) {
    return {
      ok: false,
      details: [{ field: `experimental.${extra_keys[0] ?? "unknown"}`, message: "is not allowed" }]
    };
  }

  if (value.turn_duration_seconds === undefined) {
    return {
      ok: true,
      experimental: {}
    };
  }

  if (
    typeof value.turn_duration_seconds !== "number"
    || !Number.isInteger(value.turn_duration_seconds)
    || value.turn_duration_seconds <= 0
  ) {
    return {
      ok: false,
      details: [{ field: "experimental.turn_duration_seconds", message: "must be a positive integer" }]
    };
  }

  return {
    ok: true,
    experimental: {
      turn_duration_seconds: value.turn_duration_seconds
    }
  };
}

function invalid(field: string, message: string): {
  readonly ok: false;
  readonly details: readonly ValidationDetail[];
} {
  return {
    ok: false,
    details: [{ field, message }]
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntryFeeTier(value: unknown): value is EntryFeeTier {
  return value === "cheap" || value === "average" || value === "deluxe";
}

function isPlayerCount(value: unknown): value is 2 | 3 | 4 {
  return value === 2 || value === 3 || value === 4;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
