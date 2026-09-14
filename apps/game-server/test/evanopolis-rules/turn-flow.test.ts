import assert from "node:assert/strict";
import test from "node:test";
import { EvanopolisRulesAdapter, EvanopolisStartingBalanceEva, MatchRegistry } from "../../src/index.js";
import type {
  CommandEnvelope,
  EvanopolisDefinition,
  EvanopolisMatchState,
  EvanopolisSnapshot,
  MatchContext
} from "../../src/index.js";

function createMatch(random_seed = "evanopolis:demo") {
  const registry = new MatchRegistry<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>({
    player_count: 3,
    rules: new EvanopolisRulesAdapter()
  });
  return registry.getOrCreate("demo", 3, { random_seed });
}

function createActiveMatch(random_seed = "evanopolis:demo") {
  const match = createMatch(random_seed);
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");
  return match;
}

function createActiveMatchWithRolls(rolls: readonly [number, number][]) {
  return createActiveMatch(seedForRolls(rolls));
}

function command(overrides: Partial<CommandEnvelope>): CommandEnvelope {
  return {
    type: "request_roll",
    match_id: "demo",
    client_id: "client-a",
    player_id: "player_1",
    seen_revision: 3,
    payload: {},
    ...overrides
  };
}

function seedForRolls(rolls: readonly [number, number][]): string {
  for (let seed_index = 0; seed_index < 10000; seed_index += 1) {
    const seed = `test-seed-${seed_index}`;
    const matches = rolls.every(([die_1, die_2], roll_index) =>
      deterministicTestDie(seed, roll_index, 1) === die_1
      && deterministicTestDie(seed, roll_index, 2) === die_2
    );
    if (matches) {
      return seed;
    }
  }

  throw new Error(`No deterministic dice seed found for ${JSON.stringify(rolls)}`);
}

function deterministicTestDie(random_seed: string, dice_roll_count: number, die_index: number): number {
  return Math.floor(seededTestRandom(`${random_seed}:dice:${dice_roll_count}:${die_index}`)() * 6) + 1;
}

