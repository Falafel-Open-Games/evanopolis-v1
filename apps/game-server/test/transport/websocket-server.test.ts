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

    await waitForMessage(client_a.messages, "match_snapshot", (message) => snapshotPhase(message) === "active");
    await waitForMessage(client_b.messages, "match_snapshot", (message) => snapshotPhase(message) === "active");
    const active_snapshot = await waitForMessage(
      client_c.messages,
      "match_snapshot",
      (message) => snapshotPhase(message) === "active"
    );

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

    assert.equal(snapshotDiceTotal(roll_snapshot_a), snapshotDiceTotal(roll_snapshot_b));
    assert.deepEqual(snapshotAvailableActions(roll_snapshot_a), ["request_end_turn"]);
    assert.deepEqual(snapshotAvailableActions(roll_snapshot_b), []);

    client_a.socket.close();
    client_b.socket.close();
    client_c.socket.close();
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

function snapshotLocalPlayer(message: ReceivedMessage): string {
  return snapshotField(message, "local_player_id") as string;
}

function snapshotPlayerConnected(message: ReceivedMessage, player_id: string): boolean {
  const players = snapshotField(message, "players") as { player_id: string; connected: boolean }[];
  const player = players.find((candidate) => candidate.player_id === player_id);
  assert.ok(player !== undefined);
  return player.connected;
}

function snapshotField(message: ReceivedMessage, field: string): unknown {
  const snapshot = message.snapshot;
  assert.equal(typeof snapshot, "object");
  assert.notEqual(snapshot, null);
  return (snapshot as Record<string, unknown>)[field];
}
