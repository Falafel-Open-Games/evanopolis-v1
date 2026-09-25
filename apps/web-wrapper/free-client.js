const gameFrame = document.getElementById("game-frame");
const loadingPanel = document.getElementById("loading-panel");
const freeClientError = document.getElementById("free-client-error");
const returnToFreeEntry = document.getElementById("return-to-free-entry");

const pageParams = new URLSearchParams(window.location.search);
const config = {
  server_url: pageParams.get("server_url") || defaultServerUrl(),
  match_id: pageParams.get("match_id") || "",
  client_id: pageParams.get("client_id") || generatedClientId(),
  player_count: normalizedPlayerCount(pageParams.get("player_count")),
  entry_fee_tier: "average",
  language: pageParams.get("language") || "en",
  auto_join: pageParams.get("auto_join") || "1",
};

function defaultServerUrl() {
  if (["127.0.0.1", "localhost", ""].includes(window.location.hostname)) {
    return "ws://127.0.0.1:8788/match";
  }
  if (window.location.hostname === "evanopolis-wrapper-local.falafel.com.br") {
    return "wss://evanopolis-wrapper-local.falafel.com.br/match";
  }
  return "wss://evanopolis-v1-game-server-staging.fly.dev/match";
}

function generatedClientId() {
  return `browser-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizedPlayerCount(value) {
  return ["2", "3", "4"].includes(String(value)) ? String(value) : "3";
}

function gameUrl() {
  const gameParams = new URLSearchParams({
    scene: "server-client",
    mode: "free_play",
    server_url: config.server_url,
    match_id: config.match_id,
    client_id: config.client_id,
    player_count: config.player_count,
    entry_fee_tier: config.entry_fee_tier,
    language: config.language,
    auto_join: config.auto_join,
  });
  return `./game/index.html?${gameParams.toString()}`;
}

function entryUrl() {
  const params = new URLSearchParams({
    match_id: config.match_id,
    player_count: config.player_count,
    server_url: config.server_url,
  });
  return `./free-entry.html?${params.toString()}`;
}

async function openGameWhenAvailable() {
  if (config.match_id === "") {
    showError();
    return;
  }
  const response = await fetch("./game/index.html", { method: "HEAD", cache: "no-store" });
  if (!response.ok) {
    showError();
    return;
  }
  gameFrame.src = gameUrl();
  gameFrame.hidden = false;
  loadingPanel.hidden = true;
}

function showError() {
  returnToFreeEntry.href = entryUrl();
  gameFrame.hidden = true;
  loadingPanel.hidden = true;
  freeClientError.hidden = false;
}

openGameWhenAvailable().catch(showError);
