/*
 * Finite match-bank payout helpers.
 * Paid economies fund rewards from the shared reserve; legacy free play keeps
 * its established unlimited-bank behavior until it receives an economy tier.
 */

export interface BankRewardPayout {
  readonly actual_amount_micro: number;
  readonly bank_reserve_micro: number;
}

export function payRewardFromBank(
  nominal_amount_micro: number,
  bank_reserve_micro: number,
  finite_bank: boolean
): BankRewardPayout {
  if (!Number.isSafeInteger(nominal_amount_micro) || nominal_amount_micro < 0) {
    throw new Error(`Invalid nominal bank reward: ${nominal_amount_micro}`);
  }
  if (!Number.isSafeInteger(bank_reserve_micro) || bank_reserve_micro < 0) {
    throw new Error(`Invalid bank reserve: ${bank_reserve_micro}`);
  }

  if (!finite_bank) {
    return {
      actual_amount_micro: nominal_amount_micro,
      bank_reserve_micro
    };
  }

  const actual_amount_micro = Math.min(nominal_amount_micro, bank_reserve_micro);
  return {
    actual_amount_micro,
    bank_reserve_micro: bank_reserve_micro - actual_amount_micro
  };
}
