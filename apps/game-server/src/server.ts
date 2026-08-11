import { createServer } from "node:http";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import {
  EvanopolisRulesAdapter,
  type EvanopolisMatchState,
  type EvanopolisSnapshot
} from "./evanopolis-rules/evanopolis-rules-adapter.js";
import { MatchRegistry } from "./multiplayer-core/match-registry.js";
import type { CommandEnvelope, JsonValue } from "./multiplayer-core/types.js";

const DefaultPort = 8788;
const DefaultHost = "127.0.0.1";
const DefaultPlayerCount = 3;
let next_connection_index = 1;

interface ClientSession {
  readonly socket: WebSocket;
  readonly connection_id: string;
  client_id: string;
  match_id: string | null;
  is_takeover_replaced: boolean;
}

type IncomingMessage = {
  readonly type?: unknown;
  readonly match_id?: unknown;
  readonly client_id?: unknown;
  readonly player_id?: unknown;
  readonly seen_revision?: unknown;
  readonly payload?: unknown;
};

type EvanopolisRegistry = MatchRegistry<EvanopolisMatchState, EvanopolisSnapshot>;

interface JoinMessage {
  readonly match_id: string;
  readonly client_id: string;
}

export function createHealthServer() {
  const registry = new MatchRegistry({
    player_count: DefaultPlayerCount,
    rules: new EvanopolisRulesAdapter()
  });

  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: true,
          service: "evanopolis-game-server"
        })
      );
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        ok: false,
        reason: "not_found"
      })
    );
  });

  const web_socket_server = new WebSocketServer({
    noServer: true
  });
  const sessions = new Set<ClientSession>();

  server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/match") {
      socket.destroy();
      return;
    }

    web_socket_server.handleUpgrade(request, socket, head, (web_socket) => {
      web_socket_server.emit("connection", web_socket, request);
    });
  });

  web_socket_server.on("connection", (socket) => {
    const session: ClientSession = {
      socket,
      connection_id: `conn_${next_connection_index}`,
      client_id: "",
      match_id: null,
      is_takeover_replaced: false
    };
    next_connection_index += 1;
    sessions.add(session);

    sendJson(socket, {
      type: "connection_ready",
      connection_id: session.connection_id
    });

    socket.on("message", (data) => {
      handleSocketMessage(registry, sessions, session, data);
    });

    socket.on("close", () => {
      sessions.delete(session);
      if (session.match_id === null || session.client_id === "" || session.is_takeover_replaced) {
        return;
      }
      registry.getOrCreate(session.match_id).disconnect(session.client_id);
      sendSnapshotsToMatch(registry, sessions, session.match_id);
    });
  });

  return server;
}

function handleSocketMessage(
  registry: EvanopolisRegistry,
  sessions: ReadonlySet<ClientSession>,
  session: ClientSession,
  data: RawData
): void {
  const parsed_message = parseIncomingMessage(data);
  if (parsed_message === null) {
    sendJson(session.socket, {
      type: "command_rejected",
      reason: "invalid_json"
    });
    return;
  }

  if (parsed_message.type === "join_match") {
    const join_result = parseJoinMessage(parsed_message);
    if (typeof join_result === "string") {
      sendJson(session.socket, {
        type: "command_rejected",
        reason: join_result
      });
      return;
    }

    const match_id = join_result.match_id;
    const client_id = join_result.client_id;
    closeReplacedClientSessions(sessions, session, match_id, client_id);
    session.match_id = match_id;
    session.client_id = client_id;
    const accepted_join = registry.getOrCreate(match_id).join(client_id);
    sendJson(session.socket, {
      type: "join_accepted",
      role: accepted_join.role,
      player_id: accepted_join.player_id ?? null,
      spectator_id: accepted_join.spectator_id ?? null
    });
    sendSnapshotsToMatch(registry, sessions, match_id);
    return;
  }

  const command_result = parseCommandMessage(parsed_message);
  if (typeof command_result === "string") {
    sendJson(session.socket, {
      type: "command_rejected",
      reason: command_result
    });
    return;
  }

  const command = command_result;
  if (session.match_id === null || session.client_id === "") {
    sendJson(session.socket, {
      type: "command_rejected",
      reason: "client_not_joined"
    });
    return;
  }
  if (session.match_id !== command.match_id || session.client_id !== command.client_id) {
    sendJson(session.socket, {
      type: "command_rejected",
      reason: "session_command_mismatch"
    });
    return;
  }

  const result = registry.getOrCreate(command.match_id).handleCommand(command);
  if (!result.accepted) {
    sendJson(session.socket, {
      type: "command_rejected",
      reason: result.reason
    });
    return;
  }

  sendSnapshotsToMatch(registry, sessions, command.match_id);
}

