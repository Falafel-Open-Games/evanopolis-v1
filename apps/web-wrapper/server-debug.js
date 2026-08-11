const LocalServerUrl = "ws://127.0.0.1:8788/match";
const StagingServerUrl = "wss://evanopolis-v1-game-server-staging.fly.dev/match";
const elements = {
  serverUrl: document.getElementById("server-url"),
  matchId: document.getElementById("match-id"),
  clientId: document.getElementById("client-id"),
  playerCount: document.getElementById("player-count"),
  connectButton: document.getElementById("connect-button"),
  disconnectButton: document.getElementById("disconnect-button"),
  openSameClientButton: document.getElementById("open-same-client-button"),
  openNextClientButton: document.getElementById("open-next-client-button"),
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
  socketState: document.getElementById("socket-state"),
  connectionId: document.getElementById("connection-id"),
  coreMatchId: document.getElementById("core-match-id"),
  coreClientId: document.getElementById("core-client-id"),
  boundMatchId: document.getElementById("bound-match-id"),
  boundClientId: document.getElementById("bound-client-id"),
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
  eventTimeline: document.getElementById("event-timeline"),
};

let socket = null;
let latestDefinition = null;
let latestSnapshot = null;
let localPlayerId = "";
let localRole = "-";
let connectionId = "-";
let boundMatchId = "";
let boundClientId = "";
let wasSessionReplaced = false;
const messageLog = [];
const eventLog = [];

initializeForm();
render();

elements.connectButton.addEventListener("click", connect);
elements.disconnectButton.addEventListener("click", disconnect);
elements.openSameClientButton.addEventListener("click", openSameClientTab);
elements.openNextClientButton.addEventListener("click", openNextClientTab);
elements.coreTab.addEventListener("click", () => setActiveTab("core"));
elements.gameTab.addEventListener("click", () => setActiveTab("game"));
elements.joinButton.addEventListener("click", joinMatch);
elements.reclaimButton.addEventListener("click", reclaimSession);
elements.rollButton.addEventListener("click", () => sendCommand("request_roll"));
elements.endTurnButton.addEventListener("click", () => sendCommand("request_end_turn"));

