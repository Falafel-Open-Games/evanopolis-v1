/*
 * Deterministic dice rolling for Evanopolis V1.
 * Keeps seeded dice behavior isolated from command handling and snapshots.
 */

import type { EvanopolisDiceState } from "./evanopolis-state.js";
import { seededRandom } from "./rule-utils.js";

export function rollDice(random_seed: string, dice_roll_count: number): EvanopolisDiceState {
  const die_1 = deterministicDie(random_seed, dice_roll_count, 1);
  const die_2 = deterministicDie(random_seed, dice_roll_count, 2);
  return {
    die_1,
    die_2,
    total: die_1 + die_2
  };
}

function deterministicDie(random_seed: string, dice_roll_count: number, die_index: number): number {
  return Math.floor(seededRandom(`${random_seed}:dice:${dice_roll_count}:${die_index}`)() * 6) + 1;
}
