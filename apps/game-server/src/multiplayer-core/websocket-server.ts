import { createServer } from "node:http";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import { MatchRegistry } from "./match-registry.js";
import type {
  CommandEnvelope,
  CommandResult,
  JsonValue,
  RevisionedMatchEvent,
  RulesAdapter,
  RulesInitialStateOptions
} from "./types.js";
import type { MatchSession } from "./match-session.js";
import type { MatchPersistence, PersistedMatch } from "./match-persistence.js";

interface ClientSession {
  readonly socket: WebSocket;
  readonly connection_id: string;
  client_id: string;
  seat_client_id: string;
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
  readonly [key: string]: unknown;
};

interface JoinIdentity {
  readonly match_id: string;
  readonly client_id: string;
}

type MaybePromise<T> = T | Promise<T>;

class MatchPersistenceUnavailableError extends Error {
  constructor(cause: unknown) {
    super("match persistence unavailable", { cause });
  }
}

export interface ParsedJoinConfiguration {
  readonly player_count: number;
  readonly join_mode?: "free_play" | "paid_room";
  readonly seat_client_id?: string;
  readonly initial_state_options?: RulesInitialStateOptions | undefined;
  readonly log_fields?: Record<string, unknown> | undefined;
}

export interface MatchWebSocketServerOptions<State, Snapshot, Definition> {
  readonly service_name: string;
  readonly build_version: string;
  readonly default_player_count: number;
  readonly rules: RulesAdapter<State, Snapshot, Definition>;
  readonly parse_join_configuration: (
    message: IncomingMessage,
    existing_match: MatchSession<State, Snapshot, Definition> | undefined
  ) => MaybePromise<ParsedJoinConfiguration | string>;
  readonly describe_accepted_command?: (
    result: CommandResult<Snapshot>,
    command: CommandEnvelope
  ) => readonly { message: string; fields: Record<string, unknown> }[];
  readonly should_log_events?: boolean | undefined;
  readonly persistence?: MatchPersistence<State> | undefined;
}

let next_connection_index = 1;

export function createMatchWebSocketServer<State, Snapshot, Definition>(
  options: MatchWebSocketServerOptions<State, Snapshot, Definition>
) {
  const registry = new MatchRegistry({
    player_count: options.default_player_count,
    rules: options.rules
  });
  const should_log_events = options.should_log_events ?? true;

  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: true,
          service: options.service_name,
          version: options.build_version
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
  const match_operations = new Map<string, Promise<void>>();

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
      seat_client_id: "",
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
      const operation_key = operationKey(data, session);
      const previous_operation = match_operations.get(operation_key) ?? Promise.resolve();
      const operation = previous_operation.catch(() => undefined).then(() =>
        handleSocketMessage(registry, sessions, session, data, options, should_log_events)
      );
      match_operations.set(operation_key, operation);
      operation.catch((error: unknown) => {
        logServerEvent(
          "message handling failed",
          {
            reason: error instanceof Error ? error.message : String(error)
          },
          should_log_events
        );
        sendJson(session.socket, {
          type: "command_rejected",
          reason: error instanceof MatchPersistenceUnavailableError
            ? "persistence_unavailable"
            : "internal_server_error"
        });
      }).finally(() => {
        if (match_operations.get(operation_key) === operation) {
          match_operations.delete(operation_key);
        }
      });
    });

    socket.on("close", () => {
      sessions.delete(session);
      if (session.match_id === null || session.seat_client_id === "" || session.is_takeover_replaced) {
        return;
      }

      const match = registry.get(session.match_id);
      if (match === undefined) {
        return;
      }
      match.disconnect(session.seat_client_id);
      sendSnapshotsToMatch(registry, sessions, session.match_id);
    });
  });

  return server;
}

