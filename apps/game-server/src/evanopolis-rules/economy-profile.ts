/*
 * Authoritative room-tier economy profiles.
 *
 * These profiles establish exact ticket allocation and live raw-rule scaling.
 */

import {
  exactEvaRatio,
  evaMicroFromDecimal,
  type EvaMicroAmount
} from "./eva-money.js";

export type EvanopolisEntryFeeTier = "cheap" | "average" | "deluxe" | "custom";
export type EvanopolisPresetEntryFeeTier = Exclude<EvanopolisEntryFeeTier, "custom">;

export interface EvanopolisEconomyProfile {
  readonly entry_fee_tier: EvanopolisEntryFeeTier;
  readonly ticket_micro: EvaMicroAmount;
  readonly player_starting_balance_micro: EvaMicroAmount;
  readonly initial_jackpot_per_player_micro: EvaMicroAmount;
  readonly initial_bank_reserve_per_player_micro: EvaMicroAmount;
  readonly raw_eva_scale_micro: EvaMicroAmount;
}

const TicketAllocationDenominator = 10;
const PlayerAllocationNumerator = 8;
const JackpotAllocationNumerator = 1;
const BankReserveAllocationNumerator = 1;
const RawStartingBalanceEva = 50;

export const MinPlayerCount = 2;
export const MaxPlayerCount = 6;

const TicketAmounts: Readonly<Record<EvanopolisPresetEntryFeeTier, EvaMicroAmount>> = {
  cheap: evaMicroFromDecimal("0.1"),
  average: evaMicroFromDecimal("0.5"),
  deluxe: evaMicroFromDecimal("1")
};
// Matches the custom ticket range Rooms API accepts.
const MinCustomTicketMicro = evaMicroFromDecimal("0.01");
const MaxCustomTicketMicro = evaMicroFromDecimal("1000");

/*
 * Preset tiers carry a fixed ticket; when `ticket_micro` is also given it must
 * match. The custom tier takes its ticket from `ticket_micro`, which has to be
 * inside the custom range and split exactly.
 */
export function economyProfileForTier(
  entry_fee_tier: EvanopolisEntryFeeTier,
  requested_ticket_micro?: EvaMicroAmount
): EvanopolisEconomyProfile {
  const ticket_micro = ticketMicroForTier(entry_fee_tier, requested_ticket_micro);
  const player_starting_balance_micro = exactEvaRatio(
    ticket_micro,
    PlayerAllocationNumerator,
    TicketAllocationDenominator
  );
  const initial_jackpot_per_player_micro = exactEvaRatio(
    ticket_micro,
    JackpotAllocationNumerator,
    TicketAllocationDenominator
  );
  const initial_bank_reserve_per_player_micro = exactEvaRatio(
    ticket_micro,
    BankReserveAllocationNumerator,
    TicketAllocationDenominator
  );

  const allocated_total = player_starting_balance_micro
    + initial_jackpot_per_player_micro
    + initial_bank_reserve_per_player_micro;
  if (allocated_total !== ticket_micro) {
    throw new Error(`Ticket allocation mismatch for ${entry_fee_tier}`);
  }
  const raw_eva_scale_micro = exactEvaRatio(
    player_starting_balance_micro,
    1,
    RawStartingBalanceEva
  );

  return {
    entry_fee_tier,
    ticket_micro,
    player_starting_balance_micro,
    initial_jackpot_per_player_micro,
    initial_bank_reserve_per_player_micro,
    raw_eva_scale_micro
  };
}

export function scaledMicroFromRawEva(
  profile: EvanopolisEconomyProfile,
  raw_value_eva: number
): EvaMicroAmount {
  if (!Number.isSafeInteger(raw_value_eva)) {
    throw new Error(`Raw EVA value must be a safe integer: ${raw_value_eva}`);
  }
  return profile.raw_eva_scale_micro * raw_value_eva;
}

export function initialJackpotForMatch(
  profile: EvanopolisEconomyProfile,
  player_count: number
): EvaMicroAmount {
  assertPlayerCount(player_count);
  return profile.initial_jackpot_per_player_micro * player_count;
}

export function initialBankReserveForMatch(
  profile: EvanopolisEconomyProfile,
  player_count: number
): EvaMicroAmount {
  assertPlayerCount(player_count);
  return profile.initial_bank_reserve_per_player_micro * player_count;
}

function ticketMicroForTier(
  entry_fee_tier: EvanopolisEntryFeeTier,
  requested_ticket_micro: EvaMicroAmount | undefined
): EvaMicroAmount {
  if (entry_fee_tier === "custom") {
    if (
      requested_ticket_micro === undefined
      || !Number.isSafeInteger(requested_ticket_micro)
      || requested_ticket_micro < MinCustomTicketMicro
      || requested_ticket_micro > MaxCustomTicketMicro
    ) {
      throw new Error(`Invalid custom ticket amount: ${String(requested_ticket_micro)}`);
    }
    return requested_ticket_micro;
  }

  const ticket_micro = TicketAmounts[entry_fee_tier];
  if (requested_ticket_micro !== undefined && requested_ticket_micro !== ticket_micro) {
    throw new Error(`Ticket amount does not match ${entry_fee_tier} tier: ${requested_ticket_micro}`);
  }
  return ticket_micro;
}

function assertPlayerCount(player_count: number): void {
  if (!Number.isInteger(player_count) || player_count < MinPlayerCount || player_count > MaxPlayerCount) {
    throw new Error(`Invalid Evanopolis player count: ${player_count}`);
  }
}
