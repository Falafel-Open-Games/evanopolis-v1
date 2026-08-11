const gameFrame = document.getElementById("game-frame");
const offlinePlaceholder = document.getElementById("offline-placeholder");

const configServerUrl = document.getElementById("config-server-url");
const configMatchId = document.getElementById("config-match-id");
const configClientId = document.getElementById("config-client-id");
const configLanguage = document.getElementById("config-language");
const newMatchButton = document.getElementById("new-match-button");
const newClientButton = document.getElementById("new-client-button");
const diagnosticBridge = document.getElementById("diagnostic-bridge");
const diagnosticScene = document.getElementById("diagnostic-scene");
const diagnosticSearch = document.getElementById("diagnostic-search");
const diagnosticReferrer = document.getElementById("diagnostic-referrer");

const launchDiagnosticProtocol = "evanopolis-godot-launch";

const pageParams = new URLSearchParams(window.location.search);
const isLocalHost = ["127.0.0.1", "localhost", ""].includes(window.location.hostname);
const hasClientIdParam = pageParams.has("client_id");

const config = {
  server_url: pageParams.get("server_url") || defaultServerUrl(),
  match_id: pageParams.get("match_id") || "demo",
  client_id: pageParams.get("client_id") || generatedClientId(),
  language: pageParams.get("language") || "en",
  auto_join: pageParams.get("auto_join") || "1",
};

function defaultServerUrl() {
  if (isLocalHost) {
    return "ws://127.0.0.1:8788/match";
  }

  return "wss://evanopolis-v1-game-server-staging.fly.dev/match";
}

function generatedClientId() {
  const suffix = Math.random().toString(16).slice(2, 10);
  return `browser-${suffix}`;
}

function generatedMatchId() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `demo-${suffix}`;
}

function godotUrl() {
  const godotParams = new URLSearchParams({
    scene: "server-client",
    server_url: config.server_url,
    match_id: config.match_id,
    client_id: config.client_id,
    language: config.language,
    auto_join: config.auto_join,
  });
  return `./game/index.html?${godotParams.toString()}`;
}

function renderConfig() {
  configServerUrl.textContent = config.server_url;
  configMatchId.textContent = config.match_id;
  configClientId.textContent = config.client_id;
  configLanguage.textContent = config.language;
}

function startNewMatch() {
  config.match_id = generatedMatchId();
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("match_id", config.match_id);
  nextParams.set("client_id", config.client_id);
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
  renderConfig();
  resetDiagnostics();

  gameFrame.classList.remove("is-available");
  gameFrame.src = godotUrl();
  gameFrame.classList.add("is-available");
}

function openNewClient() {
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("server_url", config.server_url);
  nextParams.set("match_id", config.match_id);
  nextParams.set("client_id", generatedClientId());
  nextParams.set("language", config.language);
  nextParams.set("auto_join", config.auto_join);

  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.open(nextUrl, "_blank", "noopener");
}

async function showGameExportWhenAvailable() {
  const response = await fetch("./game/index.html", {
    method: "HEAD",
    cache: "no-store",
  });

  if (!response.ok) {
    return;
  }

  gameFrame.src = godotUrl();
  gameFrame.classList.add("is-available");
  offlinePlaceholder.hidden = true;
}

renderConfig();
persistGeneratedClientId();
resetDiagnostics();
newMatchButton.addEventListener("click", startNewMatch);
newClientButton.addEventListener("click", openNewClient);
window.addEventListener("message", handleFrameMessage);
showGameExportWhenAvailable().catch(() => {
  offlinePlaceholder.hidden = false;
});

function persistGeneratedClientId() {
  if (hasClientIdParam) {
    return;
  }

  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("client_id", config.client_id);
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function resetDiagnostics() {
  diagnosticBridge.textContent = "waiting";
  diagnosticScene.textContent = "-";
  diagnosticSearch.textContent = "-";
  diagnosticReferrer.textContent = "-";
}

function handleFrameMessage(event) {
  if (event.source !== gameFrame.contentWindow) {
    return;
  }

  const message = parseFrameMessage(event.data);
  if (message === null) {
    return;
  }

  diagnosticBridge.textContent = "received";
  diagnosticScene.textContent = message.scene || "-";
  diagnosticSearch.textContent = message.search || "-";
  diagnosticReferrer.textContent = message.referrer || "-";
}

function parseFrameMessage(value) {
  const parsed = typeof value === "string" ? parseJson(value) : value;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  if (parsed.protocol !== launchDiagnosticProtocol) {
    return null;
  }

  if (parsed.type !== "bootstrap_diagnostics") {
    return null;
  }

  return parsed;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
