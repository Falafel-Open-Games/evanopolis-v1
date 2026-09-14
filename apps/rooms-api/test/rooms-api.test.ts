import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { loadConfig } from "../src/config.js";
import { createRoomsApiServer } from "../src/server.js";
import { RoomsStore } from "../src/storage.js";
import type { RoomsApiConfig } from "../src/config.js";

const BaseConfig: RoomsApiConfig = {
  port: 0,
  host: "127.0.0.1",
  auth_base_url: "http://auth.local",
  auth_verify_path: "/whoami",
  allowed_origins: [],
  rooms_data_file: "",
  verbose_logs: false
};

interface JsonResponse {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

test("health endpoint returns ok", async () => {
  await withServer(async (base_url) => {
    const response = await getJson(`${base_url}/healthz`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true });
  });
});

test("config enables verbose logs only with explicit flag", () => {
  assert.equal(loadConfig({ AUTH_BASE_URL: "http://auth.local" }).verbose_logs, false);
  assert.equal(loadConfig({ AUTH_BASE_URL: "http://auth.local", ROOMS_API_VERBOSE_LOGS: "1" }).verbose_logs, true);
  assert.equal(loadConfig({ AUTH_BASE_URL: "http://auth.local", ROOMS_API_VERBOSE_LOGS: "true" }).verbose_logs, true);
  assert.equal(loadConfig({ AUTH_BASE_URL: "http://auth.local", ROOMS_API_VERBOSE_LOGS: "yes" }).verbose_logs, true);
});

test("authenticated room creation stores canonical room metadata", async () => {
  const auth_calls: string[] = [];

  await withServer(async (base_url) => {
    const create_response = await postJson(
      `${base_url}/v0/rooms`,
      {
        creator_display_name: " Falafel Host ",
        entry_fee_tier: "average",
        player_count: 4,
        experimental: {
          turn_duration_seconds: 60
        }
      },
      "Bearer valid-token"
    );

    assert.equal(create_response.status, 201);
    assert.match(String(create_response.body.game_id), /^[0-9a-f-]{36}$/);
    assert.equal(create_response.body.created_by, "0xabc");
    assert.equal(create_response.body.creator_display_name, "Falafel Host");
    assert.equal(create_response.body.entry_fee_tier, "average");
    assert.equal(create_response.body.entry_fee_amount, "500000000000000000");
    assert.equal(create_response.body.player_count, 4);
    assert.deepEqual(create_response.body.experimental, { turn_duration_seconds: 60 });
    assert.equal(create_response.body.created_at, "2026-09-14T12:00:00.000Z");

    const lookup_response = await getJson(`${base_url}/v0/rooms/${String(create_response.body.game_id)}`);
    assert.equal(lookup_response.status, 200);
    assert.equal(Object.hasOwn(lookup_response.body, "created_by"), false);
    assert.equal(lookup_response.body.game_id, create_response.body.game_id);
    assert.equal(lookup_response.body.creator_display_name, "Falafel Host");
    assert.equal(lookup_response.body.entry_fee_amount, "500000000000000000");
  }, {
    fetch_impl: async (input, init) => {
      auth_calls.push(`${String(input)} ${String(init?.headers instanceof Headers ? init.headers.get("Authorization") : (init?.headers as Record<string, string>).Authorization)}`);
      return Response.json({ sub: "0xabc" });
    }
  });

  assert.deepEqual(auth_calls, ["http://auth.local/whoami Bearer valid-token"]);
});

test("room creation rejects missing bearer token", async () => {
  await withServer(async (base_url) => {
    const response = await postJson(`${base_url}/v0/rooms`, {
      creator_display_name: "Falafel Host",
      entry_fee_tier: "cheap",
      player_count: 2
    });

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: "missing_token" });
  });
});