function seededTestRandom(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

test("non-active player cannot roll", () => {
  const match = createActiveMatch();

  const result = match.handleCommand(
    command({
      client_id: "client-b",
      player_id: "player_2"
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "not_active_player");
  }
});

test("gameplay command before active match phase is rejected by rules", () => {
  const match = createMatch();
  match.join("client-a");

  const result = match.handleCommand(
    command({
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "match_not_active");
  }
});

test("active player can roll once and the snapshot contains renderable dice and pawn state", () => {
  const match = createActiveMatch("test-seed-25");

  const result = match.handleCommand(command({}));

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  const player = result.snapshot.players[0];
  assert.ok(player !== undefined);
  assert.equal(player.position, 7);
  assert.equal(player.eva_balance, EvanopolisStartingBalanceEva);
  assert.ok(result.snapshot.dice !== null);
  assert.equal(result.snapshot.dice_roll_count, 1);
  assert.equal(result.snapshot.dice.die_1, 3);
  assert.equal(result.snapshot.dice.die_2, 4);
  assert.equal(result.snapshot.dice.total, result.snapshot.dice.die_1 + result.snapshot.dice.die_2);
  assert.deepEqual(result.snapshot.available_actions, ["request_purchase_property", "request_end_turn"]);
  assert.equal(result.snapshot.revision, 4);
  assert.deepEqual(result.events, [
    {
      match_id: "demo",
      revision: 4,
      event: {
        type: "dice_rolled",
        player_id: "player_1",
        die_1: result.snapshot.dice.die_1,
        die_2: result.snapshot.dice.die_2,
        total: result.snapshot.dice.total,
        from_position: 0,
        to_position: player.position
      }
    }
  ]);
});

test("same match seed reproduces the same first dice roll", () => {
  const seed = seedForRolls([[3, 4]]);
  const first_match = createActiveMatch(seed);
  const second_match = createActiveMatch(seed);

  const first_result = first_match.handleCommand(command({}));
  const second_result = second_match.handleCommand(command({}));

  assert.equal(first_result.accepted, true);
  assert.equal(second_result.accepted, true);
  if (!first_result.accepted || !second_result.accepted) {
    return;
  }
  assert.deepEqual(first_result.snapshot.dice, second_result.snapshot.dice);
  assert.equal(first_result.snapshot.dice_roll_count, 1);
  assert.equal(second_result.snapshot.dice_roll_count, 1);
});

test("passing salida credits 2 EVA and records a jackpot free roll award", () => {
  const rules = new EvanopolisRulesAdapter();
  const state = stateReadyToRollAt(34, seedForRolls([[1, 2]]));
  const context: MatchContext = activeContext(3);

  const result = rules.handleCommand(state, command({ seen_revision: context.revision }), context);

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.equal(result.state.players[0]?.position, 1);
  assert.equal(result.state.players[0]?.eva_balance, EvanopolisStartingBalanceEva + 2);
  assert.deepEqual(result.events, [
    {
      type: "dice_rolled",
      player_id: "player_1",
      die_1: 1,
      die_2: 2,
      total: 3,
      from_position: 34,
      to_position: 1
    },
    {
      type: "start_bonus_collected",
      player_id: "player_1",
      from_position: 34,
      to_position: 1,
      amount_eva: 2,
      jackpot_free_rolls_awarded: 1,
      exact_landing: false
    }
  ]);
});

test("landing exactly on salida credits 3 EVA total", () => {
  const rules = new EvanopolisRulesAdapter();
  const state = stateReadyToRollAt(31, seedForRolls([[2, 3]]));
  const context: MatchContext = activeContext(3);

  const result = rules.handleCommand(state, command({ seen_revision: context.revision }), context);

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.equal(result.state.players[0]?.position, 0);
  assert.equal(result.state.players[0]?.eva_balance, EvanopolisStartingBalanceEva + 3);
  assert.deepEqual(result.events, [
    {
      type: "dice_rolled",
      player_id: "player_1",
      die_1: 2,
      die_2: 3,
      total: 5,
      from_position: 31,
      to_position: 0
    },
    {
      type: "start_bonus_collected",
      player_id: "player_1",
      from_position: 31,
      to_position: 0,
      amount_eva: 3,
      jackpot_free_rolls_awarded: 1,
      exact_landing: true
    }
  ]);
});

test("movement that does not cross salida does not award a start bonus", () => {
  const rules = new EvanopolisRulesAdapter();
  const state = stateReadyToRollAt(0, seedForRolls([[3, 4]]));
  const context: MatchContext = activeContext(3);

  const result = rules.handleCommand(state, command({ seen_revision: context.revision }), context);

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.equal(result.state.players[0]?.position, 7);
  assert.equal(result.state.players[0]?.eva_balance, EvanopolisStartingBalanceEva);
  assert.equal((result.events ?? []).some((event) => event.type === "start_bonus_collected"), false);
});

test("landing on destiny waits for acknowledgement before applying card effect", () => {
  const match = createActiveMatch("test-seed-14");

  const roll_result = match.handleCommand(command({}));

  assert.equal(roll_result.accepted, true);
  if (!roll_result.accepted) {
    return;
  }

  const pending_card = roll_result.snapshot.pending_card_resolution;
  assert.ok(pending_card !== null);
  assert.equal(pending_card.deck_id, "destiny");
  assert.equal(pending_card.player_id, "player_1");
  assert.equal(pending_card.space_id, "destiny_1");
  assert.equal(pending_card.effect.type, "eva_delta");
  assert.equal(roll_result.snapshot.players[0]?.position, 12);
  assert.equal(roll_result.snapshot.dice_roll_count, 1);
  assert.equal(roll_result.snapshot.players[0]?.eva_balance, EvanopolisStartingBalanceEva);
  assert.deepEqual(roll_result.snapshot.available_actions, ["request_resolve_card"]);
  assert.deepEqual(roll_result.events, [
    {
      match_id: "demo",
      revision: 4,
      event: {
        type: "dice_rolled",
        player_id: "player_1",
        die_1: 6,
        die_2: 6,
        total: 12,
        from_position: 0,
        to_position: 12
      }
    },
    {
      match_id: "demo",
      revision: 4,
      event: {
        type: "card_drawn",
        player_id: "player_1",
        space_id: "destiny_1",
        deck_id: "destiny",
        card_id: pending_card.card_id
      }
    }
  ]);

  const early_end_turn = match.handleCommand(command({
    type: "request_end_turn",
    seen_revision: match.getRevision()
  }));
  assert.equal(early_end_turn.accepted, false);
  if (!early_end_turn.accepted) {
    assert.equal(early_end_turn.reason, "card_resolution_required");
  }

  const resolve_result = match.handleCommand(command({
    type: "request_resolve_card",
    seen_revision: match.getRevision()
  }));
  assert.equal(resolve_result.accepted, true);
  if (!resolve_result.accepted) {
    return;
  }

  assert.equal(resolve_result.snapshot.pending_card_resolution, null);
  assert.equal(
    resolve_result.snapshot.players[0]?.eva_balance,
    EvanopolisStartingBalanceEva + pending_card.effect.amount_eva
  );
  assert.equal(resolve_result.snapshot.active_player_id, "player_1");
  assert.deepEqual(resolve_result.snapshot.available_actions, ["request_end_turn"]);
  assert.deepEqual(resolve_result.events, [
    {
      match_id: "demo",
      revision: 5,
      event: {
        type: "card_resolved",
        player_id: "player_1",
        space_id: "destiny_1",
        deck_id: "destiny",
        card_id: pending_card.card_id,
        effect_type: "eva_delta",
        amount_eva: pending_card.effect.amount_eva
      }
    }
  ]);
});

test("unaffordable card payment requires accepting game over", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: "test-seed",
    dice_roll_count: 1,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 0,
    has_rolled_current_turn: true,
    players: [
      {
        player_id: "player_1",
        position: 12,
        status: "active",
        eva_balance: 1
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_caracas_1",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: {
      deck_id: "destiny",
      card_id: "destiny_operating_tax",
      player_id: "player_1",
      space_id: "destiny_1",
      effect: {
        type: "eva_delta",
        amount_eva: -2
      }
    },
    dice: {
      die_1: 6,
      die_2: 6,
      total: 12
    }
  };
  const context: MatchContext = activeContext(1);

  assert.deepEqual(rules.buildPublicSnapshot(state, context, "client-a").available_actions, ["request_accept_game_over"]);

  const resolve_result = rules.handleCommand(
    state,
    command({
      type: "request_resolve_card",
      seen_revision: context.revision
    }),
    context
  );
  assert.equal(resolve_result.accepted, false);
  if (!resolve_result.accepted) {
    assert.equal(resolve_result.reason, "insufficient_eva");
  }

  const game_over_result = rules.handleCommand(
    state,
    command({
      type: "request_accept_game_over",
      seen_revision: context.revision
    }),
    context
  );
  assert.equal(game_over_result.accepted, true);
  if (!game_over_result.accepted) {
    return;
  }
  assert.equal(game_over_result.state.players[0]?.status, "game_over");
  assert.equal(game_over_result.state.players[0]?.eva_balance, 0);
  assert.equal(game_over_result.state.pending_card_resolution, null);
  assert.deepEqual(game_over_result.state.terrain_ownership, [
    {
      space_id: "terrain_caracas_1",
      owner_player_id: "player_1"
    }
  ]);
  assert.deepEqual(game_over_result.events, [
    {
      type: "player_eliminated",
      player_id: "player_1",
      reason: "insufficient_card_eva",
      space_id: "destiny_1",
      deck_id: "destiny",
      card_id: "destiny_operating_tax",
      amount_eva: -2,
      next_player_id: "player_2"
    },
    {
      type: "game_ended",
      winner_player_id: "player_2",
      reason: "last_player_standing"
    }
  ]);
});

test("active player cannot roll twice before ending the turn", () => {
  const match = createActiveMatch();

  const first_result = match.handleCommand(command({}));
  assert.equal(first_result.accepted, true);

  const second_result = match.handleCommand(
    command({
      seen_revision: match.getRevision()
    })
  );

  assert.equal(second_result.accepted, false);
  if (!second_result.accepted) {
    assert.equal(second_result.reason, "turn_already_rolled");
  }
});

test("unknown command is rejected by the rules adapter", () => {
  const match = createActiveMatch();

  const result = match.handleCommand(
    command({
      type: "request_unknown_action"
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "unknown_command");
  }
});

test("active player can purchase an unowned terrain after rolling onto it", () => {
  const match = createActiveMatchWithRolls([[3, 4]]);
  const roll_result = match.handleCommand(command({}));
  assert.equal(roll_result.accepted, true);

  const result = match.handleCommand(
    command({
      type: "request_purchase_property",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.deepEqual(result.snapshot.terrain_ownership, [
    {
      space_id: "terrain_asuncion_1",
      owner_player_id: "player_1"
    }
  ]);
  assert.equal(result.snapshot.players[0]?.eva_balance, 48);
  assert.equal(result.snapshot.players[1]?.eva_balance, EvanopolisStartingBalanceEva);
  assert.equal(result.snapshot.pending_rent, null);
  assert.deepEqual(result.snapshot.available_actions, ["request_end_turn"]);
  assert.deepEqual(result.events, [
    {
      match_id: "demo",
      revision: 5,
      event: {
        type: "property_purchased",
        player_id: "player_1",
        space_id: "terrain_asuncion_1",
        price_eva: 2
      }
    }
  ]);
});

test("active player cannot purchase terrain without enough EVA", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: "test-seed",
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 0,
    has_rolled_current_turn: true,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: 0.5
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [],
    special_property_ownership: [],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = activeContext(1);

  const result = rules.handleCommand(
    state,
    command({
      type: "request_purchase_property",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "insufficient_eva");
  }
  assert.deepEqual(rules.buildPublicSnapshot(state, context, "client-a").available_actions, ["request_end_turn"]);
});

test("active player cannot purchase before rolling", () => {
  const match = createActiveMatch();

  const result = match.handleCommand(
    command({
      type: "request_purchase_property",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "roll_required");
  }
});

test("active player cannot purchase a non-terrain landing space", () => {
  const match = createActiveMatchWithRolls([[1, 2]]);
  const roll_result = match.handleCommand(command({}));
  assert.equal(roll_result.accepted, true);

  const result = match.handleCommand(
    command({
      type: "request_purchase_property",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "space_not_purchasable");
  }
});

test("active player can purchase an unowned special property after rolling onto it", () => {
  const match = createActiveMatchWithRolls([[1, 2]]);
  const roll_result = match.handleCommand(command({}));
  assert.equal(roll_result.accepted, true);
  if (!roll_result.accepted) {
    return;
  }
  assert.deepEqual(roll_result.snapshot.available_actions, [
    "request_purchase_special_property",
    "request_end_turn"
  ]);

  const result = match.handleCommand(
    command({
      type: "request_purchase_special_property",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.deepEqual(result.snapshot.special_property_ownership, [
    {
      space_id: "special_importer_1",
      owner_player_id: "player_1"
    }
  ]);
  assert.equal(result.snapshot.players[0]?.eva_balance, 45);
  assert.deepEqual(result.snapshot.available_actions, ["request_end_turn"]);
  assert.deepEqual(result.events, [
    {
      match_id: "demo",
      revision: 5,
      event: {
        type: "special_property_purchased",
        player_id: "player_1",
        space_id: "special_importer_1",
        special_property_id: "importer_1",
        price_eva: 5
      }
    }
  ]);
});

test("active player cannot purchase special property without enough EVA", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: "test-seed",
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 0,
    has_rolled_current_turn: true,
    players: [
      {
        player_id: "player_1",
        position: 3,
        status: "active",
        eva_balance: 4.5
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [],
    special_property_ownership: [],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = activeContext(1);

  const result = rules.handleCommand(
    state,
    command({
      type: "request_purchase_special_property",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "insufficient_eva");
  }
  assert.deepEqual(rules.buildPublicSnapshot(state, context, "client-a").available_actions, ["request_end_turn"]);
});

test("active player cannot purchase an already-owned special property", () => {
  const match = createActiveMatchWithRolls([[1, 2]]);
  const roll_result = match.handleCommand(command({}));
  assert.equal(roll_result.accepted, true);
  const first_purchase = match.handleCommand(
    command({
      type: "request_purchase_special_property",
      seen_revision: match.getRevision()
    })
  );
  assert.equal(first_purchase.accepted, true);

  const second_purchase = match.handleCommand(
    command({
      type: "request_purchase_special_property",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(second_purchase.accepted, false);
  if (!second_purchase.accepted) {
    assert.equal(second_purchase.reason, "special_property_already_owned");
  }
});

test("active player cannot purchase terrain with the special property command", () => {
  const match = createActiveMatchWithRolls([[3, 4]]);
  const roll_result = match.handleCommand(command({}));
  assert.equal(roll_result.accepted, true);

  const result = match.handleCommand(
    command({
      type: "request_purchase_special_property",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "space_not_special_property");
  }
});

test("active player cannot purchase an already-owned terrain", () => {
  const match = createActiveMatchWithRolls([[3, 4]]);
  const roll_result = match.handleCommand(command({}));
  assert.equal(roll_result.accepted, true);
  const first_purchase = match.handleCommand(
    command({
      type: "request_purchase_property",
      seen_revision: match.getRevision()
    })
  );
  assert.equal(first_purchase.accepted, true);

  const second_purchase = match.handleCommand(
    command({
      type: "request_purchase_property",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(second_purchase.accepted, false);
  if (!second_purchase.accepted) {
    assert.equal(second_purchase.reason, "property_already_owned");
  }
});

test("active player owes rent after landing on another player's terrain", () => {
  const match = createActiveMatchWithRolls([[3, 4], [3, 4]]);
  const owner_roll = match.handleCommand(command({}));
  assert.equal(owner_roll.accepted, true);
  const purchase = match.handleCommand(
    command({
      type: "request_purchase_property",
      seen_revision: match.getRevision()
    })
  );
  assert.equal(purchase.accepted, true);
  const owner_end_turn = match.handleCommand(
    command({
      type: "request_end_turn",
      seen_revision: match.getRevision()
    })
  );
  assert.equal(owner_end_turn.accepted, true);

  const renter_roll = match.handleCommand(
    command({
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(renter_roll.accepted, true);
  if (!renter_roll.accepted) {
    return;
  }
  assert.deepEqual(renter_roll.snapshot.pending_rent, {
    space_id: "terrain_asuncion_1",
    payer_player_id: "player_2",
    owner_player_id: "player_1",
    rent_eva: 1
  });
  assert.deepEqual(renter_roll.snapshot.available_actions, ["request_pay_rent"]);
});

test("active player must pay pending rent before ending the turn", () => {
  const match = createActiveMatchWithRolls([[3, 4], [3, 4]]);
  assert.equal(match.handleCommand(command({})).accepted, true);
  assert.equal(
    match.handleCommand(command({ type: "request_purchase_property", seen_revision: match.getRevision() })).accepted,
    true
  );
  assert.equal(match.handleCommand(command({ type: "request_end_turn", seen_revision: match.getRevision() })).accepted, true);
  assert.equal(
    match.handleCommand(
      command({
        client_id: "client-b",
        player_id: "player_2",
        seen_revision: match.getRevision()
      })
    ).accepted,
    true
  );

  const result = match.handleCommand(
    command({
      type: "request_end_turn",
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "rent_payment_required");
  }
});

test("active player pays pending rent by transferring EVA to the owner", () => {
  const match = createActiveMatchWithRolls([[3, 4], [3, 4]]);
  assert.equal(match.handleCommand(command({})).accepted, true);
  assert.equal(
    match.handleCommand(command({ type: "request_purchase_property", seen_revision: match.getRevision() })).accepted,
    true
  );
  assert.equal(match.handleCommand(command({ type: "request_end_turn", seen_revision: match.getRevision() })).accepted, true);
  assert.equal(
    match.handleCommand(
      command({
        client_id: "client-b",
        player_id: "player_2",
        seen_revision: match.getRevision()
      })
    ).accepted,
    true
  );

  const result = match.handleCommand(
    command({
      type: "request_pay_rent",
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.equal(result.snapshot.pending_rent, null);
  assert.equal(result.snapshot.players[0]?.eva_balance, 49);
  assert.equal(result.snapshot.players[1]?.eva_balance, 49);
  assert.deepEqual(result.snapshot.available_actions, ["request_end_turn"]);
  assert.deepEqual(result.events, [
    {
      match_id: "demo",
      revision: 8,
      event: {
        type: "rent_paid",
        payer_player_id: "player_2",
        owner_player_id: "player_1",
        space_id: "terrain_asuncion_1",
        rent_eva: 1
      }
    }
  ]);
});

test("active player cannot pay rent without enough EVA", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: "test-seed",
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 1,
    has_rolled_current_turn: true,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_2",
        position: 7,
        status: "active",
        eva_balance: 0.5
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: {
      space_id: "terrain_asuncion_1",
      payer_player_id: "player_2",
      owner_player_id: "player_1",
      rent_eva: 1
    },
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = activeContext(1);

  const result = rules.handleCommand(
    state,
    command({
      type: "request_pay_rent",
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "insufficient_eva");
  }
  assert.deepEqual(rules.buildPublicSnapshot(state, context, "client-b").available_actions, ["request_accept_game_over"]);
});

test("active player accepts game over when they cannot afford pending rent", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: "test-seed",
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 1,
    has_rolled_current_turn: true,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_2",
        position: 7,
        status: "active",
        eva_balance: 0.5
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      },
      {
        space_id: "terrain_caracas_1",
        owner_player_id: "player_2"
      }
    ],
    special_property_ownership: [
      {
        space_id: "special_importer_1",
        owner_player_id: "player_2"
      }
    ],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: {
      space_id: "terrain_asuncion_1",
      payer_player_id: "player_2",
      owner_player_id: "player_1",
      rent_eva: 1
    },
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = activeContext(1);

  const result = rules.handleCommand(
    state,
    command({
      type: "request_accept_game_over",
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.equal(result.state.pending_rent, null);
  assert.equal(result.state.has_rolled_current_turn, false);
  assert.equal(result.state.players[0]?.eva_balance, 50.5);
  assert.equal(result.state.players[1]?.eva_balance, 0);
  assert.equal(result.state.players[1]?.status, "game_over");
  assert.deepEqual(result.state.terrain_ownership, [
    {
      space_id: "terrain_asuncion_1",
      owner_player_id: "player_1"
    },
    {
      space_id: "terrain_caracas_1",
      owner_player_id: "player_1"
    }
  ]);
  assert.deepEqual(result.state.special_property_ownership, [
    {
      space_id: "special_importer_1",
      owner_player_id: "player_1"
    }
  ]);
  assert.deepEqual(result.events, [
    {
      type: "player_eliminated",
      player_id: "player_2",
      creditor_player_id: "player_1",
      reason: "insufficient_rent",
      space_id: "terrain_asuncion_1",
      unpaid_rent_eva: 1,
      transferred_balance_eva: 0.5,
      transferred_space_ids: ["terrain_caracas_1"],
      next_player_id: "player_1"
    },
    {
      type: "game_ended",
      winner_player_id: "player_1",
      reason: "last_player_standing"
    }
  ]);

  const owner_snapshot = rules.buildPublicSnapshot(result.state, context, "client-a");
  assert.equal(owner_snapshot.active_player_id, "player_1");
  assert.deepEqual(owner_snapshot.available_actions, []);
});

test("owner landing on their own terrain does not create pending rent", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: "test-seed",
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 0,
    has_rolled_current_turn: false,
    players: [
      {
        player_id: "player_1",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = {
    match_id: "demo",
    phase: "active",
    revision: 1,
    players: [
      {
        player_id: "player_1",
        client_id: "client-a",
        seat_index: 0,
        connected: true
      },
      {
        player_id: "player_2",
        client_id: "client-b",
        seat_index: 1,
        connected: true
      }
    ],
    spectators: []
  };

  const result = rules.handleCommand(
    {
      ...state,
      random_seed: seedForRolls([[3, 4]])
    },
    command({
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  const snapshot = rules.buildPublicSnapshot(result.state, context, "client-a");
  assert.equal(snapshot.pending_rent, null);
  assert.deepEqual(snapshot.available_actions, ["request_end_turn"]);
});

test("player can order owned terrain development and pays importer commission", () => {
  const rules = new EvanopolisRulesAdapter();
  const context: MatchContext = activeContext(6);
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: seedForRolls([[3, 4]]),
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 1,
    has_rolled_current_turn: false,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: 48
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: 45
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [
      {
        space_id: "special_importer_1",
        owner_player_id: "player_2"
      }
    ],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };

  const order_result = rules.handleCommand(
    state,
    command({
      type: "request_order_development",
      seen_revision: context.revision,
      payload: {
        space_id: "terrain_asuncion_1"
      }
    }),
    context
  );

  assert.equal(order_result.accepted, true);
  if (!order_result.accepted) {
    return;
  }
  assert.equal(order_result.state.players[0]?.eva_balance, 46);
  assert.equal(order_result.state.players[1]?.eva_balance, 45.2);
  assert.deepEqual(order_result.state.development_orders, [
    {
      order_id: "order_1",
      player_id: "player_1",
      space_id: "terrain_asuncion_1",
      development_kind: "container",
      price_eva: 2,
      target_level: 1,
      created_revision: 7
    }
  ]);
  assert.deepEqual(order_result.state.terrain_developments, []);
  assert.deepEqual(order_result.events, [
    {
      type: "development_ordered",
      player_id: "player_1",
      order_id: "order_1",
      space_id: "terrain_asuncion_1",
      development_kind: "container",
      price_eva: 2,
      target_level: 1
    },
    {
      type: "special_property_commission_collected",
      player_id: "player_2",
      source_player_id: "player_1",
      order_id: "order_1",
      space_id: "terrain_asuncion_1",
      amount_eva: 0.2,
      commission_rate: 0.1
    }
  ]);
});

test("player can still order owned terrain development without importer ownership", () => {
  const rules = new EvanopolisRulesAdapter();
  const context: MatchContext = activeContext(6);
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: seedForRolls([[3, 4]]),
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 1,
    has_rolled_current_turn: false,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: 48
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: 45
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };

  const order_result = rules.handleCommand(
    state,
    command({
      type: "request_order_development",
      seen_revision: context.revision,
      payload: {
        space_id: "terrain_asuncion_1"
      }
    }),
    context
  );

  assert.equal(order_result.accepted, true);
  if (!order_result.accepted) {
    return;
  }
  assert.equal(order_result.state.players[0]?.eva_balance, 46);
  assert.equal(order_result.state.players[1]?.eva_balance, 45);
  assert.deepEqual(order_result.events, [
    {
      type: "development_ordered",
      player_id: "player_1",
      order_id: "order_1",
      space_id: "terrain_asuncion_1",
      development_kind: "container",
      price_eva: 2,
      target_level: 1
    }
  ]);
});

test("owning both importers raises development commission to 20 percent", () => {
  const rules = new EvanopolisRulesAdapter();
  const context: MatchContext = activeContext(6);
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: seedForRolls([[3, 4]]),
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 1,
    has_rolled_current_turn: false,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: 48
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: 40
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [
      {
        space_id: "special_importer_1",
        owner_player_id: "player_2"
      },
      {
        space_id: "special_importer_2",
        owner_player_id: "player_2"
      }
    ],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };

  const order_result = rules.handleCommand(
    state,
    command({
      type: "request_order_development",
      seen_revision: context.revision,
      payload: {
        space_id: "terrain_asuncion_1"
      }
    }),
    context
  );

  assert.equal(order_result.accepted, true);
  if (!order_result.accepted) {
    return;
  }
  assert.equal(order_result.state.players[1]?.eva_balance, 40.4);
  assert.deepEqual(order_result.events?.[1], {
    type: "special_property_commission_collected",
    player_id: "player_2",
    source_player_id: "player_1",
    order_id: "order_1",
    space_id: "terrain_asuncion_1",
    amount_eva: 0.4,
    commission_rate: 0.2
  });
});

test("player cannot order terrain development during their own post-roll phase", () => {
  const match = createActiveMatchWithRolls([[3, 4]]);

  assert.equal(match.handleCommand(command({})).accepted, true);
  assert.equal(match.handleCommand(command({
    type: "request_purchase_property",
    seen_revision: match.getRevision()
  })).accepted, true);

  const result = match.handleCommand(command({
    type: "request_order_development",
    seen_revision: match.getRevision(),
    payload: {
      space_id: "terrain_asuncion_1"
    }
  }));

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "post_roll_resolution_required");
  }
});

test("paid development orders are delivered automatically when the owner turn starts", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: "test-seed",
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 2,
    has_rolled_current_turn: true,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: 48
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_3",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [],
    terrain_developments: [],
    development_orders: [
      {
        order_id: "order_1",
        player_id: "player_1",
        space_id: "terrain_asuncion_1",
        development_kind: "container",
        price_eva: 2,
        target_level: 1,
        created_revision: 1
      }
    ],
    next_development_order_index: 2,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = {
    match_id: "demo",
    phase: "active",
    revision: 1,
    players: [
      {
        player_id: "player_1",
        client_id: "client-a",
        seat_index: 0,
        connected: true
      },
      {
        player_id: "player_2",
        client_id: "client-b",
        seat_index: 1,
        connected: true
      },
      {
        player_id: "player_3",
        client_id: "client-c",
        seat_index: 2,
        connected: true
      }
    ],
    spectators: []
  };

  const result = rules.handleCommand(
    state,
    command({
      type: "request_end_turn",
      client_id: "client-c",
      player_id: "player_3",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.equal(result.state.active_player_index, 0);
  assert.deepEqual(result.state.development_orders, []);
  assert.deepEqual(result.state.terrain_developments, [
    {
      space_id: "terrain_asuncion_1",
      level: 1,
      has_container: true,
      machine_lot_count: 0
    }
  ]);
  assert.deepEqual(result.events, [
    {
      type: "turn_ended",
      player_id: "player_3",
      next_player_id: "player_1"
    },
    {
      type: "development_order_delivered",
      player_id: "player_1",
      order_id: "order_1",
      space_id: "terrain_asuncion_1",
      from_level: 0,
      to_level: 1,
      development_kind: "container",
      price_eva: 2,
      rent_eva: 2.4
    }
  ]);
});

test("delivered terrain development increases future rent", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: seedForRolls([[3, 4]]),
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 1,
    has_rolled_current_turn: false,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [],
    terrain_developments: [
      {
        space_id: "terrain_asuncion_1",
        level: 1,
        has_container: true,
        machine_lot_count: 0
      }
    ],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = activeContext(1);

  const result = rules.handleCommand(
    state,
    command({
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  const snapshot = rules.buildPublicSnapshot(result.state, context, "client-b");
  assert.equal(snapshot.pending_rent?.rent_eva, 2.4);
});

test("special property rent bonuses increase future rent", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: seedForRolls([[3, 4]]),
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 1,
    has_rolled_current_turn: false,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [
      {
        space_id: "special_substation_1",
        owner_player_id: "player_1"
      },
      {
        space_id: "special_substation_2",
        owner_player_id: "player_1"
      },
      {
        space_id: "special_private_workshop",
        owner_player_id: "player_1"
      },
      {
        space_id: "special_cooling_plant",
        owner_player_id: "player_1"
      }
    ],
    terrain_developments: [
      {
        space_id: "terrain_asuncion_1",
        level: 1,
        has_container: true,
        machine_lot_count: 0
      }
    ],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = activeContext(1);

  const result = rules.handleCommand(
    state,
    command({
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  const snapshot = rules.buildPublicSnapshot(result.state, context, "client-b");
  assert.equal(snapshot.pending_rent?.rent_eva, 3.6);
});

test("owning all city terrain at level 5 doubles rent", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: seedForRolls([[3, 4]]),
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 1,
    has_rolled_current_turn: false,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      },
      {
        space_id: "terrain_asuncion_2",
        owner_player_id: "player_1"
      },
      {
        space_id: "terrain_asuncion_3",
        owner_player_id: "player_1"
      },
      {
        space_id: "terrain_asuncion_4",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [],
    terrain_developments: [
      {
        space_id: "terrain_asuncion_1",
        level: 5,
        has_container: true,
        machine_lot_count: 4
      },
      {
        space_id: "terrain_asuncion_2",
        level: 5,
        has_container: true,
        machine_lot_count: 4
      },
      {
        space_id: "terrain_asuncion_3",
        level: 5,
        has_container: true,
        machine_lot_count: 4
      },
      {
        space_id: "terrain_asuncion_4",
        level: 5,
        has_container: true,
        machine_lot_count: 4
      }
    ],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = activeContext(1);

  const result = rules.handleCommand(
    state,
    command({
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  const snapshot = rules.buildPublicSnapshot(result.state, context, "client-b");
  assert.equal(snapshot.pending_rent?.rent_eva, 16);
});

test("special rent bonuses stack with full city level 5 monopoly", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: seedForRolls([[3, 4]]),
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 1,
    has_rolled_current_turn: false,
    players: [
      {
        player_id: "player_1",
        position: 7,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [
      {
        space_id: "terrain_asuncion_1",
        owner_player_id: "player_1"
      },
      {
        space_id: "terrain_asuncion_2",
        owner_player_id: "player_1"
      },
      {
        space_id: "terrain_asuncion_3",
        owner_player_id: "player_1"
      },
      {
        space_id: "terrain_asuncion_4",
        owner_player_id: "player_1"
      }
    ],
    special_property_ownership: [
      {
        space_id: "special_substation_1",
        owner_player_id: "player_1"
      },
      {
        space_id: "special_substation_2",
        owner_player_id: "player_1"
      }
    ],
    terrain_developments: [
      {
        space_id: "terrain_asuncion_1",
        level: 5,
        has_container: true,
        machine_lot_count: 4
      },
      {
        space_id: "terrain_asuncion_2",
        level: 5,
        has_container: true,
        machine_lot_count: 4
      },
      {
        space_id: "terrain_asuncion_3",
        level: 5,
        has_container: true,
        machine_lot_count: 4
      },
      {
        space_id: "terrain_asuncion_4",
        level: 5,
        has_container: true,
        machine_lot_count: 4
      }
    ],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = activeContext(1);

  const result = rules.handleCommand(
    state,
    command({
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  const snapshot = rules.buildPublicSnapshot(result.state, context, "client-b");
  assert.equal(snapshot.pending_rent?.rent_eva, 20.8);
});

function activeContext(revision: number): MatchContext {
  return {
    match_id: "demo",
    phase: "active",
    revision,
    players: [
      {
        player_id: "player_1",
        client_id: "client-a",
        seat_index: 0,
        connected: true
      },
      {
        player_id: "player_2",
        client_id: "client-b",
        seat_index: 1,
        connected: true
      }
    ],
    spectators: []
  };
}

function stateReadyToRollAt(position: number, random_seed: string): EvanopolisMatchState {
  return {
    match_id: "demo",
    random_seed,
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 0,
    has_rolled_current_turn: false,
    players: [
      {
        player_id: "player_1",
        position,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_2",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [],
    special_property_ownership: [],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
}

test("non-active player cannot purchase after active player rolls", () => {
  const match = createActiveMatchWithRolls([[3, 4]]);
  const roll_result = match.handleCommand(command({}));
  assert.equal(roll_result.accepted, true);

  const result = match.handleCommand(
    command({
      type: "request_purchase_property",
      client_id: "client-b",
      player_id: "player_2",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "not_active_player");
  }
});

test("ending a turn advances the active player", () => {
  const match = createActiveMatchWithRolls([[3, 4]]);
  match.handleCommand(command({}));

  const result = match.handleCommand(
    command({
      type: "request_end_turn",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.equal(result.snapshot.active_player_id, "player_2");
  assert.deepEqual(result.snapshot.available_actions, []);
  assert.deepEqual(result.events, [
    {
      match_id: "demo",
      revision: 5,
      event: {
        type: "turn_ended",
        player_id: "player_1",
        next_player_id: "player_2"
      }
    }
  ]);
});

test("ending a turn skips players who are game over", () => {
  const rules = new EvanopolisRulesAdapter();
  const state: EvanopolisMatchState = {
    match_id: "demo",
    random_seed: "test-seed",
    dice_roll_count: 0,
    room_buy_in_eva: EvanopolisStartingBalanceEva,
    active_player_index: 0,
    has_rolled_current_turn: true,
    players: [
      {
        player_id: "player_1",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      },
      {
        player_id: "player_2",
        position: 0,
        status: "game_over",
        eva_balance: 0
      },
      {
        player_id: "player_3",
        position: 0,
        status: "active",
        eva_balance: EvanopolisStartingBalanceEva
      }
    ],
    card_decks: [],
    terrain_ownership: [],
    special_property_ownership: [],
    terrain_developments: [],
    development_orders: [],
    next_development_order_index: 1,
    pending_rent: null,
    pending_card_resolution: null,
    dice: null
  };
  const context: MatchContext = {
    match_id: "demo",
    phase: "active",
    revision: 1,
    players: [
      {
        player_id: "player_1",
        client_id: "client-a",
        seat_index: 0,
        connected: true
      },
      {
        player_id: "player_2",
        client_id: "client-b",
        seat_index: 1,
        connected: true
      },
      {
        player_id: "player_3",
        client_id: "client-c",
        seat_index: 2,
        connected: true
      }
    ],
    spectators: []
  };

  const result = rules.handleCommand(
    state,
    command({
      type: "request_end_turn",
      seen_revision: context.revision
    }),
    context
  );

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  const snapshot = rules.buildPublicSnapshot(result.state, context, "client-c");
  assert.equal(snapshot.active_player_id, "player_3");
  assert.deepEqual(snapshot.available_actions, ["request_roll"]);
  assert.deepEqual(result.events, [
    {
      type: "turn_ended",
      player_id: "player_1",
      next_player_id: "player_3"
    }
  ]);
});
