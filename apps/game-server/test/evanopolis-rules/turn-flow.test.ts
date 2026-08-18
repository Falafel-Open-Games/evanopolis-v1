import assert from "node:assert/strict";
import test from "node:test";
import { EvanopolisRulesAdapter, MatchRegistry } from "../../src/index.js";
import type { CommandEnvelope, EvanopolisDefinition, EvanopolisMatchState, EvanopolisSnapshot } from "../../src/index.js";

function createMatch() {
  const registry = new MatchRegistry<EvanopolisMatchState, EvanopolisSnapshot, EvanopolisDefinition>({
    player_count: 3,
    rules: new EvanopolisRulesAdapter()
  });
  return registry.getOrCreate("demo");
}

function createActiveMatch() {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");
  return match;
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

function withDeterministicDice<T>(die_1: number, die_2: number, run: () => T): T {
  const original_random = Math.random;
  const dice = [die_1, die_2];
  let random_index = 0;
  Math.random = () => {
    const fallback_die = dice[dice.length - 1];
    assert.ok(fallback_die !== undefined);
    const die = dice[random_index] ?? fallback_die;
    random_index += 1;
    return (die - 1) / 6;
  };
  try {
    return run();
  } finally {
    Math.random = original_random;
  }
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
  const match = createActiveMatch();

  const result = withDeterministicDice(3, 4, () => match.handleCommand(command({})));

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  const player = result.snapshot.players[0];
  assert.ok(player !== undefined);
  assert.equal(player.position, 7);
  assert.ok(result.snapshot.dice !== null);
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
  const match = createActiveMatch();
  const roll_result = withDeterministicDice(3, 4, () => match.handleCommand(command({})));
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
  const match = createActiveMatch();
  const roll_result = withDeterministicDice(1, 2, () => match.handleCommand(command({})));
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

test("active player cannot purchase an already-owned terrain", () => {
  const match = createActiveMatch();
  const roll_result = withDeterministicDice(3, 4, () => match.handleCommand(command({})));
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

test("non-active player cannot purchase after active player rolls", () => {
  const match = createActiveMatch();
  const roll_result = withDeterministicDice(3, 4, () => match.handleCommand(command({})));
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
  const match = createActiveMatch();
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
