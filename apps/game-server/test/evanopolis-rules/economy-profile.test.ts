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
  assert.throws(() => initialBankReserveForMatch(average, 5), /Invalid Evanopolis player count/);
});
