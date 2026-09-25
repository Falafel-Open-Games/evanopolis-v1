/*
 * Finite match-bank payout helpers.
 * Paid economies fund rewards from the shared reserve; legacy free play keeps
 * its established unlimited-bank behavior until it receives an economy tier.
 */

export interface BankRewardPayout {
  readonly actual_amount_micro: number;
  readonly bank_reserve_micro: number;
}

export interface BankPaymentDistribution {
  readonly gross_amount_micro: number;
  readonly referral_amount_micro: number;
  readonly burn_amount_micro: number;
  readonly jackpot_amount_micro: number;
  readonly bank_reserve_amount_micro: number;
}

export function distributeBankPayment(gross_amount_micro: number): BankPaymentDistribution {
  if (!Number.isSafeInteger(gross_amount_micro) || gross_amount_micro < 0) {
    throw new Error(`Invalid bank payment: ${gross_amount_micro}`);
  }
  const referral_amount_micro = exactShare(gross_amount_micro, 3);
  const burn_amount_micro = exactShare(gross_amount_micro, 1);
  const jackpot_amount_micro = exactShare(gross_amount_micro, 1);
  const bank_reserve_amount_micro = exactShare(gross_amount_micro, 5);
  return {
    gross_amount_micro,
    referral_amount_micro,
    burn_amount_micro,
    jackpot_amount_micro,
    bank_reserve_amount_micro
  };
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

function exactShare(gross_amount_micro: number, numerator: number): number {
  const scaled_amount = gross_amount_micro * numerator;
  if (!Number.isSafeInteger(scaled_amount) || scaled_amount % 10 !== 0) {
    throw new Error(`Bank payment cannot be split exactly: ${gross_amount_micro}`);
  }
  return scaled_amount / 10;
}
