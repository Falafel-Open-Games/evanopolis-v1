/*
 * Exact EVA accounting primitives.
 *
 * The match ledger uses integer micro-EVA values. The payment boundary may
 * receive 18-decimal token atomic strings, which are converted exactly and
 * rejected when they cannot be represented as whole micro-EVA.
 */

export const EvaMicroUnitsPerEva = 1_000_000;
export const EvaMicroDecimalPlaces = 6;

const TokenAtomicDecimalPlaces = 18;
const TokenAtomicUnitsPerMicroEva = 10n ** BigInt(TokenAtomicDecimalPlaces - EvaMicroDecimalPlaces);
const EvaDecimalPattern = /^(-?)([0-9]+)(?:\.([0-9]{1,6}))?$/;
const TokenAtomicPattern = /^-?[0-9]+$/;

export type EvaMicroAmount = number;

export function evaMicroFromDecimal(value: string): EvaMicroAmount {
  const match = EvaDecimalPattern.exec(value);
  if (match === null) {
    throw new Error(`Invalid EVA decimal amount: ${value}`);
  }

  const sign = match[1] === "-" ? -1 : 1;
  const whole_digits = match[2];
  const fractional_digits = match[3] ?? "";
  if (whole_digits === undefined) {
    throw new Error(`Missing EVA whole digits: ${value}`);
  }

  const whole = Number(whole_digits);
  const fraction = Number(fractional_digits.padEnd(EvaMicroDecimalPlaces, "0"));
  const amount_micro = sign * (whole * EvaMicroUnitsPerEva + fraction);
  assertSafeMicroAmount(amount_micro);
  return amount_micro;
}

export function evaMicroFromTokenAtomic(value: string): EvaMicroAmount {
  if (!TokenAtomicPattern.test(value)) {
    throw new Error(`Invalid EVA token atomic amount: ${value}`);
  }

  const token_atomic = BigInt(value);
  if (token_atomic % TokenAtomicUnitsPerMicroEva !== 0n) {
    throw new Error(`EVA token amount is not representable as whole micro-EVA: ${value}`);
  }

  const amount_micro = Number(token_atomic / TokenAtomicUnitsPerMicroEva);
  assertSafeMicroAmount(amount_micro);
  return amount_micro;
}

export function formatEvaMicro(amount_micro: EvaMicroAmount): string {
  assertSafeMicroAmount(amount_micro);
  const negative = amount_micro < 0;
  const absolute_amount = Math.abs(amount_micro);
  const whole = Math.floor(absolute_amount / EvaMicroUnitsPerEva);
  const fractional = absolute_amount % EvaMicroUnitsPerEva;
  if (fractional === 0) {
    return `${negative ? "-" : ""}${whole}`;
  }

  const fraction_text = fractional
    .toString()
    .padStart(EvaMicroDecimalPlaces, "0")
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}.${fraction_text}`;
}

export function exactEvaRatio(
  amount_micro: EvaMicroAmount,
  numerator: number,
  denominator: number
): EvaMicroAmount {
  assertSafeMicroAmount(amount_micro);
  if (!Number.isSafeInteger(numerator)) {
    throw new Error(`EVA ratio numerator must be a safe integer: ${numerator}`);
  }
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error("EVA ratio denominator must be a positive safe integer");
  }

  const product = amount_micro * numerator;
  assertSafeMicroAmount(product);
  if (product % denominator !== 0) {
    throw new Error(
      `EVA ratio is not exact in micro-EVA: ${amount_micro} * ${numerator} / ${denominator}`
    );
  }
  return product / denominator;
}

function assertSafeMicroAmount(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`EVA micro amount must be a safe integer: ${value}`);
  }
}