async function handleSocketMessage<State, Snapshot, Definition>(
  registry: MatchRegistry<State, Snapshot, Definition>,
  sessions: ReadonlySet<ClientSession>,
  session: ClientSession,
  data: RawData,
  options: MatchWebSocketServerOptions<State, Snapshot, Definition>,
  should_log_events: boolean
): Promise<void> {
  const parsed_message = parseIncomingMessage(data);
  if (parsed_message === null) {
    sendJson(session.socket, {
      type: "command_rejected",
      reason: "invalid_json"
    });
    return;
  }

  if (parsed_message.type === "join_match") {
    const join_identity = parseJoinIdentity(parsed_message);
    if (typeof join_identity === "string") {
      sendJson(session.socket, {
        type: "command_rejected",
        reason: join_identity
      });
      return;
    }

    const match_id = join_identity.match_id;
    const client_id = join_identity.client_id;
    const existing_match = await loadMatch(registry, options.persistence, match_id);
    const join_configuration = await options.parse_join_configuration(parsed_message, existing_match);
    if (typeof join_configuration === "string") {
      sendJson(session.socket, {
        type: "command_rejected",
        reason: join_configuration
      });
      return;
    }

    const join_mode = join_configuration.join_mode ?? "free_play";
    const seat_client_id = join_configuration.seat_client_id ?? client_id;
    const current_match = registry.get(match_id);
    if (current_match !== undefined && current_match.join_mode !== join_mode) {
      sendJson(session.socket, { type: "command_rejected", reason: "join_mode_mismatch" });
      return;
    }
    if (join_mode === "paid_room" && current_match !== undefined && !current_match.canJoinAsPlayer(seat_client_id)) {
      sendJson(session.socket, { type: "command_rejected", reason: "room_full" });
      return;
    }

    const match = registry.getOrCreate(
      match_id,
      join_configuration.player_count,
      join_configuration.initial_state_options,
      join_mode
    );
    const state_before_join = match.persistedState();
    const accepted_join = match.join(seat_client_id);
    if (!await persistMatch(options.persistence, match, state_before_join, session.socket)) {
      return;
    }
    closeReplacedClientSessions(sessions, session, match_id, seat_client_id);
    session.match_id = match_id;
    session.client_id = client_id;
    session.seat_client_id = seat_client_id;
    logServerEvent(
      "join accepted",
      {
        match_id,
        client_id,
        player_count: match.player_count,
        ...(join_configuration.log_fields ?? {}),
        role: accepted_join.role,
        player_id: accepted_join.player_id ?? null,
        spectator_id: accepted_join.spectator_id ?? null
      },
      should_log_events
    );
    sendJson(session.socket, {
      type: "join_accepted",
      role: accepted_join.role,
      player_id: accepted_join.player_id ?? null,
      spectator_id: accepted_join.spectator_id ?? null
    });
    sendJson(session.socket, {
      type: "match_definition",
      definition: accepted_join.definition
    });
    sendSnapshotsToMatch(registry, sessions, match_id);
    return;
  }

  if (parsed_message.type === "inspect_match") {
    if (typeof parsed_message.match_id !== "string" || parsed_message.match_id.trim() === "") {
      sendJson(session.socket, { type: "command_rejected", reason: "invalid_match_id" });
      return;
    }
    const match = await loadMatch(registry, options.persistence, parsed_message.match_id);
    sendJson(session.socket, {
      type: "match_presence",
      match_id: parsed_message.match_id,
      exists: match !== undefined,
      ...(match === undefined ? {} : match.publicPresence())
    });
    return;
  }

  if (parsed_message.type === "request_snapshot") {
    const snapshot_identity = parseSnapshotRequestIdentity(parsed_message);
    if (typeof snapshot_identity === "string") {
      sendJson(session.socket, { type: "command_rejected", reason: snapshot_identity });
      return;
    }
    if (session.match_id === null || session.client_id === "") {
      sendJson(session.socket, { type: "command_rejected", reason: "client_not_joined" });
      return;
    }
    if (
      session.match_id !== snapshot_identity.match_id
      || session.client_id !== snapshot_identity.client_id
    ) {
      sendJson(session.socket, { type: "command_rejected", reason: "session_command_mismatch" });
      return;
    }
    const match = registry.get(snapshot_identity.match_id);
    if (match === undefined) {
      sendJson(session.socket, { type: "command_rejected", reason: "invalid_match_id" });
      return;
    }
    sendJson(session.socket, {
      type: "match_snapshot",
      snapshot: match.snapshotFor(session.seat_client_id)
    });
    return;
  }

  const command_result = parseCommandMessage(parsed_message);
  if (typeof command_result === "string") {
    logServerEvent(
      "command rejected",
      {
        reason: command_result,
        raw_type: typeof parsed_message.type === "string" ? parsed_message.type : null
      },
      should_log_events
    );
    sendJson(session.socket, {
      type: "command_rejected",
      reason: command_result
    });
    return;
  }

  const command = command_result;
  if (session.match_id === null || session.client_id === "") {
    logServerEvent(
      "command rejected",
      {
        reason: "client_not_joined",
        type: command.type
      },
      should_log_events
    );
    sendJson(session.socket, {
      type: "command_rejected",
      reason: "client_not_joined"
    });
    return;
  }
  if (session.match_id !== command.match_id || session.client_id !== command.client_id) {
    logServerEvent(
      "command rejected",
      {
        reason: "session_command_mismatch",
        type: command.type,
        session_match_id: session.match_id,
        command_match_id: command.match_id,
        session_client_id: session.client_id,
        command_client_id: command.client_id
      },
      should_log_events
    );
    sendJson(session.socket, {
      type: "command_rejected",
      reason: "session_command_mismatch"
    });
    return;
  }

  const match = registry.get(command.match_id);
  if (match === undefined) {
    sendJson(session.socket, {
      type: "command_rejected",
      reason: "invalid_match_id"
    });
    return;
  }

  const seat_command = { ...command, client_id: session.seat_client_id };
  const state_before_command = match.persistedState();
  const result = match.handleCommand(seat_command);
  if (!result.accepted) {
    logServerEvent(
      "command rejected",
      {
        reason: result.reason,
        type: command.type,
        match_id: command.match_id,
        client_id: command.client_id,
        player_id: command.player_id ?? null,
        seen_revision: command.seen_revision
      },
      should_log_events
    );
    sendJson(session.socket, {
      type: "command_rejected",
      reason: result.reason,
      server_revision: match.getRevision()
    });
    if (result.reason === "stale_revision") {
      sendJson(session.socket, {
        type: "match_snapshot",
        snapshot: match.snapshotFor(session.seat_client_id)
      });
    }
    return;
  }

  if (!await persistMatch(options.persistence, match, state_before_command, session.socket)) {
    return;
  }

  logServerEvent(
    "command accepted",
    {
      type: command.type,
      match_id: command.match_id,
      client_id: command.client_id,
      player_id: command.player_id ?? null,
      seen_revision: command.seen_revision,
      event_count: result.events.length,
      events: result.events.map(summarizeRevisionedEvent)
    },
    should_log_events
  );
  for (const log_entry of options.describe_accepted_command?.(result, seat_command) ?? []) {
    logServerEvent(log_entry.message, log_entry.fields, should_log_events);
  }
  sendEventsToMatch(sessions, command.match_id, result.events);
  sendSnapshotsToMatch(registry, sessions, command.match_id);
}

