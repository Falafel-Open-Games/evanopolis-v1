import assert from "node:assert/strict";
import test from "node:test";
import { EvanopolisRulesAdapter, MatchRegistry } from "../../src/index.js";
import type { EvanopolisMatchState, EvanopolisSnapshot } from "../../src/index.js";

function createMatch() {
  const registry = new MatchRegistry<EvanopolisMatchState, EvanopolisSnapshot>({
    player_count: 3,
    rules: new EvanopolisRulesAdapter()
  });
  return registry.getOrCreate("demo");
}

test("evanopolis snapshot includes expected render fields", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  const waiting_snapshot = match.snapshotFor("client-a");
  const client_c = match.join("client-c");
  const spectator = match.join("client-d");

  assert.equal(waiting_snapshot.players[0]?.joined, true);
  assert.equal(waiting_snapshot.players[0]?.connected, true);
  assert.equal(waiting_snapshot.players[2]?.joined, false);
  assert.equal(waiting_snapshot.players[2]?.connected, false);
  assert.deepEqual(waiting_snapshot.available_actions, []);

  assert.equal(client_c.snapshot.match_id, "demo");
  assert.equal(client_c.snapshot.revision, 3);
  assert.equal(client_c.snapshot.phase, "active");
  assert.equal(client_c.snapshot.local_player_id, "player_3");
  assert.equal(client_c.snapshot.active_player_id, "player_1");
  assert.equal(client_c.snapshot.players.length, 3);
  assert.equal(client_c.snapshot.players[0]?.player_id, "player_1");
  assert.equal(client_c.snapshot.players[0]?.joined, true);
  assert.equal(client_c.snapshot.players[0]?.connected, true);
  assert.equal(client_c.snapshot.spectators.length, 0);
  assert.equal(client_c.snapshot.spaces.length, 36);
  assert.equal(client_c.snapshot.dice, null);
  assert.deepEqual(client_c.snapshot.available_actions, []);

  assert.equal(spectator.snapshot.spectators.length, 1);
  assert.equal(spectator.snapshot.spectators[0]?.spectator_id, "spectator_1");
  assert.equal(spectator.snapshot.spectators[0]?.connected, true);
  assert.deepEqual(spectator.snapshot.available_actions, []);
});
