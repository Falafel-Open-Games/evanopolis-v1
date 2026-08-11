import assert from "node:assert/strict";
import test from "node:test";
import { MatchRegistry } from "../../src/index.js";
import type {
  CommandEnvelope,
  MatchContext,
  RulesAdapter,
  RulesCommandOutcome
} from "../../src/index.js";

interface FakeState {
  readonly accepted_commands: readonly string[];
}

interface FakeSnapshot {
  readonly match_id: string;
  readonly revision: number;
  readonly phase: string;
  readonly local_player_id?: string;
  readonly players: readonly { player_id: string; client_id: string; connected: boolean }[];
  readonly spectators: readonly { spectator_id: string; client_id: string; connected: boolean }[];
  readonly accepted_commands: readonly string[];
}

class FakeRulesAdapter implements RulesAdapter<FakeState, FakeSnapshot> {
  createInitialState(): FakeState {
    return {
      accepted_commands: []
    };
  }

  handleCommand(state: FakeState, command: CommandEnvelope): RulesCommandOutcome<FakeState> {
    if (command.type === "fake_reject") {
      return {
        accepted: false,
        reason: "fake_rules_rejection"
      };
    }
    return {
      accepted: true,
      state: {
        accepted_commands: [...state.accepted_commands, command.type]
      },
      events: [
        {
          type: "fake_command_accepted",
          command_type: command.type
        }
      ]
    };
  }

  buildPublicSnapshot(state: FakeState, context: MatchContext, local_client_id?: string): FakeSnapshot {
    const local_player = context.players.find((player) => player.client_id === local_client_id);
    return {
      match_id: context.match_id,
      revision: context.revision,
      phase: context.phase,
      ...(local_player === undefined ? {} : { local_player_id: local_player.player_id }),
      players: context.players.map((player) => ({
        player_id: player.player_id,
        client_id: player.client_id,
        connected: player.connected
      })),
      spectators: context.spectators.map((spectator) => ({
        spectator_id: spectator.spectator_id,
        client_id: spectator.client_id,
        connected: spectator.connected
      })),
      accepted_commands: state.accepted_commands
    };
  }
}

function createMatch() {
  const registry = new MatchRegistry<FakeState, FakeSnapshot>({
    player_count: 3,
    rules: new FakeRulesAdapter()
  });
  return registry.getOrCreate("demo");
}

function createRegistry() {
  return new MatchRegistry<FakeState, FakeSnapshot>({
    player_count: 3,
    rules: new FakeRulesAdapter()
  });
}

function command(overrides: Partial<CommandEnvelope>): CommandEnvelope {
  return {
    type: "fake_accept",
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

test("registry reuses matches by id and isolates different matches", () => {
  const registry = createRegistry();
  const first_demo = registry.getOrCreate("demo");
  first_demo.join("client-a");

  const second_demo = registry.getOrCreate("demo");
  const other_match = registry.getOrCreate("other-match");

  assert.equal(second_demo.getRevision(), 1);
  assert.equal(second_demo.snapshotFor("client-a").players[0]?.client_id, "client-a");
  assert.equal(other_match.getRevision(), 0);
  assert.equal(other_match.snapshotFor("client-a").players.length, 0);
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

test("spectator cannot send player commands", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");
  match.join("client-d");

  const result = match.handleCommand(
    command({
      client_id: "client-d",
      player_id: "spectator_1",
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "invalid_player_id");
  }
});

test("client cannot send commands for another player's seat", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");

  const result = match.handleCommand(
    command({
      client_id: "client-b",
      player_id: "player_1"
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "client_player_mismatch");
  }
});

test("disconnected player cannot send commands before reconnecting", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");
  match.disconnect("client-a");

  const result = match.handleCommand(
    command({
      seen_revision: match.getRevision()
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "client_disconnected");
  }
  assert.equal(match.getRevision(), 3);
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

test("command with invalid match id is rejected by the core", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");

  const result = match.handleCommand(
    command({
      match_id: "wrong-match"
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "invalid_match_id");
  }
});

test("accepted command increments revision and records rules state", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");

  const result = match.handleCommand(command({}));

  assert.equal(result.accepted, true);
  if (!result.accepted) {
    return;
  }
  assert.equal(result.snapshot.revision, 4);
  assert.deepEqual(result.snapshot.accepted_commands, ["fake_accept"]);
  assert.deepEqual(result.events, [
    {
      match_id: "demo",
      revision: 4,
      event: {
        type: "fake_command_accepted",
        command_type: "fake_accept"
      }
    }
  ]);
});

test("rules rejection does not increment revision", () => {
  const match = createMatch();
  match.join("client-a");
  match.join("client-b");
  match.join("client-c");

  const result = match.handleCommand(
    command({
      type: "fake_reject"
    })
  );

  assert.equal(result.accepted, false);
  if (!result.accepted) {
    assert.equal(result.reason, "fake_rules_rejection");
  }
  assert.equal(match.getRevision(), 3);
});
