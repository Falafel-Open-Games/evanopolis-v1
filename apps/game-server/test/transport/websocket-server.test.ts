import assert from "node:assert/strict";
import { once } from "node:events";
import { AddressInfo } from "node:net";
import test from "node:test";
import WebSocket from "ws";
import { createHealthServer } from "../../src/server.js";

interface ReceivedMessage {
  readonly type: string;
  readonly [key: string]: unknown;
}

interface TestClient {
  readonly socket: WebSocket;
  readonly messages: ReceivedMessage[];
  is_closed: boolean;
}

test("health endpoint returns service status", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, "evanopolis-game-server");
    assert.equal(typeof body.version, "string");
    assert.notEqual(body.version, "");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("unknown HTTP endpoint returns not_found", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/unknown`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body, {
      ok: false,
      reason: "not_found"
    });
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("websocket clients can join, receive broadcasts, and send turn commands", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client_a = await openClient(url);
    const client_b = await openClient(url);
    const client_c = await openClient(url);

    const ready_a = await waitForMessage(client_a.messages, "connection_ready", () => true);
    assert.match(String(ready_a.connection_id), /^conn_[0-9]+$/);

    client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    client_b.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-b" }));
    client_c.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-c" }));

    const definition_a = await waitForMessage(client_a.messages, "match_definition", () => true);
    assert.equal(definitionRuleset(definition_a), "evanopolis_v1");
    assert.equal(definitionSpaces(definition_a).length, 36);
    assert.equal(definitionSpaces(definition_a)[1]?.space_id, "terrain_caracas_1");

    const active_snapshot_a = await waitForMessage(
      client_a.messages,
      "match_snapshot",
      (message) => snapshotPhase(message) === "active"
    );
    await waitForMessage(client_b.messages, "match_snapshot", (message) => snapshotPhase(message) === "active");
    const active_snapshot = await waitForMessage(
      client_c.messages,
      "match_snapshot",
      (message) => snapshotPhase(message) === "active"
    );

    assert.equal(snapshotHasField(active_snapshot_a, "spaces"), false);
    assert.equal(snapshotRevision(active_snapshot), 3);

    client_a.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "demo",
        client_id: "client-a",
        player_id: "player_1",
        seen_revision: 3,
        payload: {}
      })
    );

    const roll_event_a = await waitForMessage(
      client_a.messages,
      "match_event",
      (message) => message.revision === 4 && matchEventType(message) === "dice_rolled"
    );
    const roll_event_b = await waitForMessage(
      client_b.messages,
      "match_event",
      (message) => message.revision === 4 && matchEventType(message) === "dice_rolled"
    );
    const roll_snapshot_a = await waitForMessage(
      client_a.messages,
      "match_snapshot",
      (message) => snapshotRevision(message) === 4
    );
    const roll_snapshot_b = await waitForMessage(
      client_b.messages,
      "match_snapshot",
      (message) => snapshotRevision(message) === 4
    );

    assertEventArrivedBeforeSnapshot(client_a.messages, roll_event_a, roll_snapshot_a);
    assertEventArrivedBeforeSnapshot(client_b.messages, roll_event_b, roll_snapshot_b);
    assert.equal(roll_event_a.match_id, "demo");
    assert.equal(roll_event_b.match_id, "demo");
    assert.equal(matchEventField(roll_event_a, "player_id"), "player_1");
    assert.equal(matchEventField(roll_event_b, "player_id"), "player_1");
    assert.equal(snapshotDiceTotal(roll_snapshot_a), snapshotDiceTotal(roll_snapshot_b));
    assert.ok(snapshotAvailableActions(roll_snapshot_a).includes("request_end_turn"));
    assert.ok(snapshotAvailableActions(roll_snapshot_a).every((action) =>
      action === "request_purchase_property" || action === "request_end_turn"
    ));
    assert.deepEqual(snapshotAvailableActions(roll_snapshot_b), []);

    client_a.socket.send(
      JSON.stringify({
        type: "request_end_turn",
        match_id: "demo",
        client_id: "client-a",
        player_id: "player_1",
        seen_revision: 4,
        payload: {}
      })
    );

    const end_turn_event_a = await waitForMessage(
      client_a.messages,
      "match_event",
      (message) => message.revision === 5 && matchEventType(message) === "turn_ended"
    );
    const end_turn_event_b = await waitForMessage(
      client_b.messages,
      "match_event",
      (message) => message.revision === 5 && matchEventType(message) === "turn_ended"
    );
    const end_turn_snapshot_a = await waitForMessage(
      client_a.messages,
      "match_snapshot",
      (message) => snapshotRevision(message) === 5
    );
    const end_turn_snapshot_b = await waitForMessage(
      client_b.messages,
      "match_snapshot",
      (message) => snapshotRevision(message) === 5
    );

    assertEventArrivedBeforeSnapshot(client_a.messages, end_turn_event_a, end_turn_snapshot_a);
    assertEventArrivedBeforeSnapshot(client_b.messages, end_turn_event_b, end_turn_snapshot_b);
    assert.equal(matchEventField(end_turn_event_a, "player_id"), "player_1");
    assert.equal(matchEventField(end_turn_event_a, "next_player_id"), "player_2");
    assert.equal(matchEventField(end_turn_event_b, "next_player_id"), "player_2");
    assert.equal(snapshotActivePlayer(end_turn_snapshot_a), "player_2");
    assert.deepEqual(snapshotAvailableActions(end_turn_snapshot_a), []);
    assert.deepEqual(snapshotAvailableActions(end_turn_snapshot_b), ["request_roll"]);

    client_a.socket.close();
    client_b.socket.close();
    client_c.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("join_match can create a two-player match", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client_a = await openClient(url);
    const client_b = await openClient(url);
    const spectator = await openClient(url);
    await waitForMessage(client_a.messages, "connection_ready", () => true);
    await waitForMessage(client_b.messages, "connection_ready", () => true);
    await waitForMessage(spectator.messages, "connection_ready", () => true);

    client_a.socket.send(
      JSON.stringify({ type: "join_match", match_id: "duel", client_id: "client-a", player_count: 2 })
    );
    const waiting_snapshot = await waitForMessage(
      client_a.messages,
      "match_snapshot",
      (message) => snapshotPhase(message) === "waiting_for_players"
    );
    assert.equal(snapshotPlayers(waiting_snapshot).length, 2);

    client_b.socket.send(
      JSON.stringify({ type: "join_match", match_id: "duel", client_id: "client-b", player_count: 2 })
    );
    const active_snapshot = await waitForMessage(
      client_b.messages,
      "match_snapshot",
      (message) => snapshotPhase(message) === "active"
    );
    assert.equal(snapshotPlayers(active_snapshot).length, 2);
    assert.equal(snapshotRevision(active_snapshot), 2);

    spectator.socket.send(
      JSON.stringify({ type: "join_match", match_id: "duel", client_id: "client-c", player_count: 2 })
    );
    const spectator_join = await waitForMessage(
      spectator.messages,
      "join_accepted",
      (message) => message.role === "spectator"
    );
    assert.equal(spectator_join.spectator_id, "spectator_1");

    client_a.socket.close();
    client_b.socket.close();
    spectator.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("join_match accepts integer-valued JSON number player_count", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send('{"type":"join_match","match_id":"json-number","client_id":"client-a","player_count":2.0}');
    const snapshot = await waitForMessage(
      client.messages,
      "match_snapshot",
      (message) => snapshotPhase(message) === "waiting_for_players"
    );
    assert.equal(snapshotPlayers(snapshot).length, 2);

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("join_match rejects fractional JSON number player_count", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send('{"type":"join_match","match_id":"fractional","client_id":"client-a","player_count":2.5}');
    const rejection = await waitForMessage(
      client.messages,
      "command_rejected",
      (message) => message.reason === "invalid_player_count"
    );
    assert.equal(rejection.reason, "invalid_player_count");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("existing match rejects a different player_count", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client_a = await openClient(url);
    const client_b = await openClient(url);
    await waitForMessage(client_a.messages, "connection_ready", () => true);
    await waitForMessage(client_b.messages, "connection_ready", () => true);

    client_a.socket.send(
      JSON.stringify({ type: "join_match", match_id: "fixed-size", client_id: "client-a", player_count: 2 })
    );
    await waitForMessage(client_a.messages, "join_accepted", (message) => message.role === "player");

    client_b.socket.send(
      JSON.stringify({ type: "join_match", match_id: "fixed-size", client_id: "client-b", player_count: 4 })
    );
    const rejection = await waitForMessage(
      client_b.messages,
      "command_rejected",
      (message) => message.reason === "player_count_mismatch"
    );
    assert.equal(rejection.reason, "player_count_mismatch");

    client_a.socket.close();
    client_b.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("new socket with an existing client_id replaces the older socket", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const first_socket = await openClient(url);
    await waitForMessage(first_socket.messages, "connection_ready", () => true);

    first_socket.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    const first_join = await waitForMessage(first_socket.messages, "join_accepted", () => true);
    assert.equal(first_join.player_id, "player_1");

    const replacement_socket = await openClient(url);
    await waitForMessage(replacement_socket.messages, "connection_ready", () => true);
    replacement_socket.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));

    const replaced_message = await waitForMessage(first_socket.messages, "session_replaced", () => true);
    assert.equal(replaced_message.reason, "client_id_joined_elsewhere");
    await waitForClose(first_socket);

    const replacement_join = await waitForMessage(replacement_socket.messages, "join_accepted", () => true);
    assert.equal(replacement_join.player_id, "player_1");
    const replacement_snapshot = await waitForMessage(
      replacement_socket.messages,
      "match_snapshot",
      (message) => snapshotLocalPlayer(message) === "player_1"
    );
    assert.equal(snapshotPlayerConnected(replacement_snapshot, "player_1"), true);

    replacement_socket.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("takeover does not mark the player disconnected when the old socket closes", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const first_client_a = await openClient(url);
    const client_b = await openClient(url);
    const client_c = await openClient(url);

    await waitForMessage(first_client_a.messages, "connection_ready", () => true);
    await waitForMessage(client_b.messages, "connection_ready", () => true);
    await waitForMessage(client_c.messages, "connection_ready", () => true);

    first_client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    client_b.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-b" }));
    client_c.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-c" }));

    await waitForMessage(client_b.messages, "match_snapshot", (message) => snapshotPhase(message) === "active");

    const second_client_a = await openClient(url);
    await waitForMessage(second_client_a.messages, "connection_ready", () => true);
    second_client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));

    await waitForMessage(first_client_a.messages, "session_replaced", () => true);
    await waitForClose(first_client_a);
    await waitForMessage(
      client_b.messages,
      "match_snapshot",
      (message) => snapshotPlayerConnected(message, "player_1") === true
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    const latest_snapshot = latestMessage(client_b.messages, "match_snapshot");
    assert.ok(latest_snapshot !== undefined);
    assert.equal(snapshotPlayerConnected(latest_snapshot, "player_1"), true);

    second_client_a.socket.close();
    client_b.socket.close();
    client_c.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("takeover sends definition only to the replacement socket", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const first_client_a = await openClient(url);
    const client_b = await openClient(url);
    const client_c = await openClient(url);

    await waitForMessage(first_client_a.messages, "connection_ready", () => true);
    await waitForMessage(client_b.messages, "connection_ready", () => true);
    await waitForMessage(client_c.messages, "connection_ready", () => true);

    first_client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    client_b.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-b" }));
    client_c.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-c" }));

    await waitForMessage(first_client_a.messages, "match_definition", () => true);
    await waitForMessage(client_b.messages, "match_definition", () => true);
    await waitForMessage(client_c.messages, "match_definition", () => true);
    await waitForMessage(client_b.messages, "match_snapshot", (message) => snapshotPhase(message) === "active");
    const client_b_definition_count_before_takeover = countMessages(client_b.messages, "match_definition");

    const second_client_a = await openClient(url);
    await waitForMessage(second_client_a.messages, "connection_ready", () => true);
    second_client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));

    await waitForMessage(first_client_a.messages, "session_replaced", () => true);
    await waitForClose(first_client_a);

    const replacement_join = await waitForMessage(second_client_a.messages, "join_accepted", () => true);
    const replacement_definition = await waitForMessage(second_client_a.messages, "match_definition", () => true);
    const replacement_snapshot = await waitForMessage(
      second_client_a.messages,
      "match_snapshot",
      (message) => snapshotLocalPlayer(message) === "player_1"
    );

    assert.equal(replacement_join.player_id, "player_1");
    assert.equal(definitionRuleset(replacement_definition), "evanopolis_v1");
    assert.equal(definitionSpaces(replacement_definition).length, 36);
    assertMessageArrivedBefore(second_client_a.messages, replacement_join, replacement_definition);
    assertMessageArrivedBefore(second_client_a.messages, replacement_definition, replacement_snapshot);

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(countMessages(client_b.messages, "match_definition"), client_b_definition_count_before_takeover);
    assert.equal(snapshotPlayerConnected(latestSnapshot(client_b.messages), "player_1"), true);

    second_client_a.socket.close();
    client_b.socket.close();
    client_c.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("same client_id in a different match does not replace existing socket", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const demo_client = await openClient(url);
    const other_match_client = await openClient(url);

    await waitForMessage(demo_client.messages, "connection_ready", () => true);
    await waitForMessage(other_match_client.messages, "connection_ready", () => true);

    demo_client.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    const demo_join = await waitForMessage(demo_client.messages, "join_accepted", () => true);
    assert.equal(demo_join.player_id, "player_1");

    other_match_client.socket.send(
      JSON.stringify({ type: "join_match", match_id: "other-match", client_id: "client-a" })
    );
    const other_match_join = await waitForMessage(other_match_client.messages, "join_accepted", () => true);
    assert.equal(other_match_join.player_id, "player_1");

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(demo_client.is_closed, false);
    assert.equal(demo_client.messages.some((message) => message.type === "session_replaced"), false);

    demo_client.socket.close();
    other_match_client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("malformed websocket JSON is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send("{not-json");

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "invalid_json");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("non-object websocket JSON is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(JSON.stringify([]));

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "invalid_json");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("invalid join_match fields are rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(JSON.stringify({ type: "join_match", match_id: "", client_id: "client-a" }));
    const match_rejection = await waitForMessage(
      client.messages,
      "command_rejected",
      (message) => message.reason === "invalid_match_id"
    );
    assert.equal(match_rejection.reason, "invalid_match_id");

    client.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "" }));
    const client_rejection = await waitForMessage(
      client.messages,
      "command_rejected",
      (message) => message.reason === "invalid_client_id"
    );
    assert.equal(client_rejection.reason, "invalid_client_id");

    client.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a", player_count: 5 }));
    const player_count_rejection = await waitForMessage(
      client.messages,
      "command_rejected",
      (message) => message.reason === "invalid_player_count"
    );
    assert.equal(player_count_rejection.reason, "invalid_player_count");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("invalid command payload shape is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "demo",
        client_id: "client-a",
        player_id: "player_1",
        seen_revision: 0,
        payload: []
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "invalid_payload");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("invalid command type field is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(
      JSON.stringify({
        type: "",
        match_id: "demo",
        client_id: "client-a",
        player_id: "player_1",
        seen_revision: 0,
        payload: {}
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "invalid_command_type");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("invalid command seen_revision field is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "demo",
        client_id: "client-a",
        player_id: "player_1",
        // This checks type validation: "0" is invalid because it is a string, not because of its numeric value.
        seen_revision: "0",
        payload: {}
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "invalid_seen_revision");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("non-integer command seen_revision field is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "demo",
        client_id: "client-a",
        player_id: "player_1",
        seen_revision: 1.5,
        payload: {}
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "invalid_seen_revision");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("invalid command player_id field is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "demo",
        client_id: "client-a",
        player_id: 1,
        seen_revision: 0,
        payload: {}
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "invalid_player_id");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("invalid command match_id field is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "",
        client_id: "client-a",
        player_id: "player_1",
        seen_revision: 0,
        payload: {}
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "invalid_match_id");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("invalid command client_id field is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "demo",
        client_id: "",
        player_id: "player_1",
        seen_revision: 0,
        payload: {}
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "invalid_client_id");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("command before join_match is rejected", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "demo",
        client_id: "client-a",
        player_id: "player_1",
        seen_revision: 0,
        payload: {}
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "client_not_joined");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("joined socket command client id must match its bound session", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    await waitForMessage(client.messages, "join_accepted", () => true);

    client.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "demo",
        client_id: "client-b",
        player_id: "player_1",
        seen_revision: 1,
        payload: {}
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "session_command_mismatch");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("joined socket command match id must match its bound session", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client = await openClient(url);
    await waitForMessage(client.messages, "connection_ready", () => true);

    client.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    await waitForMessage(client.messages, "join_accepted", () => true);

    client.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "other-match",
        client_id: "client-a",
        player_id: "player_1",
        seen_revision: 1,
        payload: {}
      })
    );

    const rejection = await waitForMessage(client.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "session_command_mismatch");

    client.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("spectator command is rejected over websocket", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client_a = await openClient(url);
    const client_b = await openClient(url);
    const client_c = await openClient(url);
    const spectator = await openClient(url);

    await waitForMessage(client_a.messages, "connection_ready", () => true);
    await waitForMessage(client_b.messages, "connection_ready", () => true);
    await waitForMessage(client_c.messages, "connection_ready", () => true);
    await waitForMessage(spectator.messages, "connection_ready", () => true);

    client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    client_b.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-b" }));
    client_c.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-c" }));
    spectator.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "spectator-a" }));

    const spectator_join = await waitForMessage(spectator.messages, "join_accepted", () => true);
    assert.equal(spectator_join.role, "spectator");
    await waitForMessage(spectator.messages, "match_snapshot", (message) => snapshotPhase(message) === "active");

    spectator.socket.send(
      JSON.stringify({
        type: "request_roll",
        match_id: "demo",
        client_id: "spectator-a",
        player_id: "player_1",
        seen_revision: 4,
        payload: {}
      })
    );

    const rejection = await waitForMessage(spectator.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "client_player_mismatch");

    spectator.socket.close();
    client_a.socket.close();
    client_b.socket.close();
    client_c.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("rejected gameplay command does not broadcast match_event", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client_a = await openClient(url);
    const client_b = await openClient(url);
    const client_c = await openClient(url);

    await waitForMessage(client_a.messages, "connection_ready", () => true);
    await waitForMessage(client_b.messages, "connection_ready", () => true);
    await waitForMessage(client_c.messages, "connection_ready", () => true);

    client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    client_b.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-b" }));
    client_c.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-c" }));

    await waitForMessage(client_a.messages, "match_snapshot", (message) => snapshotPhase(message) === "active");
    const event_count_before_rejection = countMessages(client_a.messages, "match_event");

    client_a.socket.send(
      JSON.stringify({
        type: "request_unknown_action",
        match_id: "demo",
        client_id: "client-a",
        player_id: "player_1",
        seen_revision: 3,
        payload: {}
      })
    );

    const rejection = await waitForMessage(client_a.messages, "command_rejected", () => true);
    assert.equal(rejection.reason, "unknown_command");

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(countMessages(client_a.messages, "match_event"), event_count_before_rejection);
    assert.equal(countMessages(client_b.messages, "match_event"), 0);

    client_a.socket.close();
    client_b.socket.close();
    client_c.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("player disconnect broadcasts disconnected status to remaining clients", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client_a = await openClient(url);
    const client_b = await openClient(url);
    const client_c = await openClient(url);

    await waitForMessage(client_a.messages, "connection_ready", () => true);
    await waitForMessage(client_b.messages, "connection_ready", () => true);
    await waitForMessage(client_c.messages, "connection_ready", () => true);

    client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    client_b.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-b" }));
    client_c.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-c" }));

    await waitForMessage(client_b.messages, "match_snapshot", (message) => snapshotPhase(message) === "active");

    client_a.socket.close();

    const disconnect_snapshot = await waitForMessage(
      client_b.messages,
      "match_snapshot",
      (message) => snapshotPlayerConnected(message, "player_1") === false
    );

    assert.equal(snapshotPlayerConnected(disconnect_snapshot, "player_2"), true);

    client_b.socket.close();
    client_c.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("player reconnect broadcasts connected status to remaining clients", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client_a = await openClient(url);
    const client_b = await openClient(url);
    const client_c = await openClient(url);

    await waitForMessage(client_a.messages, "connection_ready", () => true);
    await waitForMessage(client_b.messages, "connection_ready", () => true);
    await waitForMessage(client_c.messages, "connection_ready", () => true);

    client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    client_b.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-b" }));
    client_c.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-c" }));

    await waitForMessage(client_b.messages, "match_snapshot", (message) => snapshotPhase(message) === "active");

    client_a.socket.close();
    await waitForMessage(
      client_b.messages,
      "match_snapshot",
      (message) => snapshotPlayerConnected(message, "player_1") === false
    );

    const reconnected_client_a = await openClient(url);
    await waitForMessage(reconnected_client_a.messages, "connection_ready", () => true);
    reconnected_client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));

    const reconnect_snapshot = await waitForMessage(
      client_b.messages,
      "match_snapshot",
      (message) => snapshotPlayerConnected(message, "player_1") === true
    );

    assert.equal(snapshotPlayerConnected(reconnect_snapshot, "player_2"), true);

    reconnected_client_a.socket.close();
    client_b.socket.close();
    client_c.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("spectator reconnects to the same spectator seat", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const url = `ws://127.0.0.1:${address.port}/match`;
    const client_a = await openClient(url);
    const client_b = await openClient(url);
    const client_c = await openClient(url);
    const first_spectator = await openClient(url);

    await waitForMessage(client_a.messages, "connection_ready", () => true);
    await waitForMessage(client_b.messages, "connection_ready", () => true);
    await waitForMessage(client_c.messages, "connection_ready", () => true);
    await waitForMessage(first_spectator.messages, "connection_ready", () => true);

    client_a.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-a" }));
    client_b.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-b" }));
    client_c.socket.send(JSON.stringify({ type: "join_match", match_id: "demo", client_id: "client-c" }));
    first_spectator.socket.send(
      JSON.stringify({ type: "join_match", match_id: "demo", client_id: "spectator-a" })
    );

    const first_join = await waitForMessage(first_spectator.messages, "join_accepted", () => true);
    assert.equal(first_join.role, "spectator");
    assert.equal(first_join.spectator_id, "spectator_1");

    await waitForMessage(
      client_a.messages,
      "match_snapshot",
      (message) => maybeSnapshotSpectatorConnected(message, "spectator_1") === true
    );

    first_spectator.socket.close();
    await waitForMessage(
      client_a.messages,
      "match_snapshot",
      (message) => maybeSnapshotSpectatorConnected(message, "spectator_1") === false
    );

    const reconnected_spectator = await openClient(url);
    await waitForMessage(reconnected_spectator.messages, "connection_ready", () => true);
    reconnected_spectator.socket.send(
      JSON.stringify({ type: "join_match", match_id: "demo", client_id: "spectator-a" })
    );

    const reconnect_join = await waitForMessage(reconnected_spectator.messages, "join_accepted", () => true);
    assert.equal(reconnect_join.role, "spectator");
    assert.equal(reconnect_join.spectator_id, "spectator_1");

    const reconnect_snapshot = await waitForMessage(
      client_a.messages,
      "match_snapshot",
      (message) => maybeSnapshotSpectatorConnected(message, "spectator_1") === true
    );
    assert.equal(snapshotSpectatorConnected(reconnect_snapshot, "spectator_1"), true);

    reconnected_spectator.socket.close();
    client_a.socket.close();
    client_b.socket.close();
    client_c.socket.close();
  } finally {
    server.close();
    await once(server, "close");
  }
});

