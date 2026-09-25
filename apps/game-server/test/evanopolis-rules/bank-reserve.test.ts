import assert from "node:assert/strict";
import test from "node:test";
import {
  distributeBankPayment,
  payRewardFromBank
} from "../../src/evanopolis-rules/bank-reserve.js";

test("bank payments split exactly into referrals, burn, jackpot, and reserve", () => {
  assert.deepEqual(distributeBankPayment(40_000), {
    gross_amount_micro: 40_000,
    referral_amount_micro: 12_000,
    burn_amount_micro: 4_000,
    jackpot_amount_micro: 4_000,
    bank_reserve_amount_micro: 20_000
  });
});

test("bank payment distribution rejects negative, unsafe, or inexact amounts", () => {
  assert.throws(() => distributeBankPayment(-1), /Invalid bank payment/);
  assert.throws(() => distributeBankPayment(Number.MAX_SAFE_INTEGER + 1), /Invalid bank payment/);
  assert.throws(() => distributeBankPayment(1), /cannot be split exactly/);
});

test("finite bank rewards pay fully, partially, or zero without overdrawing", () => {
  assert.deepEqual(payRewardFromBank(20_000, 50_000, true), {
    actual_amount_micro: 20_000,
    bank_reserve_micro: 30_000
  });
  assert.deepEqual(payRewardFromBank(20_000, 7_000, true), {
    actual_amount_micro: 7_000,
    bank_reserve_micro: 0
  });
  assert.deepEqual(payRewardFromBank(20_000, 0, true), {
    actual_amount_micro: 0,
    bank_reserve_micro: 0
  });
});

test("legacy rewards preserve unlimited-bank behavior", () => {
  assert.deepEqual(payRewardFromBank(2_000_000, 0, false), {
    actual_amount_micro: 2_000_000,
    bank_reserve_micro: 0
  });
});

test("bank reward inputs must be non-negative safe integers", () => {
  assert.throws(() => payRewardFromBank(-1, 0, true), /Invalid nominal bank reward/);
  assert.throws(() => payRewardFromBank(1, -1, true), /Invalid bank reserve/);
  assert.throws(() => payRewardFromBank(0.5, 1, true), /Invalid nominal bank reward/);
});
