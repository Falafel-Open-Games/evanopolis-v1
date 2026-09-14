import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { RoomsApiConfig } from "./config.js";
import { RoomsStore } from "./storage.js";
import type { AuthWhoamiResponse, PublicRoomRecord, RoomRecord } from "./types.js";
import { EntryFeeAmounts, parseCreateRoomRequest } from "./validation.js";

const BodyLimitBytes = 16 * 1024;

export interface RoomsApiServerDependencies {
  readonly fetch_impl?: typeof fetch;
  readonly now?: () => string;
  readonly store?: RoomsStore;
}

export async function createRoomsApiServer(
  config: RoomsApiConfig,
  dependencies: RoomsApiServerDependencies = {}
) {
  const fetch_impl = dependencies.fetch_impl ?? fetch;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const store = dependencies.store ?? new RoomsStore(config.rooms_data_file);

  await store.initialize();

  return createServer(async (request, response) => {
    try {
      await handleRequest(config, store, fetch_impl, now, request, response);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, {
        error: "internal_error"
      });
    }
  });
}

async function handleRequest(
  config: RoomsApiConfig,
  store: RoomsStore,
  fetch_impl: typeof fetch,
  now: () => string,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  applyCors(config, request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", "http://rooms-api.local");
  if (request.method === "GET" && url.pathname === "/healthz") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/v0/rooms") {
    await handleCreateRoom(config, store, fetch_impl, now, request, response);
    return;
  }

  const room_lookup_match = /^\/v0\/rooms\/([^/]+)$/.exec(url.pathname);
  if (request.method === "GET" && room_lookup_match !== null) {
    handleGetRoom(store, decodeURIComponent(room_lookup_match[1] ?? ""), response);
    return;
  }

  sendJson(response, 404, {
    error: "not_found"
  });
}

async function handleCreateRoom(
  config: RoomsApiConfig,
  store: RoomsStore,
  fetch_impl: typeof fetch,
  now: () => string,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    sendJson(response, body.status, {
      error: body.error
    });
    return;
  }

  const parsed = parseCreateRoomRequest(body.value);
  if (!parsed.ok) {
    sendJson(response, 400, {
      error: "bad_request",
      details: parsed.details
    });
    return;
  }

  const auth_result = await verifyBearerToken(config, request.headers.authorization, fetch_impl);
  if (!auth_result.ok) {
    sendJson(response, auth_result.status, auth_result.body);
    return;
  }

  const room: RoomRecord = {
    game_id: randomUUID(),
    created_by: auth_result.subject,
    creator_display_name: parsed.request.creator_display_name,
    entry_fee_tier: parsed.request.entry_fee_tier,
    entry_fee_amount: EntryFeeAmounts[parsed.request.entry_fee_tier],
    player_count: parsed.request.player_count,
    ...(parsed.request.experimental === undefined ? {} : { experimental: parsed.request.experimental }),
    created_at: now()
  };
  await store.createRoom(room);
  sendJson(response, 201, room);
}

function handleGetRoom(store: RoomsStore, game_id: string, response: ServerResponse): void {
  const room = store.getRoom(game_id);
  if (room === null) {
    sendJson(response, 404, {
      error: "room_not_found"
    });
    return;
  }

  sendJson(response, 200, publicRoom(room));
}

async function verifyBearerToken(
  config: RoomsApiConfig,
  authorization_header: string | undefined,
  fetch_impl: typeof fetch
): Promise<
  | { readonly ok: true; readonly subject: string }
  | { readonly ok: false; readonly status: number; readonly body: Record<string, unknown> }
> {
  if (authorization_header === undefined || !authorization_header.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      status: 401,
      body: { error: "missing_token" }
    };
  }

  let auth_response: Response;
  try {
    auth_response = await fetch_impl(new URL(config.auth_verify_path, config.auth_base_url), {
      headers: {
        Authorization: authorization_header
      }
    });
  } catch {
    return {
      ok: false,
      status: 502,
      body: { error: "auth_service_unavailable" }
    };
  }

  if (!auth_response.ok) {
    return {
      ok: false,
      status: 401,
      body: { error: "unauthorized" }
    };
  }

  const payload = await auth_response.json() as AuthWhoamiResponse;
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    return {
      ok: false,
      status: 502,
      body: { error: "invalid_auth_response" }
    };
  }

  return {
    ok: true,
    subject: payload.sub
  };
}

function publicRoom(room: RoomRecord): PublicRoomRecord {
  const { created_by: _created_by, ...public_room } = room;
  return public_room;
}

function applyCors(config: RoomsApiConfig, request: IncomingMessage, response: ServerResponse): void {
  const origin = request.headers.origin;
  if (origin !== undefined && config.allowed_origins.includes(origin)) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "origin");
  }
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization,content-type");
}

async function readJsonBody(request: IncomingMessage): Promise<
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly status: number; readonly error: string }
> {
  const chunks: Buffer[] = [];
  let total_bytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total_bytes += buffer.byteLength;
    if (total_bytes > BodyLimitBytes) {
      return {
        ok: false,
        status: 413,
        error: "body_too_large"
      };
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "invalid_json"
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(Buffer.concat(chunks).toString("utf8"))
    };
  } catch {
    return {
      ok: false,
      status: 400,
      error: "invalid_json"
    };
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json"
  });
  response.end(JSON.stringify(body));
}
