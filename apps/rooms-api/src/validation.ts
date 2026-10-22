import type {
  CreateRoomRequest,
  EntryFeeTier,
  ExperimentalRoomOptions,
  PlayerCount,
  RoomRecord,
  ValidationDetail
} from "./types.js";

type PresetEntryFeeTier = Exclude<EntryFeeTier, "custom">;

export const EntryFeeAmounts: Readonly<Record<PresetEntryFeeTier, string>> = {
  cheap: "100000000000000000",
  average: "500000000000000000",
  deluxe: "1000000000000000000"
};

const EntryFeeTiers = [...Object.keys(EntryFeeAmounts), "custom"];
const PlayerCounts: readonly PlayerCount[] = [2, 3, 4, 5, 6];
// A custom ticket is a whole number of cents of EVA, so the game server's
// 80/10/10 ticket split stays exact in micro-EVA.
const CustomEntryFeePattern = /^([0-9]+)(?:\.([0-9]{1,2}))?$/;
const TokenAtomicDecimalPlaces = 18;
const MinCustomEntryFeeAtomic = 10n ** 16n;
const MaxCustomEntryFeeAtomic = 1000n * 10n ** 18n;

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
    !["creator_display_name", "entry_fee_tier", "entry_fee_eva", "player_count", "experimental"].includes(key)
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

  let entry_fee_amount: string | null = null;
  if (entry_fee_tier === "custom") {
    entry_fee_amount = customEntryFeeAmount(value.entry_fee_eva);
    if (entry_fee_amount === null) {
      details.push({
        field: "entry_fee_eva",
        message: "must be an EVA amount from 0.01 to 1000 with at most 2 decimals"
      });
    }
  } else if (value.entry_fee_eva !== undefined) {
    details.push({
      field: "entry_fee_eva",
      message: "is only allowed with the custom entry fee tier"
    });
  } else if (isEntryFeeTier(entry_fee_tier) && entry_fee_tier !== "custom") {
    entry_fee_amount = EntryFeeAmounts[entry_fee_tier];
  }

  const player_count = value.player_count;
  if (!isPlayerCount(player_count)) {
    details.push({
      field: "player_count",
      message: "must be one of 2, 3, 4, 5, or 6"
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

  if (
    details.length > 0
    || !isEntryFeeTier(entry_fee_tier)
    || entry_fee_amount === null
    || !isPlayerCount(player_count)
  ) {
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
      entry_fee_amount,
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

function customEntryFeeAmount(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = CustomEntryFeePattern.exec(value.trim());
  if (match === null) {
    return null;
  }

  const whole_digits = match[1] ?? "0";
  const fraction_digits = (match[2] ?? "").padEnd(TokenAtomicDecimalPlaces, "0");
  const amount = BigInt(whole_digits) * 10n ** BigInt(TokenAtomicDecimalPlaces) + BigInt(fraction_digits);
  if (amount < MinCustomEntryFeeAtomic || amount > MaxCustomEntryFeeAtomic) {
    return null;
  }
  return amount.toString();
}

function isEntryFeeTier(value: unknown): value is EntryFeeTier {
  return value === "cheap" || value === "average" || value === "deluxe" || value === "custom";
}

function isPlayerCount(value: unknown): value is PlayerCount {
  return PlayerCounts.includes(value as PlayerCount);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
