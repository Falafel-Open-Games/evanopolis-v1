/*
  Entry page for free games: hosts create a room and share its invite link;
  invitees open the link and take a seat. No wallet or payment is involved.
*/
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
const freeRoomActions = document.getElementById("free-room-actions");
const freeInvitePanel = document.getElementById("free-invite-panel");
const freeInviteLink = document.getElementById("free-invite-link");
const copyFreeInviteButton = document.getElementById("copy-free-invite-button");
const enterFreeGameButton = document.getElementById("enter-free-game-button");
const freeServerUrl = document.getElementById("free-server-url");

// Entry flow presentation: hero, steps, and room card.
const freeEntryShell = document.getElementById("free-entry-shell");
const freeEyebrowState = document.getElementById("free-eyebrow-state");
const freeModeSwitch = document.getElementById("free-mode-switch");
const freeStepSetup = document.getElementById("free-step-setup");
const freeStepShare = document.getElementById("free-step-share");
const freeStepEnter = document.getElementById("free-step-enter");
const freeShareCopy = document.getElementById("free-share-copy");
const freeRoomSummaryLead = document.getElementById("free-room-summary-lead");
const freeRoomSummaryTail = document.getElementById("free-room-summary-tail");
const freePlayerCountOptions = document.getElementById("free-player-count-options");
const freeSeatCount = document.getElementById("free-seat-count");
const freeRoomNotice = document.getElementById("free-room-notice");
const freeRoomNoticeText = document.getElementById("free-room-notice-text");
const freeRoomNoticeMobile = document.getElementById("free-room-notice-mobile");
const freeOpenRoomButton = document.getElementById("free-open-room-button");
const freeCtaNote = document.getElementById("free-cta-note");

const MaxSeatCount = 6;
const EyebrowLabels = { setup: "Free game", host: "Room open", guest: "Invitation" };
// Whole sentences per count, so each language can phrase numbers naturally.
const SeatsLeftCopy = {
  1: "One seat left. The link works until the room is full — after that it stops letting anyone in.",
  2: "Two seats left. The link works until the room is full — after that it stops letting anyone in.",
  3: "Three seats left. The link works until the room is full — after that it stops letting anyone in.",
  4: "Four seats left. The link works until the room is full — after that it stops letting anyone in.",
  5: "Five seats left. The link works until the room is full — after that it stops letting anyone in.",
};
const EveryoneInNotes = {
  2: "Nothing to pay. The board opens once both of you are in.",
  3: "Nothing to pay. The board opens once all three are in.",
  4: "Nothing to pay. The board opens once all four are in.",
  5: "Nothing to pay. The board opens once all five are in.",
  6: "Nothing to pay. The board opens once all six are in.",
};

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
freePlayerCountOptions.addEventListener("click", (event) => {
  mirrorOptionToSelect(event, freePlayerCountSelect);
});
freePlayerCountSelect.addEventListener("change", () => {
  renderFreeEntryFlow(currentFreeScreen());
});
document.addEventListener(EntryLanguageChangeEvent, () => {
  if (activeMatchId === "") {
    renderCreateMode();
  } else {
    renderActiveRoom();
  }
});

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
  return ["2", "3", "4", "5", "6"].includes(String(value)) ? String(value) : "3";
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
  showFreeStatus("");
}

function renderCreateMode() {
  freeEntryTitle.textContent = t("Create a free game");
  freeEntryIntro.textContent = t("No wallet and no ticket. Choose how many players, share the link, and play the full board — same rules, nothing at stake.");
  freeSetupTitle.textContent = t("Set up your game");
  freeNextTitle.textContent = t("Share your invite");
  freeRoomForm.hidden = false;
  freeRoomDetails.hidden = true;
  freeRoomActions.hidden = true;
  showFreeStatus("");
  renderFreeEntryFlow("setup");
}