function closeReplacedClientSessions(
  sessions: ReadonlySet<ClientSession>,
  current_session: ClientSession,
  match_id: string,
  client_id: string
): void {
  for (const session of sessions) {
    if (session === current_session) {
      continue;
    }
    if (session.match_id !== match_id || session.client_id !== client_id) {
      continue;
    }
    session.is_takeover_replaced = true;
    sendJson(session.socket, {
      type: "session_replaced",
      reason: "client_id_joined_elsewhere"
    });
    session.socket.close(4000, "client_id_joined_elsewhere");
  }
}

function sendSnapshotsToMatch(
  registry: EvanopolisRegistry,
  sessions: ReadonlySet<ClientSession>,
  match_id: string
): void {
  const match = registry.getOrCreate(match_id);
  for (const session of sessions) {
    if (session.match_id !== match_id || session.socket.readyState !== session.socket.OPEN) {
      continue;
    }
    sendJson(session.socket, {
      type: "match_snapshot",
      snapshot: match.snapshotFor(session.client_id)
    });
  }
}

function parseIncomingMessage(data: RawData): IncomingMessage | null {
  try {
    const parsed_message: unknown = JSON.parse(data.toString());
    if (typeof parsed_message !== "object" || parsed_message === null || Array.isArray(parsed_message)) {
      return null;
    }
    return parsed_message;
  } catch {
    return null;
  }
}

function parseJoinMessage(message: IncomingMessage): JoinMessage | string {
  if (typeof message.match_id !== "string" || message.match_id.trim() === "") {
    return "invalid_match_id";
  }
  if (typeof message.client_id !== "string" || message.client_id.trim() === "") {
    return "invalid_client_id";
  }
  return {
    match_id: message.match_id,
    client_id: message.client_id
  };
}

function parseCommandMessage(message: IncomingMessage): CommandEnvelope | string {
  if (typeof message.type !== "string" || message.type.trim() === "") {
    return "invalid_command_type";
  }
  if (typeof message.match_id !== "string" || message.match_id.trim() === "") {
    return "invalid_match_id";
  }
  if (typeof message.client_id !== "string" || message.client_id.trim() === "") {
    return "invalid_client_id";
  }
  if (typeof message.player_id !== "string" || message.player_id.trim() === "") {
    return "invalid_player_id";
  }
  if (typeof message.seen_revision !== "number" || !Number.isInteger(message.seen_revision)) {
    return "invalid_seen_revision";
  }
  if (!isJsonObject(message.payload)) {
    return "invalid_payload";
  }
  return {
    type: message.type,
    match_id: message.match_id,
    client_id: message.client_id,
    player_id: message.player_id,
    seen_revision: message.seen_revision,
    payload: message.payload
  };
}

function sendJson(socket: WebSocket, message: unknown): void {
  socket.send(JSON.stringify(message));
}

function isJsonObject(value: unknown): value is Record<string, JsonValue> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isJsonObject(value);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number.parseInt(process.env.PORT ?? `${DefaultPort}`, 10);
  const host = process.env.HOST ?? DefaultHost;
  const server = createHealthServer();
  server.listen(port, host, () => {
    console.log(`evanopolis-game-server listening on http://${host}:${port}`);
  });
}
