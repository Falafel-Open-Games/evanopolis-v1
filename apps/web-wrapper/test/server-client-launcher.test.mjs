import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";

const launcherSource = readFileSync(new URL("../server-client-launcher.js", import.meta.url), "utf8");
const walletAddress = "0x20752daFA6AbB5AF33b5073Fa2A37cD37B552985";

function launchPage({ expired, selectedWallet = walletAddress }) {
  const elements = new Map();
  const stored = new Map();
  const calls = [];
  let reloadCount = 0;
  const tokenClaims = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + (expired ? -60 : 900) }))
    .toString("base64url");
  stored.set("paid-key", JSON.stringify({
    mode: "paid_room",
    authToken: `header.${tokenClaims}.signature`,
    authApiUrl: "https://auth.example.test",
    expectedChainId: 421614,
    wallet: { address: walletAddress },
    room: { gameId: "paid-room" },
  }));

  function element(id) {
    if (!elements.has(id)) {
      const listeners = new Map();
      elements.set(id, {
        hidden: id === "paid-reconnect-panel",
        disabled: false,
        textContent: "",
        value: "",
        href: "",
        src: "",
        listeners,
        classList: { add() {}, remove() {} },
        addEventListener(type, callback) { listeners.set(type, callback); },
      });
    }
    return elements.get(id);
  }

  const window = {
    location: {
      search: "?mode=paid_room&match_id=paid-room&client_id=browser-a&paid_launch_key=paid-key",
      hostname: "example.test",
      origin: "https://example.test",
      href: "https://example.test/server-client.html?mode=paid_room",
      pathname: "/server-client.html",
      hash: "",
      reload() { reloadCount += 1; },
    },
    sessionStorage: {
      getItem(key) { return stored.get(key) ?? null; },
      setItem(key, value) { stored.set(key, value); },
    },
    history: { replaceState() {} },
    atob(value) { return Buffer.from(value, "base64").toString("utf8"); },
    addEventListener() {},
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
    document: { getElementById: element }, window, fetch, URL, URLSearchParams, Date, Number, Math, JSON,
  }, { filename: fileURLToPath(new URL("../server-client-launcher.js", import.meta.url)) });
  return { element, stored, calls, get reloadCount() { return reloadCount; } };
}

test("expired paid launch asks for the same wallet and renews without payment", async () => {
  const page = launchPage({ expired: true });
  await new Promise(setImmediate);
  assert.equal(page.element("paid-reconnect-panel").hidden, false);
  assert.equal(page.element("game-frame").src, "");
  assert.equal(page.calls.length, 0);

  await page.element("paid-reconnect-button").listeners.get("click")();
  assert.equal(page.reloadCount, 1);
  assert.equal(JSON.parse(page.stored.get("paid-key")).authToken, "new-token");
  assert.equal(page.calls.includes("https://auth.example.test/auth/challenge"), true);
  assert.equal(page.calls.includes("https://auth.example.test/auth/verify"), true);
});

test("paid reconnect refuses a different wallet before requesting a challenge", async () => {
  const page = launchPage({ expired: true, selectedWallet: "0x0000000000000000000000000000000000000001" });
  await new Promise(setImmediate);
  await page.element("paid-reconnect-button").listeners.get("click")();
  assert.equal(page.reloadCount, 0);
  assert.match(page.element("paid-reconnect-status").textContent, /wallet that paid/);
  assert.equal(page.calls.includes("https://auth.example.test/auth/challenge"), false);
});

test("valid paid launch loads the game without a new signature", async () => {
  const page = launchPage({ expired: false });
  await new Promise(setImmediate);
  assert.match(page.element("game-frame").src, /game\/index\.html/);
  assert.equal(page.element("paid-reconnect-panel").hidden, true);
  assert.equal(page.calls.includes("eth_requestAccounts"), false);
});
