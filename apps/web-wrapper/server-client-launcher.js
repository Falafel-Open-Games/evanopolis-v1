const gameFrame = document.getElementById("game-frame");
const offlinePlaceholder = document.getElementById("offline-placeholder");
const paidReconnectPanel = document.getElementById("paid-reconnect-panel");
const paidReconnectButton = document.getElementById("paid-reconnect-button");
const paidReconnectRoomLink = document.getElementById("paid-reconnect-room-link");
const paidReconnectStatus = document.getElementById("paid-reconnect-status");

const configLaunchMode = document.getElementById("config-launch-mode");
const configServerUrl = document.getElementById("config-server-url");
const configMatchId = document.getElementById("config-match-id");
const configClientId = document.getElementById("config-client-id");
const configPlayerCount = document.getElementById("config-player-count");
const configRoomBuyIn = document.getElementById("config-room-buy-in");
const configRandomSeed = document.getElementById("config-random-seed");
const configLanguage = document.getElementById("config-language");
const configPaidPayload = document.getElementById("config-paid-payload");
const roomSizeSelect = document.getElementById("room-size-select");
const roomBuyInInput = document.getElementById("room-buy-in-input");
const randomSeedInput = document.getElementById("random-seed-input");
const newMatchButton = document.getElementById("new-match-button");
const newClientButton = document.getElementById("new-client-button");
const diagnosticBridge = document.getElementById("diagnostic-bridge");
const diagnosticScene = document.getElementById("diagnostic-scene");
const diagnosticGodotPlayerCount = document.getElementById("diagnostic-godot-player-count");
const diagnosticGodotRoomBuyIn = document.getElementById("diagnostic-godot-room-buy-in");
const diagnosticSearch = document.getElementById("diagnostic-search");
const diagnosticReferrer = document.getElementById("diagnostic-referrer");

const launchDiagnosticProtocol = "evanopolis-godot-launch";

const pageParams = new URLSearchParams(window.location.search);
const isLocalHost = ["127.0.0.1", "localhost", ""].includes(window.location.hostname);
const hasClientIdParam = pageParams.has("client_id");

