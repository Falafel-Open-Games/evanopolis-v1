import assert from "node:assert/strict";
import test from "node:test";
import { EvanopolisRulesAdapter, MatchRegistry } from "../src/index.js";
import type { CommandEnvelope, EvanopolisMatchState, EvanopolisSnapshot } from "../src/index.js";

function createMatch() {
  const registry = new MatchRegistry<EvanopolisMatchState, EvanopolisSnapshot>({
    player_count: 3,
    rules: new EvanopolisRulesAdapter()
  });
  return registry.getOrCreate("demo");
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

test("first three clients become players and the fourth becomes a spectator", () => {
  const match = createMatch();

  const client_a = match.join("client-a");
  const client_b = match.join("client-b");
  const client_c = match.join("client-c");
  const client_d = match.join("client-d");

  assert.equal(client_a.role, "player");
  assert.equal(client_a.player_id, "player_1");
  assert.equal(client_b.role, "player");
  assert.equal(client_b.player_id, "player_2");
  assert.equal(client_c.role, "player");
  assert.equal(client_c.player_id, "player_3");
  assert.equal(client_c.snapshot.phase, "active");
  assert.equal(client_d.role, "spectator");
  assert.equal(client_d.spectator_id, "spectator_1");
});

test("known client token reconnects to the same player seat", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");

  match.disconnect("client-a");
  const disconnected_snapshot = match.snapshotFor("client-b");
  assert.equal(disconnected_snapshot.players[0]?.connected, false);

  const reconnected = match.join("client-a");

  assert.equal(reconnected.role, "player");
  assert.equal(reconnected.player_id, "player_1");
  assert.equal(reconnected.snapshot.local_player_id, "player_1");
  assert.equal(reconnected.snapshot.players[0]?.connected, true);
});

test("non-active player cannot roll", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");

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

test("active player can roll once and the snapshot contains renderable dice and pawn state", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");

  const result = match.handleCommand(command({}));

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  const player = result.snapshot.players[0];
  assert.ok(player !== undefined);
  assert.ok(player.position >= 2);
  assert.ok(player.position <= 12);
  assert.ok(result.snapshot.dice !== null);
  assert.equal(result.snapshot.dice.total, result.snapshot.dice.die_1 + result.snapshot.dice.die_2);
  assert.deepEqual(result.snapshot.available_actions, ["request_end_turn"]);
  assert.equal(result.snapshot.revision, 4);
});

test("active player cannot roll twice before ending the turn", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");

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

test("ending a turn advances the active player", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");
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
});

test("stale command is rejected by the core before rules handling", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");

  const result = match.handleCommand(
    command({
      seen_revision: 2
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "stale_revision");
  }
});
