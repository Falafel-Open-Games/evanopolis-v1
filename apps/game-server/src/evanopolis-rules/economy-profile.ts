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

export type EvanopolisEntryFeeTier = "cheap" | "average" | "deluxe";

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

const TicketAmounts: Readonly<Record<EvanopolisEntryFeeTier, EvaMicroAmount>> = {
  cheap: evaMicroFromDecimal("0.1"),
  average: evaMicroFromDecimal("0.5"),
  deluxe: evaMicroFromDecimal("1")
};

export function economyProfileForTier(
  entry_fee_tier: EvanopolisEntryFeeTier
): EvanopolisEconomyProfile {
  const ticket_micro = TicketAmounts[entry_fee_tier];
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

function assertPlayerCount(player_count: number): void {
  if (!Number.isInteger(player_count) || player_count < 2 || player_count > 4) {
    throw new Error(`Invalid Evanopolis player count: ${player_count}`);
  }
}
