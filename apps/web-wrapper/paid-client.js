const gameFrame = document.getElementById("game-frame");
const loadingPanel = document.getElementById("loading-panel");
const gameLaunchPanel = document.getElementById("game-launch-panel");
const gameLaunchButton = document.getElementById("game-launch-button");
const gameLaunchStatus = document.getElementById("game-launch-status");
const gameFullscreenButton = document.getElementById("game-fullscreen-button");
const paidReconnectPanel = document.getElementById("paid-reconnect-panel");
const paidReconnectButton = document.getElementById("paid-reconnect-button");
const paidReconnectRoomLink = document.getElementById("paid-reconnect-room-link");
const paidReconnectStatus = document.getElementById("paid-reconnect-status");

const clientStatusProtocol = "evanopolis-godot-client-status";
const pageParams = new URLSearchParams(window.location.search);
const isLocalHost = ["127.0.0.1", "localhost", ""].includes(window.location.hostname);

const config = {
  server_url: pageParams.get("server_url") || defaultServerUrl(),
  match_id: pageParams.get("match_id") || "",
  client_id: pageParams.get("client_id") || generatedClientId(),
  player_count: normalizedPlayerCount(pageParams.get("player_count")),
  room_buy_in_eva: normalizedRoomBuyIn(pageParams.get("room_buy_in_eva")),
  language: pageParams.get("language") || "en",
  auto_join: pageParams.get("auto_join") || "1",
  paid_launch_key: pageParams.get("paid_launch_key") || "",
};

function defaultServerUrl() {
  if (isLocalHost) {
    return "ws://127.0.0.1:8788/match";
  }
  if (window.location.hostname === "evanopolis-wrapper-local.falafel.com.br") {
    return "wss://evanopolis-wrapper-local.falafel.com.br/match";
  }
  return "wss://evanopolis-v1-game-server-staging.fly.dev/match";
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

function generatedClientId() {
  return `browser-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizedPlayerCount(value) {
  const playerCount = Number(value);
  return [2, 3, 4].includes(playerCount) ? String(playerCount) : "3";
}

function normalizedRoomBuyIn(value) {
  const roomBuyIn = Number(value);
  return Number.isInteger(roomBuyIn) && roomBuyIn >= 1 && roomBuyIn <= 1000
    ? String(roomBuyIn)
    : "50";
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
  return paidTokenExpiry(payload) > Date.now() + 30000 ? "ready" : "expired";
}

function paidTokenExpiry(payload) {
  if (typeof payload.authExpiresAt === "string") {
    const expiresAt = Date.parse(payload.authExpiresAt);
    if (Number.isFinite(expiresAt)) {
      return expiresAt;
    }
  }

  try {
    const encodedClaims = payload.authToken.split(".")[1];
    const claims = JSON.parse(window.atob(encodedClaims.replace(/-/g, "+").replace(/_/g, "/")));
    return Number.isFinite(claims.exp) ? claims.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function gameUrl() {
  const gameParams = new URLSearchParams({
    scene: "server-client",
    mode: "paid_room",
    server_url: config.server_url,
    match_id: config.match_id,
    client_id: config.client_id,
    player_count: config.player_count,
    room_buy_in_eva: config.room_buy_in_eva,
    language: config.language,
    auto_join: config.auto_join,
    paid_launch_key: config.paid_launch_key,
  });
  return `./game/index.html?${gameParams.toString()}`;
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
    ? "Sign with the same wallet to return. You will not be charged again."
    : "Your game link is incomplete. Return to the room and enter again.";
  loadingPanel.hidden = true;
  gameLaunchPanel.hidden = true;
  gameFrame.hidden = true;
  gameFullscreenButton.hidden = true;
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

async function openGameWhenAvailable() {
  const launchState = paidLaunchState();
  if (launchState !== "ready") {
    showPaidReconnect(launchState);
    return;
  }

  const response = await fetch("./game/index.html", { method: "HEAD", cache: "no-store" });
  if (!response.ok) {
    loadingPanel.querySelector("h1").textContent = "Game unavailable";
    loadingPanel.querySelector("p").textContent = "Return to the room and try again in a moment.";
    return;
  }

  if (paidLaunchState() !== "ready") {
    showPaidReconnect(paidLaunchState());
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

function handleFrameMessage(event) {
  if (event.source !== gameFrame.contentWindow) {
    return;
  }
  const message = typeof event.data === "string" ? parseJson(event.data) : event.data;
  if (message?.protocol === clientStatusProtocol && message.type === "auth_expired") {
    showPaidReconnect("expired");
  }
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

paidReconnectButton.addEventListener("click", reconnectWallet);
gameLaunchButton.addEventListener("click", launchGame);
gameFullscreenButton.addEventListener("click", restoreFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenButton);
window.addEventListener("message", handleFrameMessage);
openGameWhenAvailable().catch(() => {
  loadingPanel.querySelector("h1").textContent = "Game unavailable";
  loadingPanel.querySelector("p").textContent = "Return to the room and try again in a moment.";
});
