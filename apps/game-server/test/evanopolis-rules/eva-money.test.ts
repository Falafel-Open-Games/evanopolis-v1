import assert from "node:assert/strict";
import test from "node:test";
import {
  EvaMicroUnitsPerEva,
  evaMicroFromDecimal,
  evaMicroFromTokenAtomic,
  exactEvaRatio,
  formatEvaMicro
} from "../../src/evanopolis-rules/eva-money.js";
import { creditPlayer } from "../../src/evanopolis-rules/player-ledger.js";

test("EVA decimal amounts round-trip through exact micro-EVA integers", () => {
  const examples = ["0", "0.000001", "0.0008", "0.1", "0.5", "1", "50", "-0.004"];

  for (const example of examples) {
    assert.equal(formatEvaMicro(evaMicroFromDecimal(example)), example);
  }
  assert.equal(evaMicroFromDecimal("1"), EvaMicroUnitsPerEva);
});

test("EVA decimal parsing rejects ambiguous or sub-micro inputs", () => {
  for (const invalid of ["", ".1", "1.", "+1", "1e-3", " 1", "0.0000001"]) {
    assert.throws(() => evaMicroFromDecimal(invalid), /Invalid EVA decimal amount/);
  }
});

test("18-decimal token atomic strings convert exactly at the payment boundary", () => {
  assert.equal(evaMicroFromTokenAtomic("100000000000000000"), evaMicroFromDecimal("0.1"));
  assert.equal(evaMicroFromTokenAtomic("500000000000000000"), evaMicroFromDecimal("0.5"));
  assert.equal(evaMicroFromTokenAtomic("1000000000000000000"), evaMicroFromDecimal("1"));
  assert.throws(
    () => evaMicroFromTokenAtomic("1000000000001"),
    /not representable as whole micro-EVA/
  );
  assert.throws(() => evaMicroFromTokenAtomic("1.0"), /Invalid EVA token atomic amount/);
});

test("exact EVA ratios reject values that would require rounding", () => {
  assert.equal(exactEvaRatio(evaMicroFromDecimal("0.5"), 8, 10), evaMicroFromDecimal("0.4"));
  assert.throws(() => exactEvaRatio(1, 1, 10), /not exact in micro-EVA/);
  assert.throws(() => exactEvaRatio(1, 1, 0), /denominator must be a positive safe integer/);
});

test("legacy display balances are derived from authoritative micro-EVA mutations", () => {
  const players = creditPlayer(
    [{
      player_id: "player_1",
      position: 0,
      status: "active",
      eva_balance: 0.08,
      eva_balance_micro: 80_000
    }],
    "player_1",
    2_000_000
  );

  assert.equal(players[0]?.eva_balance_micro, 2_080_000);
  assert.equal(players[0]?.eva_balance, 2.08);
});
