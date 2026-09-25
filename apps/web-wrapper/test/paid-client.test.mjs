import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";

const launcherSource = readFileSync(new URL("../paid-client.js", import.meta.url), "utf8");
const walletAddress = "0x20752daFA6AbB5AF33b5073Fa2A37cD37B552985";

function paidPage({ payloadState = "ready", selectedWallet = walletAddress } = {}) {
  const elements = new Map();
  const stored = new Map();
  const calls = [];
  const windowListeners = new Map();
  let reloadCount = 0;
  let fullscreenRequestCount = 0;
  let orientationLockValue = "";
  let frameFocusCount = 0;
  const expiresIn = payloadState === "expired" ? -60 : 900;
  const tokenClaims = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresIn }))
    .toString("base64url");
  if (payloadState !== "missing") {
    stored.set("paid-key", JSON.stringify({
      authToken: `header.${tokenClaims}.signature`,
      authApiUrl: "https://auth.example.test",
      expectedChainId: 421614,
      wallet: { address: walletAddress },
      room: { gameId: "paid-room" },
    }));
  }

  function element(id) {
    if (!elements.has(id)) {
      const listeners = new Map();
      elements.set(id, {
        hidden: id === "paid-reconnect-panel" || id === "game-frame" || id === "game-launch-panel",
        disabled: false,
        textContent: "",
        href: "",
        src: "",
        contentWindow: {},
        focus() { frameFocusCount += 1; },
        listeners,
        addEventListener(type, callback) { listeners.set(type, callback); },
        querySelector() { return { textContent: "" }; },
      });
    }
    return elements.get(id);
  }

  const window = {
    location: {
      search: "?match_id=paid-room&client_id=browser-a&paid_launch_key=paid-key",
      hostname: "example.test",
      origin: "https://example.test",
      href: "https://example.test/paid-client.html",
      reload() { reloadCount += 1; },
    },
    sessionStorage: {
      getItem(key) { return stored.get(key) ?? null; },
      setItem(key, value) { stored.set(key, value); },
    },
    atob(value) { return Buffer.from(value, "base64").toString("utf8"); },
    screen: {
      orientation: {
        async lock(value) { orientationLockValue = value; },
      },
    },
    addEventListener(type, callback) { windowListeners.set(type, callback); },
    ethereum: {
      async request(request) {
        calls.push(request.method);
        if (request.method === "eth_requestAccounts") return [selectedWallet];
        if (request.method === "eth_chainId") return "0x66eee";
        if (request.method === "personal_sign") return "signature";
        throw new Error(`Unexpected wallet method: ${request.method}`);
      },
    },
  };
  const fetch = async (url) => {
    calls.push(url);
    if (url === "./game/index.html") return { ok: true };
    if (url.endsWith("/auth/challenge")) {
      return { ok: true, async json() { return { nonce: "nonce", message: "Sign in" }; } };
    }
    if (url.endsWith("/auth/verify")) {
      return {
        ok: true,
        async json() { return { token: "new-token", expires_at: new Date(Date.now() + 900000).toISOString() }; },
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  runInNewContext(launcherSource, {
    document: {
      fullscreenElement: null,
      documentElement: {
        async requestFullscreen() { fullscreenRequestCount += 1; },
      },
      addEventListener() {},
      getElementById: element,
    },
    window, fetch, URL, URLSearchParams, Date, Number, Math, JSON,
  }, { filename: fileURLToPath(new URL("../paid-client.js", import.meta.url)) });

  return {
    element,
    stored,
    calls,
    get fullscreenRequestCount() { return fullscreenRequestCount; },
    get orientationLockValue() { return orientationLockValue; },
    get frameFocusCount() { return frameFocusCount; },
    dispatchMessage(data) {
      windowListeners.get("message")({ source: element("game-frame").contentWindow, data });
    },
    get reloadCount() { return reloadCount; },
  };
}

test("valid paid launch waits for a player gesture", async () => {
  const page = paidPage();
  await new Promise(setImmediate);
  assert.match(page.element("game-frame").src, /game\/index\.html/);
  assert.equal(page.element("game-frame").hidden, true);
  assert.equal(page.element("loading-panel").hidden, true);
  assert.equal(page.element("game-launch-panel").hidden, false);
  assert.equal(page.element("paid-reconnect-panel").hidden, true);
});

test("launch gesture requests fullscreen landscape and focuses the game", async () => {
  const page = paidPage();
  await new Promise(setImmediate);
  await page.element("game-launch-button").listeners.get("click")();
  assert.equal(page.fullscreenRequestCount, 1);
  assert.equal(page.orientationLockValue, "landscape");
  assert.equal(page.element("game-launch-panel").hidden, true);
  assert.equal(page.element("game-frame").hidden, false);
  assert.equal(page.frameFocusCount, 1);
  assert.equal(page.element("game-fullscreen-button").hidden, false);
  await page.element("game-fullscreen-button").listeners.get("click")();
  assert.equal(page.fullscreenRequestCount, 2);
  assert.equal(page.frameFocusCount, 2);
});

test("missing paid launch returns the player to room entry", async () => {
  const page = paidPage({ payloadState: "missing" });
  await new Promise(setImmediate);
  assert.equal(page.element("paid-reconnect-panel").hidden, false);
  assert.equal(page.element("paid-reconnect-button").hidden, true);
  assert.match(page.element("paid-reconnect-room-link").href, /room-entry\.html/);
});

test("expired paid launch renews the same wallet session", async () => {
  const page = paidPage({ payloadState: "expired" });
  await new Promise(setImmediate);
  await page.element("paid-reconnect-button").listeners.get("click")();
  assert.equal(page.reloadCount, 1);
  assert.equal(JSON.parse(page.stored.get("paid-key")).authToken, "new-token");
});

test("game auth expiry replaces the iframe with wallet recovery", async () => {
  const page = paidPage();
  await new Promise(setImmediate);
  page.dispatchMessage({ protocol: "evanopolis-godot-client-status", type: "auth_expired" });
  assert.equal(page.element("game-frame").hidden, true);
  assert.equal(page.element("paid-reconnect-panel").hidden, false);
});