async function openClient(url: string): Promise<TestClient> {
  const socket = new WebSocket(url);
  const messages: ReceivedMessage[] = [];
  const client: TestClient = {
    socket,
    messages,
    is_closed: false
  };
  socket.on("message", (data) => {
    messages.push(JSON.parse(data.toString()) as ReceivedMessage);
  });
  socket.on("close", () => {
    client.is_closed = true;
  });
  await once(socket, "open");
  return client;
}

async function waitForClose(client: TestClient): Promise<void> {
  const started_at = Date.now();
  while (Date.now() - started_at < 1000) {
    if (client.is_closed) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("Timed out waiting for socket close");
}

function latestMessage(messages: ReceivedMessage[], type: string): ReceivedMessage | undefined {
  return messages.filter((message) => message.type === type).at(-1);
}

function latestSnapshot(messages: ReceivedMessage[]): ReceivedMessage {
  const snapshot = latestMessage(messages, "match_snapshot");
  assert.ok(snapshot !== undefined);
  return snapshot;
}

function countMessages(messages: ReceivedMessage[], type: string): number {
  return messages.filter((message) => message.type === type).length;
}

async function waitForMessage(
  messages: ReceivedMessage[],
  type: string,
  predicate: (message: ReceivedMessage) => boolean
): Promise<ReceivedMessage> {
  const started_at = Date.now();
  while (Date.now() - started_at < 1000) {
    const message = messages.find((candidate) => candidate.type === type && predicate(candidate));
    if (message !== undefined) {
      return message;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`Timed out waiting for ${type}`);
}

function snapshotPhase(message: ReceivedMessage): string {
  return snapshotField(message, "phase") as string;
}

function snapshotRevision(message: ReceivedMessage): number {
  return snapshotField(message, "revision") as number;
}

function snapshotDiceTotal(message: ReceivedMessage): number {
  const dice = snapshotField(message, "dice") as { total: number } | null;
  assert.ok(dice !== null);
  return dice.total;
}

function snapshotAvailableActions(message: ReceivedMessage): string[] {
  return snapshotField(message, "available_actions") as string[];
}

function snapshotPlayers(message: ReceivedMessage): { player_id: string }[] {
  return snapshotField(message, "players") as { player_id: string }[];
}

function snapshotActivePlayer(message: ReceivedMessage): string {
  return snapshotField(message, "active_player_id") as string;
}

function snapshotHasField(message: ReceivedMessage, field: string): boolean {
  const snapshot = message.snapshot;
  assert.equal(typeof snapshot, "object");
  assert.notEqual(snapshot, null);
  return Object.hasOwn(snapshot as Record<string, unknown>, field);
}

function definitionRuleset(message: ReceivedMessage): string {
  return definitionField(message, "ruleset_id") as string;
}

function definitionSpaces(message: ReceivedMessage): { space_id: string }[] {
  return definitionField(message, "spaces") as { space_id: string }[];
}

function definitionField(message: ReceivedMessage, field: string): unknown {
  const definition = message.definition;
  assert.equal(typeof definition, "object");
  assert.notEqual(definition, null);
  return (definition as Record<string, unknown>)[field];
}

function matchEventType(message: ReceivedMessage): string {
  return matchEventField(message, "type") as string;
}

function matchEventField(message: ReceivedMessage, field: string): unknown {
  const event = message.event;
  assert.equal(typeof event, "object");
  assert.notEqual(event, null);
  return (event as Record<string, unknown>)[field];
}

function assertEventArrivedBeforeSnapshot(
  messages: ReceivedMessage[],
  event: ReceivedMessage,
  snapshot: ReceivedMessage
): void {
  assertMessageArrivedBefore(messages, event, snapshot);
}

function assertMessageArrivedBefore(
  messages: ReceivedMessage[],
  earlier_message: ReceivedMessage,
  later_message: ReceivedMessage
): void {
  assert.ok(messages.indexOf(earlier_message) >= 0);
  assert.ok(messages.indexOf(later_message) >= 0);
  assert.ok(messages.indexOf(earlier_message) < messages.indexOf(later_message));
}

function snapshotLocalPlayer(message: ReceivedMessage): string {
  return snapshotField(message, "local_player_id") as string;
}

function snapshotPlayerConnected(message: ReceivedMessage, player_id: string): boolean {
  const players = snapshotField(message, "players") as { player_id: string; connected: boolean }[];
  const player = players.find((candidate) => candidate.player_id === player_id);
  assert.ok(player !== undefined);
  return player.connected;
}

function snapshotSpectatorConnected(message: ReceivedMessage, spectator_id: string): boolean {
  const spectator = snapshotSpectator(message, spectator_id);
  assert.ok(spectator !== undefined);
  return spectator.connected;
}

function maybeSnapshotSpectatorConnected(message: ReceivedMessage, spectator_id: string): boolean | undefined {
  return snapshotSpectator(message, spectator_id)?.connected;
}

function snapshotSpectator(
  message: ReceivedMessage,
  spectator_id: string
): { spectator_id: string; connected: boolean } | undefined {
  const spectators = snapshotField(message, "spectators") as { spectator_id: string; connected: boolean }[];
  return spectators.find((candidate) => candidate.spectator_id === spectator_id);
}

function snapshotField(message: ReceivedMessage, field: string): unknown {
  const snapshot = message.snapshot;
  assert.equal(typeof snapshot, "object");
  assert.notEqual(snapshot, null);
  return (snapshot as Record<string, unknown>)[field];
}
