const LocalServerUrl = "ws://127.0.0.1:8788/match";
const StagingServerUrl = "wss://evanopolis-v1-game-server-staging.fly.dev/match";
const elements = {
  serverUrl: document.getElementById("server-url"),
  matchId: document.getElementById("match-id"),
  clientId: document.getElementById("client-id"),
  connectButton: document.getElementById("connect-button"),
  disconnectButton: document.getElementById("disconnect-button"),
  coreTab: document.getElementById("core-tab"),
  gameTab: document.getElementById("game-tab"),
  corePanel: document.getElementById("core-panel"),
  gamePanel: document.getElementById("game-panel"),
  joinButton: document.getElementById("join-button"),
  reclaimButton: document.getElementById("reclaim-button"),
  rollButton: document.getElementById("roll-button"),
  endTurnButton: document.getElementById("end-turn-button"),
  gameCommandCard: document.getElementById("game-command-card"),
  connectionStatus: document.getElementById("connection-status"),
  connectionId: document.getElementById("connection-id"),
  coreMatchId: document.getElementById("core-match-id"),
  coreClientId: document.getElementById("core-client-id"),
  clientRole: document.getElementById("client-role"),
  playerId: document.getElementById("player-id"),
  revision: document.getElementById("revision"),
  phase: document.getElementById("phase"),
  activePlayer: document.getElementById("active-player"),
  dice: document.getElementById("dice"),
  availableActions: document.getElementById("available-actions"),
  playersGrid: document.getElementById("players-grid"),
  spacesGrid: document.getElementById("spaces-grid"),
  lastSent: document.getElementById("last-sent"),
  lastReceived: document.getElementById("last-received"),
  messageLog: document.getElementById("message-log"),
};

let socket = null;
let latestSnapshot = null;
let localPlayerId = "";
let localRole = "-";
let connectionId = "-";
let shouldJoinOnOpen = false;
let wasSessionReplaced = false;
const messageLog = [];

initializeForm();
render();

elements.connectButton.addEventListener("click", connect);
elements.disconnectButton.addEventListener("click", disconnect);
elements.coreTab.addEventListener("click", () => setActiveTab("core"));
elements.gameTab.addEventListener("click", () => setActiveTab("game"));
elements.joinButton.addEventListener("click", joinMatch);
elements.reclaimButton.addEventListener("click", reclaimSession);
elements.rollButton.addEventListener("click", () => sendCommand("request_roll"));
elements.endTurnButton.addEventListener("click", () => sendCommand("request_end_turn"));

function initializeForm() {
  elements.serverUrl.value = localStorage.getItem("evanopolis-debug-server-url") || defaultServerUrl();
  elements.matchId.value = localStorage.getItem("evanopolis-debug-match-id") || "demo";
  elements.clientId.value =
    localStorage.getItem("evanopolis-debug-client-id") ||
    `browser-${globalThis.crypto.randomUUID().slice(0, 8)}`;
}

function defaultServerUrl() {
  if (globalThis.location.hostname === "127.0.0.1" || globalThis.location.hostname === "localhost") {
    return LocalServerUrl;
  }
  return StagingServerUrl;
}

function connect() {
  persistForm();
  disconnect();
  setStatus("Connecting");
  socket = new WebSocket(elements.serverUrl.value.trim());

  socket.addEventListener("open", () => {
    setStatus("Connected");
    if (shouldJoinOnOpen) {
      shouldJoinOnOpen = false;
      joinMatch();
    }
    render();
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    elements.lastReceived.textContent = formatJson(message);
    pushLog("received", message);
    handleServerMessage(message);
    render();
  });

  socket.addEventListener("close", () => {
    setStatus("Closed");
    socket = null;
    connectionId = "-";
    render();
  });

  socket.addEventListener("error", () => {
    setStatus("Error");
    render();
  });
}

function disconnect() {
  if (socket !== null) {
    socket.close();
    socket = null;
  }
}

function joinMatch() {
  wasSessionReplaced = false;
  sendMessage({
    type: "join_match",
    match_id: elements.matchId.value.trim(),
    client_id: elements.clientId.value.trim(),
  });
}

function reclaimSession() {
  persistForm();
  shouldJoinOnOpen = true;
  wasSessionReplaced = false;
  if (socket === null || socket.readyState !== WebSocket.OPEN) {
    connect();
    return;
  }

  shouldJoinOnOpen = false;
  joinMatch();
}

function sendCommand(type) {
  if (latestSnapshot === null || localPlayerId === "") {
    return;
  }

  sendMessage({
    type,
    match_id: elements.matchId.value.trim(),
    client_id: elements.clientId.value.trim(),
    player_id: localPlayerId,
    seen_revision: latestSnapshot.revision,
    payload: {},
  });
}

function sendMessage(message) {
  if (socket === null || socket.readyState !== WebSocket.OPEN) {
    setStatus("Not connected");
    render();
    return;
  }

  elements.lastSent.textContent = formatJson(message);
  pushLog("sent", message);
  socket.send(JSON.stringify(message));
  render();
}

