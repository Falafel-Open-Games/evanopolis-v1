import assert from "node:assert/strict";
import test from "node:test";
import {
  economyProfileForTier,
  initialBankReserveForMatch,
  initialJackpotForMatch,
  scaledMicroFromRawEva,
  type EvanopolisEntryFeeTier
} from "../../src/evanopolis-rules/economy-profile.js";
import { evaMicroFromDecimal, formatEvaMicro } from "../../src/evanopolis-rules/eva-money.js";

test("approved ticket tiers allocate exactly 80% player, 10% jackpot, and 10% bank", () => {
  const expected: ReadonlyArray<{
    tier: EvanopolisEntryFeeTier;
    ticket: string;
    player: string;
    jackpot: string;
    bank: string;
  }> = [
    { tier: "cheap", ticket: "0.1", player: "0.08", jackpot: "0.01", bank: "0.01" },
    { tier: "average", ticket: "0.5", player: "0.4", jackpot: "0.05", bank: "0.05" },
    { tier: "deluxe", ticket: "1", player: "0.8", jackpot: "0.1", bank: "0.1" }
  ];

  for (const row of expected) {
    const profile = economyProfileForTier(row.tier);
    assert.equal(formatEvaMicro(profile.ticket_micro), row.ticket);
    assert.equal(formatEvaMicro(profile.player_starting_balance_micro), row.player);
    assert.equal(formatEvaMicro(profile.initial_jackpot_per_player_micro), row.jackpot);
    assert.equal(formatEvaMicro(profile.initial_bank_reserve_per_player_micro), row.bank);
    assert.equal(
      profile.player_starting_balance_micro
        + profile.initial_jackpot_per_player_micro
        + profile.initial_bank_reserve_per_player_micro,
      profile.ticket_micro
    );
  }
});

test("raw 50-EVA prices scale from each tier's player starting balance", () => {
  const cheap = economyProfileForTier("cheap");
  const average = economyProfileForTier("average");
  const deluxe = economyProfileForTier("deluxe");

  assert.equal(formatEvaMicro(scaledMicroFromRawEva(cheap, 1)), "0.0016");
  assert.equal(formatEvaMicro(scaledMicroFromRawEva(average, 1)), "0.008");
  assert.equal(formatEvaMicro(scaledMicroFromRawEva(deluxe, 1)), "0.016");
  assert.equal(formatEvaMicro(scaledMicroFromRawEva(average, 10)), "0.08");
});

test("initial jackpot and bank reserves accumulate once per admitted seat", () => {
  const average = economyProfileForTier("average");
  assert.equal(initialJackpotForMatch(average, 4), evaMicroFromDecimal("0.2"));
  assert.equal(initialBankReserveForMatch(average, 4), evaMicroFromDecimal("0.2"));
  assert.throws(() => initialJackpotForMatch(average, 1), /Invalid Evanopolis player count/);
  assert.equal(initialJackpotForMatch(average, 6), evaMicroFromDecimal("0.3"));
  assert.equal(initialBankReserveForMatch(average, 6), evaMicroFromDecimal("0.3"));
  assert.throws(() => initialBankReserveForMatch(average, 7), /Invalid Evanopolis player count/);
});

test("custom tickets split exactly and scale raw prices from the ticket", () => {
  const custom = economyProfileForTier("custom", evaMicroFromDecimal("2.75"));
  assert.equal(custom.entry_fee_tier, "custom");
  assert.equal(formatEvaMicro(custom.ticket_micro), "2.75");
  assert.equal(formatEvaMicro(custom.player_starting_balance_micro), "2.2");
  assert.equal(formatEvaMicro(custom.initial_jackpot_per_player_micro), "0.275");
  assert.equal(formatEvaMicro(custom.initial_bank_reserve_per_player_micro), "0.275");
  assert.equal(formatEvaMicro(scaledMicroFromRawEva(custom, 1)), "0.044");

  const smallest = economyProfileForTier("custom", evaMicroFromDecimal("0.01"));
  assert.equal(formatEvaMicro(smallest.player_starting_balance_micro), "0.008");
  assert.equal(formatEvaMicro(scaledMicroFromRawEva(smallest, 1)), "0.00016");
});

test("custom tickets need an in-range amount and presets keep their fixed ticket", () => {
  assert.throws(() => economyProfileForTier("custom"), /Invalid custom ticket amount/);
  assert.throws(() => economyProfileForTier("custom", evaMicroFromDecimal("0.009")), /Invalid custom ticket amount/);
  assert.throws(() => economyProfileForTier("custom", evaMicroFromDecimal("1000.01")), /Invalid custom ticket amount/);
  assert.equal(economyProfileForTier("average", evaMicroFromDecimal("0.5")).ticket_micro, evaMicroFromDecimal("0.5"));
  assert.throws(() => economyProfileForTier("average", evaMicroFromDecimal("0.6")), /does not match average tier/);
});
