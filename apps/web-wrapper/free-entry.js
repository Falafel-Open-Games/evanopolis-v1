const freeEntryTitle = document.getElementById("free-entry-title");
const freeEntryIntro = document.getElementById("free-entry-intro");
const freeSetupTitle = document.getElementById("free-setup-title");
const freeRoomForm = document.getElementById("free-room-form");
const freePlayerCountSelect = document.getElementById("free-player-count-select");
const freeRoomDetails = document.getElementById("free-room-details");
const freeRoomCopy = document.getElementById("free-room-copy");
const freeRoomPlayerCount = document.getElementById("free-room-player-count");
const createAnotherFreeRoomButton = document.getElementById("create-another-free-room-button");
const freeEntryStatus = document.getElementById("free-entry-status");
const freeNextTitle = document.getElementById("free-next-title");
const freeEmptyState = document.getElementById("free-empty-state");
const freeRoomActions = document.getElementById("free-room-actions");
const freeInvitePanel = document.getElementById("free-invite-panel");
const freeInviteLink = document.getElementById("free-invite-link");
const copyFreeInviteButton = document.getElementById("copy-free-invite-button");
const enterFreeGameButton = document.getElementById("enter-free-game-button");
const freeServerUrl = document.getElementById("free-server-url");

const pageParams = new URLSearchParams(window.location.search);
const configuredMatchId = pageParams.get("match_id") || "";
const isInviteMode = configuredMatchId !== "" && pageParams.get("view") !== "host";
let activeMatchId = configuredMatchId;

freeServerUrl.value = pageParams.get("server_url") || defaultServerUrl();
freePlayerCountSelect.value = normalizedPlayerCount(pageParams.get("player_count"));

freeRoomForm.addEventListener("submit", createFreeRoom);
createAnotherFreeRoomButton.addEventListener("click", resetFreeRoom);
copyFreeInviteButton.addEventListener("click", copyFreeInvite);
freeInviteLink.addEventListener("focus", selectFreeInvite);
freeInviteLink.addEventListener("click", selectFreeInvite);
enterFreeGameButton.addEventListener("click", enterFreeGame);

if (activeMatchId !== "") {
  renderActiveRoom();
} else {
  renderCreateMode();
}

function defaultServerUrl() {
  if (["127.0.0.1", "localhost", ""].includes(window.location.hostname)) {
    return "ws://127.0.0.1:8788/match";
  }
  if (window.location.hostname === "evanopolis-wrapper-local.falafel.com.br") {
    return "wss://evanopolis-wrapper-local.falafel.com.br/match";
  }
  return "wss://evanopolis-v1-game-server-staging.fly.dev/match";
}

function normalizedPlayerCount(value) {
  return ["2", "3", "4"].includes(String(value)) ? String(value) : "3";
}

function generatedMatchId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `free-${globalThis.crypto.randomUUID()}`;
  }
  return `free-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function generatedClientId() {
  return `browser-${Math.random().toString(16).slice(2, 10)}`;
}

function createFreeRoom(event) {
  event.preventDefault();
  activeMatchId = generatedMatchId();
  writeHostUrl();
  renderActiveRoom();
  showFreeStatus("Free game created.", "success");
}

function renderCreateMode() {
  freeEntryTitle.textContent = "Create a free game";
  freeEntryIntro.textContent = "Replace with a short explanation of free play.";
  freeSetupTitle.textContent = "Set up your game";
  freeRoomForm.hidden = false;
  freeRoomDetails.hidden = true;
  freeRoomActions.hidden = true;
  freeEmptyState.hidden = false;
  showFreeStatus("Ready.");
}

function renderActiveRoom() {
  const playerCount = normalizedPlayerCount(freePlayerCountSelect.value);
  freeEntryTitle.textContent = isInviteMode ? "You’re invited" : "Create a free game";
  freeEntryIntro.textContent = isInviteMode
    ? "Replace with a short explanation of joining a free game."
    : "Replace with a short explanation of free play.";
  freeSetupTitle.textContent = isInviteMode ? "Review this game" : "Game details";
  freeRoomCopy.textContent = isInviteMode
    ? "Review the details supplied by the invitation."
    : "The free game is ready to share.";
  freeNextTitle.textContent = isInviteMode ? "Join this game" : "Invite players";
  freeRoomForm.hidden = true;
  freeRoomDetails.hidden = false;
  createAnotherFreeRoomButton.hidden = isInviteMode;
  freeRoomPlayerCount.textContent = playerCount;
  freeRoomActions.hidden = false;
  freeEmptyState.hidden = true;
  freeInvitePanel.hidden = isInviteMode;
  freeInviteLink.value = buildInviteUrl(playerCount);
  showFreeStatus(isInviteMode ? "Invitation loaded." : "Free game created.", "success");
}

function resetFreeRoom() {
  activeMatchId = "";
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.delete("match_id");
  nextParams.delete("view");
  nextParams.delete("player_count");
  window.history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`);
  renderCreateMode();
}

function buildInviteUrl(playerCount) {
  const inviteParams = new URLSearchParams({
    match_id: activeMatchId,
    player_count: playerCount,
    server_url: freeServerUrl.value,
  });
  return `${window.location.origin}${window.location.pathname}?${inviteParams.toString()}`;
}

function writeHostUrl() {
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("match_id", activeMatchId);
  nextParams.set("view", "host");
  nextParams.set("player_count", normalizedPlayerCount(freePlayerCountSelect.value));
  nextParams.set("server_url", freeServerUrl.value);
  window.history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`);
}

async function copyFreeInvite() {
  await navigator.clipboard.writeText(freeInviteLink.value);
  showFreeStatus("Invite link copied.", "success");
}

function selectFreeInvite() {
  freeInviteLink.select();
}

function enterFreeGame() {
  const launchParams = new URLSearchParams({
    mode: "free_play",
    server_url: freeServerUrl.value,
    match_id: activeMatchId,
    client_id: generatedClientId(),
    player_count: normalizedPlayerCount(freePlayerCountSelect.value),
    entry_fee_tier: "average",
    language: "en",
    auto_join: "1",
  });
  window.location.assign(`./free-client.html?${launchParams.toString()}`);
}

function showFreeStatus(message, tone = "") {
  freeEntryStatus.textContent = message;
  if (tone === "") {
    freeEntryStatus.removeAttribute("data-tone");
  } else {
    freeEntryStatus.dataset.tone = tone;
  }
}
