/*
  Browser-only production-entry skeleton for room creation and invite lookup.
  Wallet auth and payment will replace the temporary bearer-token input later.
*/
const createRoomForm = document.getElementById("create-room-form");
const roomsApiUrlInput = document.getElementById("rooms-api-url-input");
const authTokenInput = document.getElementById("auth-token-input");
const displayNameInput = document.getElementById("display-name-input");
const entryFeeTierSelect = document.getElementById("entry-fee-tier-select");
const playerCountSelect = document.getElementById("player-count-select");
const lookupRoomButton = document.getElementById("lookup-room-button");
const entryStatus = document.getElementById("entry-status");
const roomSummary = document.getElementById("room-summary");
const emptyRoomState = document.getElementById("empty-room-state");
const roomGameId = document.getElementById("room-game-id");
const roomPlayerCount = document.getElementById("room-player-count");
const roomEntryFeeTier = document.getElementById("room-entry-fee-tier");
const roomEntryFeeAmount = document.getElementById("room-entry-fee-amount");
const roomCreatedAt = document.getElementById("room-created-at");
const inviteLink = document.getElementById("invite-link");
const launchRoomLink = document.getElementById("launch-room-link");

const pageParams = new URLSearchParams(window.location.search);
const localStorageKey = "evanopolis.roomEntry.devToken";
const configuredGameId = pageParams.get("game_id") || pageParams.get("room") || "";

roomsApiUrlInput.value = pageParams.get("rooms_api_url") || defaultRoomsApiUrl();
authTokenInput.value = localStorage.getItem(localStorageKey) || "";
displayNameInput.value = pageParams.get("display_name") || "";
playerCountSelect.value = normalizedPlayerCount(pageParams.get("player_count"));
entryFeeTierSelect.value = normalizedEntryFeeTier(pageParams.get("entry_fee_tier"));

createRoomForm.addEventListener("submit", (event) => {
  handleCreateRoom(event).catch((error) => {
    showStatus(error.message, "error");
  });
});
lookupRoomButton.addEventListener("click", () => {
  handleLookupClick().catch((error) => {
    showStatus(error.message, "error");
  });
});
authTokenInput.addEventListener("change", persistDevToken);
roomsApiUrlInput.addEventListener("change", persistRoomsApiUrl);

if (configuredGameId !== "") {
  lookupRoom(configuredGameId).catch((error) => {
    showStatus(error.message, "error");
  });
}

function defaultRoomsApiUrl() {
  const isLocalHost = ["127.0.0.1", "localhost", ""].includes(window.location.hostname);
  if (isLocalHost) {
    return "http://127.0.0.1:3001";
  }

  return "https://evanopolis-v1-rooms-api-staging.fly.dev";
}

function normalizedPlayerCount(value) {
  if (["2", "3", "4"].includes(String(value))) {
    return String(value);
  }

  return "3";
}

function normalizedEntryFeeTier(value) {
  if (["cheap", "average", "deluxe"].includes(String(value))) {
    return String(value);
  }

  return "average";
}

async function handleCreateRoom(event) {
  event.preventDefault();
  persistDevToken();
  persistRoomsApiUrl();

  const token = authTokenInput.value.trim();
  if (token === "") {
    showStatus("Temporary bearer token is required until wallet auth is connected.", "error");
    return;
  }

  const payload = {
    creator_display_name: displayNameInput.value.trim(),
    entry_fee_tier: entryFeeTierSelect.value,
    player_count: Number(playerCountSelect.value),
  };

  showStatus("Creating room...");
  const response = await fetch(`${normalizedBaseUrl()}/v0/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await readJson(response);
  if (!response.ok) {
    throwRoomError(body, "Room creation failed.");
  }

  renderRoom(body);
  writeRoomParams(body.game_id);
  showStatus("Room created.", "success");
}

async function handleLookupClick() {
  const currentParams = new URLSearchParams(window.location.search);
  const gameId = currentParams.get("game_id") || currentParams.get("room") || window.prompt("Room game id");
  if (gameId === null || gameId.trim() === "") {
    return;
  }

  await lookupRoom(gameId.trim());
}

async function lookupRoom(gameId) {
  persistRoomsApiUrl();
  showStatus("Looking up invite...");

  const response = await fetch(`${normalizedBaseUrl()}/v0/rooms/${encodeURIComponent(gameId)}`, {
    headers: {
      Accept: "application/json",
    },
  });

  const body = await readJson(response);
  if (!response.ok) {
    throwRoomError(body, "Invite lookup failed.");
  }

  renderRoom(body);
  writeRoomParams(body.game_id);
  showStatus("Invite loaded.", "success");
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function throwRoomError(body, fallbackMessage) {
  if (body && typeof body.error === "string") {
    throw new Error(body.error);
  }

  throw new Error(fallbackMessage);
}

function renderRoom(room) {
  const inviteUrl = buildInviteUrl(room.game_id);
  const launchUrl = buildLaunchUrl(room);

  roomGameId.textContent = room.game_id;
  roomPlayerCount.textContent = String(room.player_count);
  roomEntryFeeTier.textContent = room.entry_fee_tier;
  roomEntryFeeAmount.textContent = formatRawEva(room.entry_fee_amount);
  roomCreatedAt.textContent = formatDate(room.created_at);
  inviteLink.href = inviteUrl;
  inviteLink.textContent = inviteUrl;
  launchRoomLink.href = launchUrl;

  roomSummary.hidden = false;
  emptyRoomState.hidden = true;
}

function buildInviteUrl(gameId) {
  const inviteParams = new URLSearchParams();
  inviteParams.set("game_id", gameId);
  inviteParams.set("rooms_api_url", normalizedBaseUrl());
  return `${window.location.origin}${window.location.pathname}?${inviteParams.toString()}`;
}

function buildLaunchUrl(room) {
  const launchParams = new URLSearchParams();
  launchParams.set("match_id", room.game_id);
  launchParams.set("player_count", String(room.player_count));
  launchParams.set("auto_join", "0");
  return `./server-client.html?${launchParams.toString()}`;
}

function writeRoomParams(gameId) {
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("game_id", gameId);
  nextParams.set("rooms_api_url", normalizedBaseUrl());
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function persistDevToken() {
  const token = authTokenInput.value.trim();
  if (token === "") {
    localStorage.removeItem(localStorageKey);
    return;
  }

  localStorage.setItem(localStorageKey, token);
}

function persistRoomsApiUrl() {
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("rooms_api_url", normalizedBaseUrl());
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function normalizedBaseUrl() {
  return roomsApiUrlInput.value.trim().replace(/\/+$/, "");
}

function showStatus(message, tone = "") {
  entryStatus.textContent = message;
  if (tone === "") {
    entryStatus.removeAttribute("data-tone");
    return;
  }

  entryStatus.dataset.tone = tone;
}

function formatRawEva(rawAmount) {
  const value = Number(rawAmount) / 1_000_000_000_000_000_000;
  if (!Number.isFinite(value)) {
    return String(rawAmount);
  }

  return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} EVA`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}