function renderActiveRoom() {
  const playerCount = normalizedPlayerCount(freePlayerCountSelect.value);
  freeEntryTitle.textContent = isInviteMode ? t("You’re invited") : t("Your free game is ready");
  freeEntryIntro.textContent = isInviteMode
    ? t("Someone saved you a seat in a free game of Evanopolis. No wallet, no ticket, no account — take the seat and the board opens.")
    : t("Send the link to your players. Anyone with it takes a seat — no wallet, no sign-up. You can enter the board and wait for them there.");
  freeSetupTitle.textContent = isInviteMode ? t("Review this game") : t("Set up your game");
  freeRoomCopy.textContent = isInviteMode ? t("Invitation loaded") : t("Game set up");
  freeRoomSummaryLead.textContent = isInviteMode ? t("Free game · ") : "";
  freeRoomSummaryTail.textContent = isInviteMode ? t(" players · 1 seat taken") : t(" players · Free");
  freeNextTitle.textContent = isInviteMode ? t("Take your seat") : t("Share your invite");
  freeRoomForm.hidden = true;
  freeRoomDetails.hidden = false;
  createAnotherFreeRoomButton.hidden = isInviteMode;
  freeRoomPlayerCount.textContent = playerCount;
  freeRoomActions.hidden = isInviteMode;
  freeInvitePanel.hidden = isInviteMode;
  freeInviteLink.value = buildInviteUrl(playerCount);
  showFreeStatus("");
  renderFreeEntryFlow(isInviteMode ? "guest" : "host");
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
  showFreeStatus(t("Invite link copied."), "success");
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
    language: entryLanguage(),
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

function currentFreeScreen() {
  if (activeMatchId === "") {
    return "setup";
  }

  return isInviteMode ? "guest" : "host";
}

/*
  Renders the visible entry flow for one of three screens:
    setup - the host chooses the player count
    host  - the room exists and the host shares the invite link
    guest - an invitee opened the link and can take a seat
*/
function renderFreeEntryFlow(screen) {
  const seatTotal = Number(normalizedPlayerCount(freePlayerCountSelect.value));
  freeEntryShell.dataset.screen = screen;
  freeEyebrowState.textContent = t(EyebrowLabels[screen]);
  freeModeSwitch.hidden = screen !== "setup";

  freeStepSetup.dataset.state = screen === "setup" ? "active" : "done";
  freeStepShare.dataset.state = screen === "setup" ? "pending" : "active";
  freeStepEnter.dataset.state = "pending";
  freeStepEnter.hidden = screen === "guest";
  freeShareCopy.textContent = shareStepCopy(screen, seatTotal);

  for (const value of ["2", "3", "4", "5", "6"]) {
    document.getElementById(`free-player-count-option-${value}`).ariaPressed = String(String(seatTotal) === value);
  }
  renderFreeSeats(screen, seatTotal);
  freeSeatCount.textContent = String(seatTotal);

  // `text` shows inside the card on desktop, `mobile` in the fixed mobile
  // action bar, and `note` under the primary action.
  const notice = freeNoticeFor(screen, seatTotal);
  freeRoomNotice.dataset.icon = "ready";
  freeRoomNoticeText.textContent = notice.text;
  freeRoomNoticeMobile.textContent = notice.mobile;
  freeCtaNote.textContent = notice.note;
  freeOpenRoomButton.hidden = screen !== "setup";
  enterFreeGameButton.hidden = screen === "setup";
  enterFreeGameButton.textContent = screen === "guest" ? t("Take my seat") : t("Enter the game");
}

function shareStepCopy(screen, seatTotal) {
  if (screen === "setup") {
    return t("A link appears here as soon as the room is open.");
  }
  if (screen === "guest") {
    return t("Free play runs the full rulebook — same board, same cards, same dice. The only thing missing is the EVA. If the room fills up before you join, the link stops working.");
  }

  return t(SeatsLeftCopy[seatTotal - 1]);
}

function freeNoticeFor(screen, seatTotal) {
  if (screen === "setup") {
    return {
      text: t("Everything is set. You can open the room."),
      mobile: t("Everything is set. No wallet, no payment, no sign-up."),
      note: t("No wallet, no payment, no sign-up."),
    };
  }
  if (screen === "host") {
    return {
      text: t("Room created. Waiting for players."),
      mobile: t("Room created. Waiting for players."),
      note: t("You can wait on the board while the others arrive."),
    };
  }

  return {
    text: t("Invitation loaded. One seat is free for you."),
    mobile: t("One seat is free for you. Nothing to pay."),
    note: t(EveryoneInNotes[seatTotal]),
  };
}

// Seat 1 is the host. An invitee is shown in seat 2; the rest stay open.
function renderFreeSeats(screen, seatTotal) {
  for (let index = 1; index <= MaxSeatCount; index += 1) {
    const seat = document.getElementById(`free-seat-${index}`);
    const name = document.getElementById(`free-seat-${index}-name`);
    const tag = document.getElementById(`free-seat-${index}-tag`);
    seat.hidden = index > seatTotal;
    tag.textContent = index === 1 ? t("Host") : "";
    if (index === 1) {
      seat.dataset.state = screen === "guest" ? "player" : "host";
      name.textContent = screen === "guest" ? t("Player 1") : t("You");
    } else if (index === 2 && screen === "guest") {
      seat.dataset.state = "you";
      name.textContent = t("You");
    } else {
      seat.dataset.state = "open";
      name.textContent = t("Open seat");
    }
  }
}
