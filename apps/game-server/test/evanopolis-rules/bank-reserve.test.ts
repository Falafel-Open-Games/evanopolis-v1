import assert from "node:assert/strict";
import test from "node:test";
import { payRewardFromBank } from "../../src/evanopolis-rules/bank-reserve.js";

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