const config = {
  mode: normalizedLaunchMode(pageParams.get("mode")),
  server_url: pageParams.get("server_url") || defaultServerUrl(),
  match_id: pageParams.get("match_id") || "demo",
  client_id: pageParams.get("client_id") || generatedClientId(),
  player_count: normalizedPlayerCount(pageParams.get("player_count")),
  room_buy_in_eva: normalizedRoomBuyIn(pageParams.get("room_buy_in_eva")),
  random_seed: normalizedRandomSeed(pageParams.get("random_seed")),
  language: pageParams.get("language") || "en",
  auto_join: pageParams.get("auto_join") || "1",
  paid_launch_key: pageParams.get("paid_launch_key") || "",
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

function normalizedPlayerCount(value) {
  const playerCount = Number(value);
  if ([2, 3, 4].includes(playerCount)) {
    return String(playerCount);
  }

  return "3";
}

function normalizedLaunchMode(value) {
  if (value === "paid_room") {
    return "paid_room";
  }

  return "free_play";
}

function normalizedRoomBuyIn(value) {
  const roomBuyIn = Number(value);
  if (Number.isInteger(roomBuyIn) && roomBuyIn >= 1 && roomBuyIn <= 1000) {
    return String(roomBuyIn);
  }

  return "50";
}

function normalizedRandomSeed(value) {
  if (value === null) {
    return "";
  }

  return value.trim().slice(0, 128);
}

function godotUrl() {
  const godotParams = new URLSearchParams({
    scene: "server-client",
    mode: config.mode,
    server_url: config.server_url,
    match_id: config.match_id,
    client_id: config.client_id,
    player_count: config.player_count,
    room_buy_in_eva: config.room_buy_in_eva,
    language: config.language,
    auto_join: config.auto_join,
  });
  if (config.random_seed !== "") {
    godotParams.set("random_seed", config.random_seed);
  }
  if (config.paid_launch_key !== "") {
    godotParams.set("paid_launch_key", config.paid_launch_key);
  }
  return `./game/index.html?${godotParams.toString()}`;
}

function renderConfig() {
  configLaunchMode.textContent = config.mode;
  configServerUrl.textContent = config.server_url;
  configMatchId.textContent = config.match_id;
  configClientId.textContent = config.client_id;
  configPlayerCount.textContent = config.player_count;
  configRoomBuyIn.textContent = `${config.room_buy_in_eva} EVA`;
  configRandomSeed.textContent = config.random_seed === "" ? "auto" : config.random_seed;
  configLanguage.textContent = config.language;
  configPaidPayload.textContent = paidLaunchPayloadStatus();
  roomSizeSelect.value = config.player_count;
  roomBuyInInput.value = config.room_buy_in_eva;
  randomSeedInput.value = config.random_seed;
}

function paidLaunchPayloadStatus() {
  if (config.mode !== "paid_room") {
    return "not required";
  }
  const state = paidLaunchState();
  return state === "ready" ? "stored" : state;
}

function readPaidLaunchPayload() {
  if (config.paid_launch_key === "") {
    return null;
  }
  const payload = parseJson(window.sessionStorage.getItem(config.paid_launch_key));
  return payload !== null && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
}

function paidLaunchState() {
  const payload = readPaidLaunchPayload();
  if (payload === null || typeof payload.authToken !== "string"
    || typeof payload.wallet?.address !== "string") {
    return "missing";
  }
  const expiresAt = paidTokenExpiry(payload);
  return expiresAt > Date.now() + 30000 ? "ready" : "expired";
}

function paidTokenExpiry(payload) {
  if (typeof payload.authExpiresAt === "string") {
    const expiresAt = Date.parse(payload.authExpiresAt);
    if (Number.isFinite(expiresAt)) {
      return expiresAt;
    }
  }

  // Older paid launch payloads did not include authExpiresAt.
  try {
    const encodedClaims = payload.authToken.split(".")[1];
    const claims = JSON.parse(window.atob(encodedClaims.replace(/-/g, "+").replace(/_/g, "/")));
    return Number.isFinite(claims.exp) ? claims.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function showPaidReconnect(state) {
  const payload = readPaidLaunchPayload();
  const roomId = payload?.room?.gameId || config.match_id;
  const roomUrl = new URL("./room-entry.html", window.location.href);
  roomUrl.searchParams.set("game_id", roomId);
  if (typeof payload?.roomsApiUrl === "string") {
    roomUrl.searchParams.set("rooms_api_url", payload.roomsApiUrl);
  }
  if (typeof payload?.authApiUrl === "string") {
    roomUrl.searchParams.set("auth_api_url", payload.authApiUrl);
  }
  paidReconnectRoomLink.href = roomUrl.toString();
  paidReconnectButton.hidden = state !== "expired";
  paidReconnectStatus.textContent = state === "expired"
    ? "Sign with the same wallet to restore your seat. No new payment is needed."
    : "Paid launch data is missing. Open Room Entry and sign in again.";
  offlinePlaceholder.hidden = true;
  gameFrame.classList.remove("is-available");
  paidReconnectPanel.hidden = false;
}

async function reconnectWallet() {
  const payload = readPaidLaunchPayload();
  if (payload === null || typeof payload.wallet?.address !== "string") {
    showPaidReconnect("missing");
    return;
  }

  paidReconnectButton.disabled = true;
  try {
    const provider = window.ethereum;
    if (provider === undefined) {
      throw new Error("Open this page in a wallet-enabled browser.");
    }
    paidReconnectStatus.textContent = "Connecting wallet...";
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const address = Array.isArray(accounts) ? accounts[0] : undefined;
    if (typeof address !== "string" || address.toLowerCase() !== payload.wallet.address.toLowerCase()) {
      throw new Error("Select the wallet that paid for this seat.");
    }

    const chainId = Number(payload.expectedChainId || 421614);
    const currentChainId = await provider.request({ method: "eth_chainId" });
    if (Number(currentChainId) !== chainId) {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chainId.toString(16)}` }] });
    }

    const authApiUrl = typeof payload.authApiUrl === "string" && payload.authApiUrl !== ""
      ? payload.authApiUrl
      : defaultAuthApiUrl();
    paidReconnectStatus.textContent = "Requesting wallet sign-in...";
    const challenge = await postAuthJson(`${authApiUrl}/auth/challenge`, {
      address,
      chainId,
      origin: window.location.origin,
    });
    paidReconnectStatus.textContent = "Waiting for wallet signature...";
    const signature = await provider.request({ method: "personal_sign", params: [challenge.message, address] });
    const verified = await postAuthJson(`${authApiUrl}/auth/verify`, {
      address,
      nonce: challenge.nonce,
      signature,
    });
    if (typeof verified.token !== "string" || !Number.isFinite(Date.parse(verified.expires_at))) {
      throw new Error("Wallet sign-in returned an invalid session.");
    }
    payload.authToken = verified.token;
    payload.authExpiresAt = verified.expires_at;
    window.sessionStorage.setItem(config.paid_launch_key, JSON.stringify(payload));
    window.location.reload();
  } catch (error) {
    paidReconnectStatus.textContent = error instanceof Error ? error.message : "Wallet sign-in failed. Try again.";
    paidReconnectButton.disabled = false;
  }
}

function defaultAuthApiUrl() {
  if (isLocalHost) {
    return "http://127.0.0.1:3000";
  }
  if (window.location.hostname === "evanopolis-wrapper-local.falafel.com.br") {
    return "https://tabletop-demo-auth.falafel.com.br";
  }
  return "https://tabletop-auth.fly.dev";
}

async function postAuthJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error("Wallet sign-in failed. Try again.");
  }
  return body;
}

function updateRoomSize() {
  config.player_count = normalizedPlayerCount(roomSizeSelect.value);
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("player_count", config.player_count);
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
  renderConfig();
}

function updateRoomBuyIn() {
  config.room_buy_in_eva = normalizedRoomBuyIn(roomBuyInInput.value);
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("room_buy_in_eva", config.room_buy_in_eva);
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
  renderConfig();
}

function updateRandomSeed() {
  config.random_seed = normalizedRandomSeed(randomSeedInput.value);
  const nextParams = new URLSearchParams(window.location.search);
  if (config.random_seed === "") {
    nextParams.delete("random_seed");
  } else {
    nextParams.set("random_seed", config.random_seed);
  }
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
  renderConfig();
}

function startNewMatch() {
  config.player_count = normalizedPlayerCount(roomSizeSelect.value);
  config.room_buy_in_eva = normalizedRoomBuyIn(roomBuyInInput.value);
  config.random_seed = normalizedRandomSeed(randomSeedInput.value);
  config.match_id = generatedMatchId();
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("match_id", config.match_id);
  nextParams.set("client_id", config.client_id);
  nextParams.set("player_count", config.player_count);
  nextParams.set("room_buy_in_eva", config.room_buy_in_eva);
  if (config.random_seed === "") {
    nextParams.delete("random_seed");
  } else {
    nextParams.set("random_seed", config.random_seed);
  }
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
  renderConfig();
  resetDiagnostics();

  gameFrame.classList.remove("is-available");
  gameFrame.src = godotUrl();
  gameFrame.classList.add("is-available");
}

function openNewClient() {
  config.player_count = normalizedPlayerCount(roomSizeSelect.value);
  config.room_buy_in_eva = normalizedRoomBuyIn(roomBuyInInput.value);
  config.random_seed = normalizedRandomSeed(randomSeedInput.value);
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("server_url", config.server_url);
  nextParams.set("match_id", config.match_id);
  nextParams.set("client_id", generatedClientId());
  nextParams.set("player_count", config.player_count);
  nextParams.set("room_buy_in_eva", config.room_buy_in_eva);
  if (config.random_seed === "") {
    nextParams.delete("random_seed");
  } else {
    nextParams.set("random_seed", config.random_seed);
  }
  nextParams.set("language", config.language);
  nextParams.set("auto_join", config.auto_join);

  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.open(nextUrl, "_blank", "noopener");
}

async function showGameExportWhenAvailable() {
  if (config.mode === "paid_room") {
    const state = paidLaunchState();
    if (state !== "ready") {
      showPaidReconnect(state);
      return;
    }
  }
  const response = await fetch("./game/index.html", {
    method: "HEAD",
    cache: "no-store",
  });

  if (!response.ok) {
    return;
  }

  if (config.mode === "paid_room" && paidLaunchState() !== "ready") {
    showPaidReconnect(paidLaunchState());
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
paidReconnectButton.addEventListener("click", reconnectWallet);
roomSizeSelect.addEventListener("change", updateRoomSize);
roomBuyInInput.addEventListener("change", updateRoomBuyIn);
randomSeedInput.addEventListener("change", updateRandomSeed);
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
  diagnosticGodotPlayerCount.textContent = "-";
  diagnosticGodotRoomBuyIn.textContent = "-";
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
  diagnosticGodotPlayerCount.textContent = message.player_count || "-";
  diagnosticGodotRoomBuyIn.textContent = message.room_buy_in_eva || "-";
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
