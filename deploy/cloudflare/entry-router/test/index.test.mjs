import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest, upstreamUrlFor } from "../src/index.mjs";

test("paid root resolves to the paid room entry page", () => {
    assert.equal(
        upstreamUrlFor("https://evanopolis.falafel.com.br/?chain_id=421614").href,
        "https://falafel-open-games.github.io/evanopolis-v1/room-entry.html?chain_id=421614",
    );
});

test("free path resolves to the free room entry page", () => {
    assert.equal(
        upstreamUrlFor("https://evanopolis.falafel.com.br/free?player_count=2").href,
        "https://falafel-open-games.github.io/evanopolis-v1/free-entry.html?player_count=2",
    );
});

test("asset and client paths remain unchanged below the upstream base path", () => {
    assert.equal(
        upstreamUrlFor("https://evanopolis.falafel.com.br/free-client.js?v=123").href,
        "https://falafel-open-games.github.io/evanopolis-v1/free-client.js?v=123",
    );
});

test("free slash redirects to the canonical path", async () => {
    const response = await handleRequest(
        new Request("https://evanopolis.falafel.com.br/free/?player_count=2"),
    );

    assert.equal(response.status, 308);
    assert.equal(
        response.headers.get("location"),
        "https://evanopolis.falafel.com.br/free?player_count=2",
    );
});

test("unexpected hosts and methods fail closed", async () => {
    const wrongHostResponse = await handleRequest(new Request("https://example.com/"));
    const postResponse = await handleRequest(
        new Request("https://evanopolis.falafel.com.br/", { method: "POST" }),
    );

    assert.equal(wrongHostResponse.status, 421);
    assert.equal(postResponse.status, 405);
});