function initializeForm() {
  const params = new URLSearchParams(globalThis.location.search);
  elements.serverUrl.value =
    params.get("server_url") || localStorage.getItem("evanopolis-debug-server-url") || defaultServerUrl();
  elements.matchId.value = params.get("match_id") || localStorage.getItem("evanopolis-debug-match-id") || "demo";
  elements.clientId.value =
    params.get("client_id") ||
    localStorage.getItem("evanopolis-debug-client-id") ||
    `browser-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  elements.playerCount.value = normalizedPlayerCount(
    params.get("player_count") || localStorage.getItem("evanopolis-debug-player-count") || "3"
  );
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
  pushEvent("Connecting", "Opening a WebSocket transport to the selected server.");
  const nextSocket = new WebSocket(elements.serverUrl.value.trim());
  socket = nextSocket;
  render();

  nextSocket.addEventListener("open", () => {
    if (socket !== nextSocket) {
      return;
    }
    setStatus("Connected");
    pushEvent("Connected", "Transport is open. Join Match binds this socket to a match/client session.");
    render();
  });

  nextSocket.addEventListener("message", (event) => {
    if (socket !== nextSocket) {
      return;
    }
    const message = JSON.parse(event.data);
    elements.lastReceived.textContent = formatJson(message);
    pushLog("received", message);
    handleServerMessage(message);
    render();
  });

  nextSocket.addEventListener("close", () => {
    if (socket !== nextSocket) {
      return;
    }
    setStatus(wasSessionReplaced ? "Session opened elsewhere" : "Closed");
    pushEvent("Closed", "The WebSocket transport closed. The client token can reconnect or reclaim later.");
    socket = null;
    connectionId = "-";
    render();
  });

  nextSocket.addEventListener("error", () => {
    if (socket !== nextSocket) {
      return;
    }
    setStatus("Error");
    pushEvent("Error", "The WebSocket transport reported an error.");
    render();
  });
}

function disconnect() {
  if (socket !== null) {
    pushEvent("Disconnecting", "Closing the current WebSocket transport from this page.");
    socket.close();
    socket = null;
    connectionId = "-";
    setStatus("Closed");
    render();
  }
}

function joinMatch() {
  wasSessionReplaced = false;
  const playerCount = normalizedPlayerCount(elements.playerCount.value);
  elements.playerCount.value = playerCount;
  pushEvent(
    "Joining",
    `Requesting match ${elements.matchId.value.trim()} as ${elements.clientId.value.trim()} with ${playerCount} seats.`
  );
  sendMessage({
    type: "join_match",
    match_id: elements.matchId.value.trim(),
    client_id: elements.clientId.value.trim(),
    player_count: Number(playerCount),
  });
}

function reclaimSession() {
  persistForm();
  wasSessionReplaced = false;
  pushEvent("Reclaiming", "Sending join_match again with the same client token on this connected socket.");
  if (socket === null || socket.readyState !== WebSocket.OPEN) {
    setStatus("Not connected");
    pushEvent("Reclaim blocked", "Connect first, then reclaim sends join_match for the same match/client identity.");
    render();
    return;
  }

  joinMatch();
}

function sendCommand(type) {
  if (latestSnapshot === null || localPlayerId === "") {
    pushEvent("Command skipped", "A player command needs an accepted player session and a current snapshot.");
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
    pushEvent("Message blocked", "A WebSocket must be connected before sending protocol messages.");
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
    pushEvent("Connection ready", `Server assigned connection id ${connectionId}.`);
  }
  if (message.type === "join_accepted") {
    localRole = message.role || "-";
    localPlayerId = message.player_id || "";
    boundMatchId = elements.matchId.value.trim();
    boundClientId = elements.clientId.value.trim();
    wasSessionReplaced = false;
    pushEvent("Join accepted", formatJoinAcceptedEvent(message));
  }
  if (message.type === "match_definition") {
    latestDefinition = message.definition;
    pushEvent("Definition", `Loaded ${latestDefinition.spaces?.length || 0} board spaces for ${latestDefinition.ruleset_id || "unknown ruleset"}.`);
  }
  if (message.type === "match_snapshot") {
    latestSnapshot = message.snapshot;
    localPlayerId = latestSnapshot.local_player_id || localPlayerId;
    pushEvent("Snapshot", `Revision ${latestSnapshot.revision} received for phase ${latestSnapshot.phase}.`);
  }
  if (message.type === "match_event") {
    pushEvent("Game event", formatMatchEvent(message));
  }
  if (message.type === "command_rejected") {
    setStatus(`Rejected: ${message.reason}`);
    pushEvent("Command rejected", message.reason || "Server rejected the command.");
  }
  if (message.type === "session_replaced") {
    wasSessionReplaced = true;
    setStatus("Session opened elsewhere");
    pushEvent("Session replaced", "Another socket joined with this match/client identity.");
  }
}

function render() {
  const connected = socket !== null && socket.readyState === WebSocket.OPEN;
  const connecting = socket !== null && socket.readyState === WebSocket.CONNECTING;
  const hasJoined = localRole !== "-";
  const isPlayer = localRole === "player" && !wasSessionReplaced;
  const canJoin = connected && !hasJoined;
  const canReclaim = connected && wasSessionReplaced;
  const canRoll = connected && hasAction("request_roll");
  const canEndTurn = connected && hasAction("request_end_turn");

  elements.connectButton.textContent = connectButtonLabel();
  elements.connectButton.disabled = connected || connecting;
  elements.disconnectButton.disabled = socket === null;
  elements.openSameClientButton.disabled = false;
  elements.openNextClientButton.disabled = false;
  elements.joinButton.hidden = !canJoin;
  elements.joinButton.disabled = !canJoin;
  elements.reclaimButton.hidden = !canReclaim;
  elements.reclaimButton.disabled = !canReclaim;
  elements.gameCommandCard.hidden = !isPlayer;
  elements.rollButton.disabled = !canRoll;
  elements.endTurnButton.disabled = !canEndTurn;

  elements.coreMatchId.textContent = elements.matchId.value.trim() || "-";
  elements.coreClientId.textContent = elements.clientId.value.trim() || "-";
  elements.socketState.textContent = socketStateLabel();
  elements.connectionId.textContent = connectionId;
  elements.boundMatchId.textContent = boundMatchId || "-";
  elements.boundClientId.textContent = boundClientId || "-";
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
  renderTimeline();
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
      const isReplacedLocalSeat = wasSessionReplaced && player.player_id === localPlayerId;
      const seatStatus =
        player.joined === false
          ? "Waiting for player"
          : isReplacedLocalSeat
            ? "Session replaced"
            : player.connected
              ? "Connected"
              : "Disconnected";
      const turnStatus = playerTurnStatus(player);
      card.className = "player-card";
      card.innerHTML = `
        <strong>${escapeHtml(player.player_id)}</strong>
        <div>Position: ${player.position}</div>
        <div>${seatStatus}</div>
        <div>${turnStatus}</div>
      `;
      return card;
    })
  );
}

function playerTurnStatus(player) {
  if (latestSnapshot?.phase !== "active") {
    return player.joined === false ? "Waiting" : "Ready";
  }
  return player.player_id === latestSnapshot?.active_player_id ? "Active turn" : "Waiting";
}

function renderSpaces() {
  const spaces = latestDefinition?.spaces || [];
  elements.spacesGrid.replaceChildren(
    ...spaces.map((space) => {
      const tile = document.createElement("div");
      tile.className = `space-tile space-tile-${space.kind}`;
      tile.innerHTML = `
        <strong>${space.index}</strong>
        <span>${escapeHtml(space.label)}</span>
        <small>${escapeHtml(formatSpaceMeta(space))}</small>
      `;
      return tile;
    })
  );
}

function formatSpaceMeta(space) {
  const parts = [space.kind];
  if (space.group_label) {
    parts.push(space.group_label);
  }
  if (space.purchase_price_eva !== undefined) {
    parts.push(`${space.purchase_price_eva} EVA`);
  }
  return parts.join(" · ");
}

function renderLog() {
  elements.messageLog.textContent = messageLog
    .slice(-30)
    .map((entry) => `${entry.direction.toUpperCase()} ${entry.time}\n${formatJson(entry.message)}`)
    .join("\n\n");
}

function renderTimeline() {
  elements.eventTimeline.replaceChildren(
    ...eventLog.slice(-20).reverse().map((entry) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <time>${escapeHtml(entry.time)}</time>
        <strong>${escapeHtml(entry.title)}</strong>
        <span>${escapeHtml(entry.detail)}</span>
      `;
      return item;
    })
  );
}

