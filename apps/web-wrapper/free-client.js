const gameFrame = document.getElementById("game-frame");
const loadingPanel = document.getElementById("loading-panel");
const gameLaunchPanel = document.getElementById("game-launch-panel");
const gameLaunchButton = document.getElementById("game-launch-button");
const gameLaunchStatus = document.getElementById("game-launch-status");
const gameFullscreenButton = document.getElementById("game-fullscreen-button");
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
  loadingPanel.hidden = true;
  gameLaunchPanel.hidden = false;
}

async function launchGame() {
  gameLaunchButton.disabled = true;
  gameLaunchStatus.textContent = "Opening fullscreen...";

  await requestGamePresentation(gameLaunchStatus);

  gameFrame.hidden = false;
  gameLaunchPanel.hidden = true;
  updateFullscreenButton();
  gameFrame.focus();
}

async function requestGamePresentation(statusElement = null) {

  const fullscreenTarget = document.documentElement;
  try {
    if (document.fullscreenElement === null && typeof fullscreenTarget.requestFullscreen === "function") {
      await fullscreenTarget.requestFullscreen();
    }
  } catch {
    if (statusElement !== null) {
      statusElement.textContent = "Fullscreen is unavailable in this browser. Rotate your phone to landscape.";
    }
  }

  try {
    if (typeof window.screen?.orientation?.lock === "function") {
      await window.screen.orientation.lock("landscape");
    }
  } catch {
    if (statusElement !== null) {
      statusElement.textContent = "Rotation lock is unavailable. Keep your phone in landscape.";
    }
  }
}

async function restoreFullscreen() {
  await requestGamePresentation();
  updateFullscreenButton();
  gameFrame.focus();
}

function updateFullscreenButton() {
  gameFullscreenButton.hidden = gameFrame.hidden || Boolean(document.fullscreenElement);
}

function showError() {
  returnToFreeEntry.href = entryUrl();
  gameFrame.hidden = true;
  gameFullscreenButton.hidden = true;
  loadingPanel.hidden = true;
  gameLaunchPanel.hidden = true;
  freeClientError.hidden = false;
}

gameLaunchButton.addEventListener("click", launchGame);
gameFullscreenButton.addEventListener("click", restoreFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenButton);
openGameWhenAvailable().catch(showError);
