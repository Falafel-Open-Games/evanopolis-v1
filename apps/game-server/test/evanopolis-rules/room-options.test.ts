import assert from "node:assert/strict";
import test from "node:test";
import { parseEvanopolisJoinConfiguration } from "../../src/evanopolis-rules/room-options.js";

const GameId = "550e8400-e29b-41d4-a716-446655440000";
const Wallet = "0x20752daFA6AbB5AF33b5073Fa2A37cD37B552985";

interface StubRoom {
  readonly entry_fee_tier: string;
  readonly entry_fee_amount: string;
  readonly player_count: number;
}

async function joinPaidRoom(room: StubRoom): Promise<Awaited<ReturnType<typeof parseEvanopolisJoinConfiguration>>> {
  const original_fetch = globalThis.fetch;
  const original_rooms_url = process.env.EVANOPOLIS_ROOMS_API_URL;
  const original_auth_url = process.env.EVANOPOLIS_AUTH_API_URL;
  process.env.EVANOPOLIS_ROOMS_API_URL = "http://rooms.local";
  process.env.EVANOPOLIS_AUTH_API_URL = "http://auth.local";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith("http://rooms.local/")) {
      return Response.json({
        game_id: GameId,
        creator_display_name: "Host",
        created_at: "2026-10-22T12:00:00.000Z",
        ...room
      });
    }
    return Response.json({
      admitted: true,
      player: Wallet,
      gameId: GameId,
      amount: room.entry_fee_amount,
      txHash: `0x${"ab".repeat(32)}`,
      logIndex: 0,
      blockNumber: 1
    });
  };

  try {
    return await parseEvanopolisJoinConfiguration(
      { mode: "paid_room", auth_token: "jwt", match_id: GameId },
      undefined
    );
  } finally {
    globalThis.fetch = original_fetch;
    restoreEnv("EVANOPOLIS_ROOMS_API_URL", original_rooms_url);
    restoreEnv("EVANOPOLIS_AUTH_API_URL", original_auth_url);
  }
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

test("paid join builds a custom-ticket economy for a six-seat room", async () => {
  const result = await joinPaidRoom({
    entry_fee_tier: "custom",
    entry_fee_amount: "2750000000000000000",
    player_count: 6
  });

  assert.ok(typeof result !== "string", `join failed: ${String(result)}`);
  assert.equal(result.player_count, 6);
  assert.deepEqual(result.initial_state_options, {
    room_buy_in_eva: 2.75,
    entry_fee_tier: "custom",
    ticket_micro: 2_750_000
  });
});

test("paid join rejects room tickets that do not fit their tier", async () => {
  assert.equal(
    await joinPaidRoom({ entry_fee_tier: "average", entry_fee_amount: "100000000000000000", player_count: 3 }),
    "room_ticket_mismatch"
  );
  assert.equal(
    await joinPaidRoom({ entry_fee_tier: "custom", entry_fee_amount: "1000000000000000", player_count: 3 }),
    "room_ticket_mismatch"
  );
  assert.equal(
    await joinPaidRoom({ entry_fee_tier: "custom", entry_fee_amount: "2750000000000000000", player_count: 7 }),
    "invalid_room_response"
  );
});