test("room creation rejects invalid payloads before auth verification", async () => {
  let auth_call_count = 0;
  await withServer(async (base_url) => {
    const response = await postJson(
      `${base_url}/v0/rooms`,
      {
        creator_display_name: "",
        entry_fee_tier: "expensive",
        player_count: 5
      },
      "Bearer valid-token"
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "bad_request");
    assert.deepEqual(response.body.details, [
      {
        field: "creator_display_name",
        message: "must be between 1 and 32 characters"
      },
      {
        field: "entry_fee_tier",
        message: "must be one of cheap, average, deluxe"
      },
      {
        field: "player_count",
        message: "must be one of 2, 3, or 4"
      }
    ]);
  }, {
    fetch_impl: async () => {
      auth_call_count += 1;
      return Response.json({ sub: "0xabc" });
    }
  });

  assert.equal(auth_call_count, 0);
});

test("room creation reports auth service failures", async () => {
  await withServer(async (base_url) => {
    const response = await postJson(
      `${base_url}/v0/rooms`,
      {
        creator_display_name: "Falafel Host",
        entry_fee_tier: "cheap",
        player_count: 2
      },
      "Bearer rejected-token"
    );

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: "unauthorized" });
  }, {
    fetch_impl: async () => new Response("nope", { status: 401 })
  });
});

test("unknown room returns room_not_found", async () => {
  await withServer(async (base_url) => {
    const response = await getJson(`${base_url}/v0/rooms/550e8400-e29b-41d4-a716-446655440000`);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: "room_not_found" });
  });
});

test("store persists rooms to an optional JSON file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rooms-api-"));
  try {
    const rooms_data_file = join(directory, "rooms.json");
    const store = new RoomsStore(rooms_data_file);
    await store.initialize();
    await store.createRoom({
      game_id: "550e8400-e29b-41d4-a716-446655440000",
      created_by: "0xabc",
      creator_display_name: "Falafel Host",
      entry_fee_tier: "cheap",
      entry_fee_amount: "100000000000000000",
      player_count: 3,
      created_at: "2026-09-14T12:00:00.000Z"
    });

    const reloaded_store = new RoomsStore(rooms_data_file);
    await reloaded_store.initialize();
    assert.deepEqual(reloaded_store.getRoom("550e8400-e29b-41d4-a716-446655440000"), {
      game_id: "550e8400-e29b-41d4-a716-446655440000",
      created_by: "0xabc",
      creator_display_name: "Falafel Host",
      entry_fee_tier: "cheap",
      entry_fee_amount: "100000000000000000",
      player_count: 3,
      created_at: "2026-09-14T12:00:00.000Z"
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("store skips incompatible persisted room records", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rooms-api-"));
  try {
    const rooms_data_file = join(directory, "rooms.json");
    await writeFile(
      rooms_data_file,
      JSON.stringify([
        {
          game_id: "11111111-1111-4111-8111-111111111111",
          created_by: "0xlegacy",
          player_count: 2,
          created_at: "2026-09-14T11:00:00.000Z"
        },
        {
          game_id: "550e8400-e29b-41d4-a716-446655440000",
          created_by: "0xabc",
          creator_display_name: "Falafel Host",
          entry_fee_tier: "cheap",
          entry_fee_amount: "100000000000000000",
          player_count: 3,
          created_at: "2026-09-14T12:00:00.000Z"
        }
      ])
    );

    const store = new RoomsStore(rooms_data_file);
    await store.initialize();
    assert.equal(store.getRoom("11111111-1111-4111-8111-111111111111"), null);
    assert.equal(store.getRoom("550e8400-e29b-41d4-a716-446655440000")?.creator_display_name, "Falafel Host");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

async function withServer(
  run: (base_url: string) => Promise<void>,
  dependencies: Parameters<typeof createRoomsApiServer>[1] = {}
): Promise<void> {
  const server = await createRoomsApiServer(
    BaseConfig,
    {
      now: () => "2026-09-14T12:00:00.000Z",
      fetch_impl: async () => Response.json({ sub: "0xabc" }),
      ...dependencies
    }
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

async function getJson(url: string): Promise<JsonResponse> {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json() as Record<string, unknown>
  };
}

async function postJson(url: string, body: unknown, authorization?: string): Promise<JsonResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authorization === undefined ? {} : { authorization })
    },
    body: JSON.stringify(body)
  });

  return {
    status: response.status,
    body: await response.json() as Record<string, unknown>
  };
}