function handleServerMessage(message) {
  if (message.type === "connection_ready") {
    connectionId = message.connection_id || "-";
  }
  if (message.type === "join_accepted") {
    localRole = message.role || "-";
    localPlayerId = message.player_id || "";
    wasSessionReplaced = false;
  }
  if (message.type === "match_snapshot") {
    latestSnapshot = message.snapshot;
    localPlayerId = latestSnapshot.local_player_id || localPlayerId;
  }
  if (message.type === "command_rejected") {
    setStatus(`Rejected: ${message.reason}`);
  }
  if (message.type === "session_replaced") {
    wasSessionReplaced = true;
    setStatus("Session opened elsewhere");
  }
}

function render() {
  const connected = socket !== null && socket.readyState === WebSocket.OPEN;
  const hasJoined = localRole !== "-";
  const isPlayer = localRole === "player";
  const canJoin = connected && !hasJoined;
  const canReclaim = wasSessionReplaced || (!connected && hasJoined);
  const canRoll = connected && hasAction("request_roll");
  const canEndTurn = connected && hasAction("request_end_turn");

  elements.connectButton.disabled = connected;
  elements.disconnectButton.disabled = socket === null;
  elements.joinButton.hidden = !canJoin;
  elements.joinButton.disabled = !canJoin;
  elements.reclaimButton.hidden = !canReclaim;
  elements.reclaimButton.disabled = !canReclaim;
  elements.gameCommandCard.hidden = !isPlayer;
  elements.rollButton.disabled = !canRoll;
  elements.endTurnButton.disabled = !canEndTurn;

  elements.coreMatchId.textContent = elements.matchId.value.trim() || "-";
  elements.coreClientId.textContent = elements.clientId.value.trim() || "-";
  elements.connectionId.textContent = connectionId;
  elements.clientRole.textContent = localRole;
  elements.playerId.textContent = localPlayerId || "-";
  elements.revision.textContent = latestSnapshot?.revision ?? "-";
  elements.phase.textContent = latestSnapshot?.phase ?? "-";
  elements.activePlayer.textContent = latestSnapshot?.active_player_id ?? "-";
  elements.dice.textContent = formatDice(latestSnapshot?.dice);
  elements.availableActions.textContent = latestSnapshot?.available_actions?.join(", ") || "-";
  renderPlayers();
  renderSpaces();
  renderLog();
}

function setActiveTab(tab) {
  const showCore = tab === "core";
  elements.coreTab.classList.toggle("is-active", showCore);
  elements.gameTab.classList.toggle("is-active", !showCore);
  elements.coreTab.setAttribute("aria-selected", String(showCore));
  elements.gameTab.setAttribute("aria-selected", String(!showCore));
  elements.corePanel.hidden = !showCore;
  elements.gamePanel.hidden = showCore;
}

function renderPlayers() {
  const players = latestSnapshot?.players || [];
  elements.playersGrid.replaceChildren(
    ...players.map((player) => {
      const card = document.createElement("div");
      card.className = "player-card";
      card.innerHTML = `
        <strong>${escapeHtml(player.player_id)}</strong>
        <div>Position: ${player.position}</div>
        <div>${player.connected ? "Connected" : "Disconnected"}</div>
        <div>${player.player_id === latestSnapshot?.active_player_id ? "Active turn" : "Waiting"}</div>
      `;
      return card;
    })
  );
}

function renderSpaces() {
  const spaces = latestSnapshot?.spaces || [];
  elements.spacesGrid.replaceChildren(
    ...spaces.map((space) => {
      const tile = document.createElement("div");
      tile.className = `space-tile space-tile-${space.kind}`;
      tile.innerHTML = `
        <strong>${space.index}</strong>
        <span>${escapeHtml(space.label)}</span>
        <small>${escapeHtml(space.kind)}</small>
      `;
      return tile;
    })
  );
}

function renderLog() {
  elements.messageLog.textContent = messageLog
    .slice(-30)
    .map((entry) => `${entry.direction.toUpperCase()} ${entry.time}\n${formatJson(entry.message)}`)
    .join("\n\n");
}

function hasAction(action) {
  return latestSnapshot?.available_actions?.includes(action) || false;
}

function setStatus(status) {
  elements.connectionStatus.textContent = status;
}

function persistForm() {
  localStorage.setItem("evanopolis-debug-server-url", elements.serverUrl.value.trim());
  localStorage.setItem("evanopolis-debug-match-id", elements.matchId.value.trim());
  localStorage.setItem("evanopolis-debug-client-id", elements.clientId.value.trim());
}

function pushLog(direction, message) {
  messageLog.push({
    direction,
    message,
    time: new Date().toLocaleTimeString(),
  });
}

function formatDice(dice) {
  if (dice === null || dice === undefined) {
    return "-";
  }
  return `${dice.die_1} + ${dice.die_2} = ${dice.total}`;
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