function hasAction(action) {
  return latestSnapshot?.available_actions?.includes(action) || false;
}

function setStatus(status) {
  elements.connectionStatus.textContent = status;
}

function socketStateLabel() {
  if (socket === null) {
    return "Idle";
  }

  if (socket.readyState === WebSocket.CONNECTING) {
    return "Connecting";
  }
  if (socket.readyState === WebSocket.OPEN) {
    return "Open";
  }
  if (socket.readyState === WebSocket.CLOSING) {
    return "Closing";
  }
  return "Closed";
}

function connectButtonLabel() {
  if (socket === null) {
    return "Connect";
  }
  if (socket.readyState === WebSocket.CONNECTING) {
    return "Connecting";
  }
  if (socket.readyState === WebSocket.OPEN) {
    return "Connected";
  }
  if (socket.readyState === WebSocket.CLOSING) {
    return "Closing";
  }
  return "Connect";
}

function persistForm() {
  localStorage.setItem("evanopolis-debug-server-url", elements.serverUrl.value.trim());
  localStorage.setItem("evanopolis-debug-match-id", elements.matchId.value.trim());
  localStorage.setItem("evanopolis-debug-client-id", elements.clientId.value.trim());
  localStorage.setItem("evanopolis-debug-player-count", normalizedPlayerCount(elements.playerCount.value));
}

function normalizedPlayerCount(value) {
  const playerCount = Number(value);
  if ([2, 3, 4].includes(playerCount)) {
    return String(playerCount);
  }

  return "3";
}

function pushLog(direction, message) {
  messageLog.push({
    direction,
    message,
    time: new Date().toLocaleTimeString(),
  });
}

function pushEvent(title, detail) {
  eventLog.push({
    title,
    detail,
    time: new Date().toLocaleTimeString(),
  });
}

function formatJoinAcceptedEvent(message) {
  if (message.role === "player") {
    return `Bound as player ${message.player_id || "-"} for client ${boundClientId}.`;
  }
  return `Bound as ${message.role || "unknown role"} for client ${boundClientId}.`;
}

function formatMatchEvent(message) {
  const event = message.event || {};
  if (event.type === "dice_rolled") {
    return `${event.player_id} rolled ${event.die_1} + ${event.die_2} = ${event.total}, moving ${event.from_position} -> ${event.to_position}.`;
  }
  if (event.type === "turn_ended") {
    return `${event.player_id} ended turn. Next player: ${event.next_player_id}.`;
  }
  return `${event.type || "unknown_event"} at revision ${message.revision}.`;
}

function openSameClientTab() {
  openScenarioTab(elements.clientId.value.trim() || "browser-shared");
}

function openNextClientTab() {
  openScenarioTab(`browser-${globalThis.crypto.randomUUID().slice(0, 8)}`);
}

function openScenarioTab(clientId) {
  persistForm();
  const url = new URL(globalThis.location.href);
  url.searchParams.set("server_url", elements.serverUrl.value.trim());
  url.searchParams.set("match_id", elements.matchId.value.trim());
  url.searchParams.set("client_id", clientId);
  globalThis.open(url.toString(), "_blank", "noopener");
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
