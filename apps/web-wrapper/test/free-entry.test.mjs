import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";

const entrySource = readFileSync(new URL("../free-entry.js", import.meta.url), "utf8");
const clientSource = readFileSync(new URL("../free-client.js", import.meta.url), "utf8");

function elementsFor(initiallyHidden = []) {
  const elements = new Map();
  return function element(id) {
    if (!elements.has(id)) {
      const listeners = new Map();
      elements.set(id, {
        hidden: initiallyHidden.includes(id),
        textContent: "",
        value: id === "free-player-count-select" ? "3" : "",
        href: "",
        src: "",
        dataset: {},
        listeners,
        focus() {},
        addEventListener(type, callback) { listeners.set(type, callback); },
        removeAttribute() {},
        select() {},
      });
    }
    return elements.get(id);
  };
}

function entryPage(search = "") {
  const element = elementsFor(["free-room-details", "free-room-actions"]);
  let assignedUrl = "";
  const window = {
    location: {
      search,
      hostname: "example.test",
      origin: "https://example.test",
      pathname: "/free-entry.html",
      hash: "",
      assign(value) { assignedUrl = value; },
    },
    history: { replaceState() {} },
  };
  runInNewContext(entrySource, {
    document: { getElementById: element }, window, navigator: { clipboard: { async writeText() {} } },
    URLSearchParams, Date, Math, globalThis: {},
  }, { filename: fileURLToPath(new URL("../free-entry.js", import.meta.url)) });
  return { element, get assignedUrl() { return assignedUrl; } };
}

test("host creates a shareable free game and enters through the minimal client", () => {
  const page = entryPage();
  page.element("free-room-form").listeners.get("submit")({ preventDefault() {} });
  assert.equal(page.element("free-room-details").hidden, false);
  assert.equal(page.element("free-room-actions").hidden, false);
  assert.match(page.element("free-invite-link").value, /match_id=free-/);
  page.element("enter-free-game-button").listeners.get("click")();
  assert.match(page.assignedUrl, /^\.\/free-client\.html\?/);
  assert.match(page.assignedUrl, /mode=free_play/);
  assert.match(page.assignedUrl, /entry_fee_tier=average/);
  assert.doesNotMatch(page.assignedUrl, /room_buy_in_eva=50/);
});

test("invitee sees room details and no host sharing controls", () => {
  const page = entryPage("?match_id=free-room&player_count=2&server_url=wss%3A%2F%2Fgame.example.test%2Fmatch");
  assert.equal(page.element("free-room-player-count").textContent, "2");
  assert.equal(page.element("create-another-free-room-button").hidden, true);
  assert.equal(page.element("free-invite-panel").hidden, true);
  assert.equal(page.element("free-next-title").textContent, "Join this game");
});

function clientPage({ matchId = "free-room", exportAvailable = true } = {}) {
  const element = elementsFor(["game-frame", "game-launch-panel", "free-client-error"]);
  let fullscreenRequestCount = 0;
  let orientationLockValue = "";
  let frameFocusCount = 0;
  element("game-frame").focus = () => { frameFocusCount += 1; };
  const window = {
    location: {
      search: `?match_id=${matchId}&player_count=2`,
      hostname: "example.test",
    },
    screen: {
      orientation: {
        async lock(value) { orientationLockValue = value; },
      },
    },
  };
  const fetch = async () => ({ ok: exportAvailable });
  runInNewContext(clientSource, {
    document: {
      fullscreenElement: null,
      documentElement: {
        async requestFullscreen() { fullscreenRequestCount += 1; },
      },
      getElementById: element,
    },
    window, fetch, URLSearchParams, Math,
  }, { filename: fileURLToPath(new URL("../free-client.js", import.meta.url)) });
  return {
    element,
    get fullscreenRequestCount() { return fullscreenRequestCount; },
    get orientationLockValue() { return orientationLockValue; },
    get frameFocusCount() { return frameFocusCount; },
  };
}

test("free client waits for a player gesture", async () => {
  const page = clientPage();
  await new Promise(setImmediate);
  assert.equal(page.element("game-frame").hidden, true);
  assert.match(page.element("game-frame").src, /game\/index\.html/);
  assert.match(page.element("game-frame").src, /entry_fee_tier=average/);
  assert.equal(page.element("loading-panel").hidden, true);
  assert.equal(page.element("game-launch-panel").hidden, false);
});

test("free launch gesture requests fullscreen landscape and focuses the game", async () => {
  const page = clientPage();
  await new Promise(setImmediate);
  await page.element("game-launch-button").listeners.get("click")();
  assert.equal(page.fullscreenRequestCount, 1);
  assert.equal(page.orientationLockValue, "landscape");
  assert.equal(page.element("game-launch-panel").hidden, true);
  assert.equal(page.element("game-frame").hidden, false);
  assert.equal(page.frameFocusCount, 1);
});

test("free client offers a return path when the export is unavailable", async () => {
  const page = clientPage({ exportAvailable: false });
  await new Promise(setImmediate);
  assert.equal(page.element("free-client-error").hidden, false);
  assert.match(page.element("return-to-free-entry").href, /free-entry\.html/);
});