function logServerEvent(message: string, fields: Record<string, unknown>, should_log_events: boolean): void {
  if (!should_log_events) {
    return;
  }

  console.log(message, JSON.stringify(fields));
}

function summarizeRevisionedEvent(event: RevisionedMatchEvent): Record<string, unknown> {
  if (typeof event.event !== "object" || event.event === null || Array.isArray(event.event)) {
    return {
      revision: event.revision,
      event: event.event
    };
  }

  return {
    revision: event.revision,
    ...event.event
  };
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
    if (session.match_id !== match_id || session.seat_client_id !== client_id) {
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

function sendSnapshotsToMatch<State, Snapshot, Definition>(
  registry: MatchRegistry<State, Snapshot, Definition>,
  sessions: ReadonlySet<ClientSession>,
  match_id: string
): void {
  const match = registry.get(match_id);
  if (match === undefined) {
    return;
  }
  for (const session of sessions) {
    if (session.match_id !== match_id || session.socket.readyState !== session.socket.OPEN) {
      continue;
    }
    sendJson(session.socket, {
      type: "match_snapshot",
      snapshot: match.snapshotFor(session.seat_client_id)
    });
  }
}

function sendEventsToMatch(
  sessions: ReadonlySet<ClientSession>,
  match_id: string,
  events: readonly RevisionedMatchEvent[]
): void {
  for (const event of events) {
    for (const session of sessions) {
      if (session.match_id !== match_id || session.socket.readyState !== session.socket.OPEN) {
        continue;
      }
      sendJson(session.socket, {
        type: "match_event",
        match_id: event.match_id,
        revision: event.revision,
        event: event.event
      });
    }
  }
}

function operationKey(data: RawData, session: ClientSession): string {
  const parsed_message = parseIncomingMessage(data);
  if (parsed_message !== null && typeof parsed_message.match_id === "string" && parsed_message.match_id !== "") {
    return `match:${parsed_message.match_id}`;
  }
  if (session.match_id !== null) {
    return `match:${session.match_id}`;
  }
  return `connection:${session.connection_id}`;
}

async function loadMatch<State, Snapshot, Definition>(
  registry: MatchRegistry<State, Snapshot, Definition>,
  persistence: MatchPersistence<State> | undefined,
  match_id: string
): Promise<MatchSession<State, Snapshot, Definition> | undefined> {
  const in_memory_match = registry.get(match_id);
  if (in_memory_match !== undefined || persistence === undefined) {
    return in_memory_match;
  }
  let persisted_match: PersistedMatch<State> | undefined;
  try {
    persisted_match = await persistence.load(match_id);
  } catch (error: unknown) {
    throw new MatchPersistenceUnavailableError(error);
  }
  return persisted_match === undefined ? undefined : registry.restore(persisted_match);
}

async function persistMatch<State, Snapshot, Definition>(
  persistence: MatchPersistence<State> | undefined,
  match: MatchSession<State, Snapshot, Definition>,
  previous_state: PersistedMatch<State>,
  socket: WebSocket
): Promise<boolean> {
  if (persistence === undefined) {
    return true;
  }
  try {
    await persistence.save(match.persistedState());
    return true;
  } catch (error: unknown) {
    match.restoreFrom(previous_state);
    console.error("match persistence failed", error);
    sendJson(socket, {
      type: "command_rejected",
      reason: "persistence_unavailable"
    });
    return false;
  }
}

function parseIncomingMessage(data: RawData): IncomingMessage | null {
  try {
    const parsed_message: unknown = JSON.parse(data.toString());
    if (typeof parsed_message !== "object" || parsed_message === null || Array.isArray(parsed_message)) {
      return null;
    }
    return parsed_message as IncomingMessage;
  } catch {
    return null;
  }
}

function parseJoinIdentity(message: IncomingMessage): JoinIdentity | string {
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

function parseSnapshotRequestIdentity(message: IncomingMessage): JoinIdentity | string {
  if (typeof message.match_id !== "string" || message.match_id.trim() === "") {
    return "invalid_match_id";
  }
  if (typeof message.client_id !== "string" || message.client_id.trim() === "") {
    return "invalid_client_id";
  }
  if (typeof message.seen_revision !== "number" || !Number.isInteger(message.seen_revision)) {
    return "invalid_seen_revision";
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
