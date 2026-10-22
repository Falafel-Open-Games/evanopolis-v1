/*
  Browser-only production entrypoint for wallet login, room creation, and
  invite lookup. It can pay, verify, and recover payment proofs before the
  game server owns authoritative paid admission.
*/
const createRoomForm = document.getElementById("create-room-form");
const createRoomButton = document.getElementById("create-room-button");
const entryPageTitle = document.getElementById("entry-page-title");
const entryPageIntro = document.getElementById("entry-page-intro");
const roomActionTitle = document.getElementById("room-action-title");
const inviteModePanel = document.getElementById("invite-mode-panel");
const roomDetailsSummary = document.getElementById("room-details-summary");
const roomDetailsCopy = document.getElementById("room-details-copy");
const createAnotherRoomButton = document.getElementById("create-another-room-button");
const roomsApiUrlInput = document.getElementById("rooms-api-url-input");
const authApiUrlInput = document.getElementById("auth-api-url-input");
const expectedChainIdInput = document.getElementById("expected-chain-id-input");
const connectWalletButton = document.getElementById("connect-wallet-button");
const authStatus = document.getElementById("auth-status");
const walletAddress = document.getElementById("wallet-address");
const walletTokenStatus = document.getElementById("wallet-token-status");
const displayNameInput = document.getElementById("display-name-input");
const entryFeeTierSelect = document.getElementById("entry-fee-tier-select");
const playerCountSelect = document.getElementById("player-count-select");
const entryStatus = document.getElementById("entry-status");
const roomSummary = document.getElementById("room-summary");
const emptyRoomState = document.getElementById("empty-room-state");
const inviteSharePanel = document.getElementById("invite-share-panel");
const roomGameId = document.getElementById("room-game-id");
const roomCreatorDisplayName = document.getElementById("room-creator-display-name");
const roomPlayerCount = document.getElementById("room-player-count");
const roomEntryFeeTier = document.getElementById("room-entry-fee-tier");
const ticketOptionRows = document.querySelectorAll(".ticket-option-row");
const roomEntryFeeAmount = document.getElementById("room-entry-fee-amount");
const roomCreatedAt = document.getElementById("room-created-at");
const inviteLink = document.getElementById("invite-link");
const copyInviteButton = document.getElementById("copy-invite-button");
const paymentPanel = document.getElementById("payment-panel");
const admissionStatus = document.getElementById("admission-status");
const retryAdmissionButton = document.getElementById("retry-admission-button");
const paymentTxHashInput = document.getElementById("payment-tx-hash-input");
const paymentBalance = document.getElementById("payment-balance");
const paymentAllowance = document.getElementById("payment-allowance");
const checkPaymentButton = document.getElementById("check-payment-button");
const approvePaymentButton = document.getElementById("approve-payment-button");
const payTicketButton = document.getElementById("pay-ticket-button");
const verifyPaymentButton = document.getElementById("verify-payment-button");
const recoverPaymentButton = document.getElementById("recover-payment-button");
const clearPaymentButton = document.getElementById("clear-payment-button");
const continuePaymentButton = document.getElementById("continue-payment-button");
const paymentStatus = document.getElementById("payment-status");
const paidLaunchPanel = document.getElementById("paid-launch-panel");
const openPaidClientButton = document.getElementById("open-paid-client-button");
const paidLaunchStatus = document.getElementById("paid-launch-status");

// Entry flow presentation: header wallet pill, hero, steps, and room card.
const entryShell = document.getElementById("entry-shell");
const entryEyebrowState = document.getElementById("entry-eyebrow-state");
const entryModeSwitch = document.getElementById("entry-mode-switch");
const headerWalletPill = document.getElementById("header-wallet-pill");
const headerWalletLabel = document.getElementById("header-wallet-label");
const headerWalletValue = document.getElementById("header-wallet-value");
const headerWalletUnit = document.getElementById("header-wallet-unit");
const changeWalletButton = document.getElementById("change-wallet-button");
const connectWalletBarButton = document.getElementById("connect-wallet-bar-button");
const stepWallet = document.getElementById("step-wallet");
const stepSetup = document.getElementById("step-setup");
const stepSetupSummaryLabel = document.getElementById("step-setup-summary-label");
const stepSetupSummaryValue = document.getElementById("step-setup-summary-value");
const stepPay = document.getElementById("step-pay");
const stepPayCopy = document.getElementById("step-pay-copy");
const stepPaySummaryValue = document.getElementById("step-pay-summary-value");
const stepEnter = document.getElementById("step-enter");
const playerCountOptions = document.getElementById("player-count-options");
const entryFeeTierOptions = document.getElementById("entry-fee-tier-options");
const roomSeats = document.getElementById("room-seats");
const roomRows = document.getElementById("room-rows");
const roomTicketValue = document.getElementById("room-ticket-value");
const roomSeatCount = document.getElementById("room-seat-count");
const roomNotice = document.getElementById("room-notice");
const roomNoticeText = document.getElementById("room-notice-text");
const roomNoticeMobile = document.getElementById("room-notice-mobile");
const roomCtaNote = document.getElementById("room-cta-note");
const roomSupport = document.getElementById("room-support");

const PaymentTokenAddress = "0x422d3188537b3226c9a3cd47647d363fc5e0d727";
const PaymentHandlerAddress = "0x666711a0e1b300d3ba0e5d9579974ebaf28fecdb";
const PaymentAdapterAddress = "0x6863896de06241853470205f2df5d6a76f491fe1";
const PaymentRecoveryLookbackHours = 24;
const ZeroAddress = "0x0000000000000000000000000000000000000000";
const LocalTunnelHostname = "evanopolis-wrapper-local.falafel.com.br";
const EntryFeeTierPrices = { cheap: "0.1 EVA", average: "0.5 EVA", deluxe: "1 EVA" };
const MaxSeatCount = 4;
// The "Buy EVA" button opens the how-to-buy tutorial in the page language.
const BuyEvaTutorialUrls = {
  en: "https://tutorial.evervaluecoin.com/",
  es: "https://tutorial.evervaluecoin.com/es/",
  pt_br: "https://tutorial.evervaluecoin.com/pt/",
};

/*
  Room card notices, written in English and translated at render time.
  `text` shows inside the card on desktop, `mobile` shows in the fixed mobile
  action bar, and `note` is the footnote under the primary action. `icon`
  selects the notice icon: wait, ready, or alert.
*/
const SetupNotices = {
  missingName: {
    icon: "wait",
    text: "Add your display name to open the room.",
    mobile: "Add your display name to open the room.",
    note: "Opening the room is free. Signing doesn’t move funds.",
  },
  ready: {
    icon: "ready",
    text: "Everything is set. You can open the room.",
    mobile: "Everything is set. Opening the room is free.",
    note: "Opening the room is free. Signing doesn’t move funds.",
  },
};
const WalletNotices = {
  create: {
    icon: "wait",
    text: "Waiting for your wallet.",
    mobile: "Signing in doesn’t move funds.",
    note: "",
  },
  invite: {
    icon: "wait",
    text: "Connect your wallet to reserve your seat.",
    mobile: "Signing in doesn’t move funds.",
    note: "",
  },
};
const AdmissionNotices = {
  idle: {
    icon: "wait",
    text: "Checking your ticket…",
    mobile: "Checking your ticket…",
    note: "",
  },
  checking: {
    icon: "wait",
    text: "Checking this wallet for an existing ticket…",
    mobile: "Checking this wallet for an existing ticket…",
    note: "",
  },
  unpaid: {
    icon: "alert",
    text: "Your seat is not paid yet.",
    mobile: "Your seat is not paid yet. Each player pays their own ticket.",
    note: "Each player pays their own ticket.",
  },
  error: {
    icon: "alert",
    text: "Could not check this wallet’s ticket.",
    mobile: "Could not check this wallet’s ticket.",
    note: "",
  },
  admitted: {
    icon: "ready",
    text: "Your seat is paid.",
    mobile: "Your seat is paid. The board opens when every seat is paid.",
    note: "The board opens full screen when every seat is paid.",
  },
};

const pageParams = new URLSearchParams(window.location.search);
const configuredGameId = pageParams.get("game_id") || pageParams.get("room") || "";
const configuredHostView = configuredGameId !== "" && pageParams.get("view") === "host";
let authSession = null;
let activeRoom = null;
let admissionState = "idle";
let admittedPayment = null;
let admissionKey = null;
let admissionRequestId = 0;
let paymentInFlight = false;
let primaryPaymentInFlight = false;
let entryMode = configuredGameId === "" ? "create" : configuredHostView ? "host_room" : "invite";
let walletBalance = null;

roomsApiUrlInput.value = pageParams.get("rooms_api_url") || defaultRoomsApiUrl();
authApiUrlInput.value = pageParams.get("auth_api_url") || defaultAuthApiUrl();
expectedChainIdInput.value = pageParams.get("chain_id") || "421614";
displayNameInput.value = pageParams.get("display_name") || "";
playerCountSelect.value = normalizedPlayerCount(pageParams.get("player_count"));
entryFeeTierSelect.value = normalizedEntryFeeTier(pageParams.get("entry_fee_tier"));

connectWalletButton.addEventListener("click", startWalletConnection);
changeWalletButton.addEventListener("click", startWalletConnection);
connectWalletBarButton.addEventListener("click", startWalletConnection);
playerCountOptions.addEventListener("click", (event) => {
  mirrorOptionToSelect(event, playerCountSelect);
});
entryFeeTierOptions.addEventListener("click", (event) => {
  mirrorOptionToSelect(event, entryFeeTierSelect);
});
displayNameInput.addEventListener("input", renderEntryFlow);
playerCountSelect.addEventListener("change", renderEntryFlow);
entryFeeTierSelect.addEventListener("change", renderEntryFlow);
renderBuyEvaLink();
document.addEventListener(EntryLanguageChangeEvent, () => {
  renderBuyEvaLink();
  renderEntryModeCopy();
  renderAdmissionState();
});
createAnotherRoomButton.addEventListener("click", switchToCreateMode);
checkPaymentButton.addEventListener("click", () => {
  refreshPaymentReadiness().catch((error) => {
    showPaymentStatus(error.message, "error");
  });
});
approvePaymentButton.addEventListener("click", () => {
  approvePayment().catch((error) => {
    showPaymentStatus(error.message, "error");
  });
});
payTicketButton.addEventListener("click", () => {
  payTicket().catch((error) => {
    showPaymentStatus(error.message, "error");
  });
});
verifyPaymentButton.addEventListener("click", () => {
  verifyManualPayment().catch((error) => {
    showPaymentStatus(error.message, "error");
  });
});
recoverPaymentButton.addEventListener("click", () => {
  recoverPayment().catch((error) => {
    showPaymentStatus(error.message, "error");
  });
});
clearPaymentButton.addEventListener("click", clearStoredPayment);
continuePaymentButton.addEventListener("click", () => {
  continueToPayment().catch((error) => {
    showPaymentStatus(error.message, "error");
  });
});
retryAdmissionButton.addEventListener("click", () => {
  refreshAdmissionStatus().catch(() => {});
});
openPaidClientButton.addEventListener("click", () => {
  openPaidClient().catch((error) => {
    showPaidLaunchStatus(error.message, "error");
  });
});
paymentTxHashInput.addEventListener("change", persistPaymentDraft);
createRoomForm.addEventListener("submit", (event) => {
  handleCreateRoom(event).catch((error) => {
    showStatus(error.message, "error");
  });
});
copyInviteButton.addEventListener("click", () => {
  copyInviteLink().catch((error) => {
    showStatus(error.message, "error");
  });
});
inviteLink.addEventListener("focus", selectInviteLink);
inviteLink.addEventListener("click", selectInviteLink);
roomsApiUrlInput.addEventListener("change", persistRoomsApiUrl);
authApiUrlInput.addEventListener("change", persistAuthParams);
expectedChainIdInput.addEventListener("change", persistAuthParams);
installWalletChangeHandlers();
renderAuthSession();
renderEntryMode();

if (configuredGameId !== "") {
  lookupRoom(configuredGameId).catch((error) => {
    showStatus(error.message, "error");
  });
}

function defaultRoomsApiUrl() {
  if (isLocalBrowserHost()) {
    return `http://${window.location.hostname || "127.0.0.1"}:3001`;
  }
  if (window.location.hostname === LocalTunnelHostname) {
    return window.location.origin;
  }

  return "https://evanopolis-v1-rooms-api-staging.fly.dev";
}

function defaultAuthApiUrl() {
  if (isLocalBrowserHost()) {
    return `http://${window.location.hostname || "127.0.0.1"}:3000`;
  }
  if (window.location.hostname === LocalTunnelHostname) {
    return "https://tabletop-demo-auth.falafel.com.br";
  }

  return "https://tabletop-auth.fly.dev";
}

function isLocalBrowserHost() {
  return ["127.0.0.1", "localhost", ""].includes(window.location.hostname);
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

function startWalletConnection() {
  connectWallet().catch((error) => {
    resetAuthSession(error.message);
  });
}

async function connectWallet() {
  persistAuthParams();
  const provider = getEthereumProvider();

  showAuthStatus(t("Connecting wallet..."));
  connectWalletButton.disabled = true;

  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const address = Array.isArray(accounts) ? accounts[0] : undefined;
    if (typeof address !== "string" || address.length === 0) {
      throw new Error(t("The wallet did not return an account."));
    }

    await ensureExpectedChain(provider);
    showAuthStatus(t("Requesting sign-in challenge..."));
    const challenge = await fetchJson(`${normalizedAuthBaseUrl()}/auth/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address,
        chainId: Number(expectedChainId()),
        origin: window.location.origin,
      }),
    });

    showAuthStatus(t("Waiting for wallet signature..."));
    const signature = await provider.request({
      method: "personal_sign",
      params: [challenge.message, address],
    });

    showAuthStatus(t("Verifying signature..."));
    const verified = await fetchJson(`${normalizedAuthBaseUrl()}/auth/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address,
        nonce: challenge.nonce,
        signature,
      }),
    });

    walletBalance = null;
    authSession = {
      address,
      token: verified.token,
      expires_at: verified.expires_at,
      chain_id: expectedChainId(),
    };
    invalidateAdmission();
    renderAuthSession();
    loadStoredPaymentDraft();
    refreshAdmissionStatus().catch(() => {});
    refreshHeaderBalance().catch(() => {});
    showAuthStatus(t("Wallet connected."), "success");
  } finally {
    connectWalletButton.disabled = false;
  }
}

async function handleCreateRoom(event) {
  event.preventDefault();
  persistRoomsApiUrl();
  persistAuthParams();

  if (!hasUsableAuthSession()) {
    showStatus(t("Connect wallet before creating a room."), "error");
    return;
  }

  const payload = {
    creator_display_name: displayNameInput.value.trim(),
    entry_fee_tier: entryFeeTierSelect.value,
    player_count: Number(playerCountSelect.value),
  };

  showStatus(t("Creating room..."));
  const response = await fetch(`${normalizedBaseUrl()}/v0/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authSession.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await readJson(response);
  if (!response.ok) {
    throwRoomError(body, "Room creation failed.");
  }

  renderRoom(body);
  switchToHostRoomMode();
  writeRoomParams(body.game_id);
  showStatus("");
}

async function lookupRoom(gameId) {
  persistRoomsApiUrl();
  showStatus(t("Looking up invite..."));

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
  if (entryMode === "host_room") {
    switchToHostRoomMode();
  } else {
    switchToInviteMode();
  }
  showStatus("");
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
  activeRoom = room;
  invalidateAdmission();
  const inviteUrl = buildInviteUrl(room.game_id);

  roomGameId.textContent = room.game_id;
  roomCreatorDisplayName.textContent = room.creator_display_name || "-";
  roomPlayerCount.textContent = String(room.player_count);
  roomEntryFeeTier.textContent = room.entry_fee_tier;
  roomEntryFeeAmount.textContent = formatRawEva(room.entry_fee_amount);
  roomCreatedAt.textContent = formatDate(room.created_at);
  inviteLink.value = inviteUrl;

  roomSummary.hidden = false;
  emptyRoomState.hidden = true;
  loadStoredPaymentDraft();
  renderPaidLaunchState();
  refreshAdmissionStatus().catch(() => {});
}

async function copyInviteLink() {
  if (activeRoom === null) {
    throw new Error(t("Create or load a game before copying its invitation."));
  }
  await navigator.clipboard.writeText(inviteLink.value);
  showStatus(t("Invite link copied."), "success");
}

function selectInviteLink() {
  inviteLink.select();
}

function renderEntryMode() {
  const isInviteMode = entryMode === "invite";
  const isHostRoomMode = entryMode === "host_room";

  inviteModePanel.hidden = !isInviteMode;
  createRoomForm.hidden = isInviteMode || isHostRoomMode;
  roomDetailsSummary.hidden = activeRoom === null;
  createAnotherRoomButton.hidden = isInviteMode;
  ticketOptionRows.forEach((row) => {
    row.hidden = isInviteMode;
    row.style.display = isInviteMode ? "none" : "";
  });
  inviteSharePanel.hidden = isInviteMode;

  renderEntryModeCopy();
  showStatus(isInviteMode && activeRoom === null ? t("Loading invite...") : "");
  renderEntryFlow();
}

// Copy that depends on the entry mode; also re-run when the language changes.
function renderBuyEvaLink() {
  document.getElementById("entry-buy-eva").href = BuyEvaTutorialUrls[entryLanguage()];
}

function renderEntryModeCopy() {
  const isInviteMode = entryMode === "invite";
  roomActionTitle.textContent = isInviteMode ? t("Review this game") : t("Set up your game");
  roomDetailsCopy.textContent = isInviteMode
    ? t("Review the room details supplied by the invitation.")
    : t("The room is created. Share the invitation when these details are correct.");
}

async function continueToPayment() {
  if (paymentInFlight || primaryPaymentInFlight) {
    return;
  }
  primaryPaymentInFlight = true;
  renderAdmissionState();
  try {
    assertPaymentContext();
    const requiredAmount = BigInt(activeRoom.entry_fee_amount);
    showPaymentStatus(t("Checking your EVA balance..."));
    const balance = await readTokenBalance(authSession.address);
    paymentBalance.textContent = `${formatTokenAmount(balance)} EVA`;
    if (balance < requiredAmount) {
      showPaymentStatus(t("Your wallet does not have enough EVA for this ticket."), "error");
      return;
    }

    const allowance = await readAllowance(authSession.address);
    paymentAllowance.textContent = `${formatTokenAmount(allowance)} EVA`;
    if (allowance < requiredAmount) {
      showPaymentStatus(t("Your wallet will first ask you to approve EVA for this ticket."));
      await approvePayment();
    }

    await payTicket();
  } finally {
    primaryPaymentInFlight = false;
    renderAdmissionState();
  }
}

function switchToInviteMode() {
  entryMode = "invite";
  renderEntryMode();
}

function switchToHostRoomMode() {
  entryMode = "host_room";
  renderEntryMode();
}

function switchToCreateMode() {
  entryMode = "create";
  activeRoom = null;
  invalidateAdmission();
  roomSummary.hidden = true;
  roomDetailsSummary.hidden = true;
  emptyRoomState.hidden = false;
  paymentPanel.hidden = true;
  paymentTxHashInput.value = "";
  paymentBalance.textContent = "not checked";
  paymentAllowance.textContent = "not checked";
  paidLaunchPanel.hidden = true;
  showPaymentStatus("");
  showPaidLaunchStatus("");

  const nextParams = new URLSearchParams(window.location.search);
  nextParams.delete("game_id");
  nextParams.delete("room");
  nextParams.delete("view");
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
  renderEntryMode();
}

async function refreshPaymentReadiness() {
  assertPaymentContext();
  showPaymentStatus(t("Checking EVA balance and allowance..."));
  const [balance, allowance] = await Promise.all([
    readTokenBalance(authSession.address),
    readAllowance(authSession.address),
  ]);

  paymentBalance.textContent = `${formatTokenAmount(balance)} EVA`;
  paymentAllowance.textContent = `${formatTokenAmount(allowance)} EVA`;

  const requiredAmount = BigInt(activeRoom.entry_fee_amount);
  if (balance < requiredAmount) {
    showPaymentStatus(t("Wallet balance is below this room ticket amount."), "error");
    return;
  }

  if (allowance < requiredAmount) {
    showPaymentStatus(t("Approve EVA before paying this ticket."));
    return;
  }

  showPaymentStatus(t("Balance and allowance are ready."), "success");
}

async function approvePayment() {
  assertPaymentContext();
  showPaymentStatus(t("Requesting EVA approval in wallet..."));

  const txHash = await sendWalletTransaction({
    to: PaymentTokenAddress,
    data: paymentInterface(["function approve(address spender, uint256 amount)"])
      .encodeFunctionData("approve", [PaymentHandlerAddress, BigInt(activeRoom.entry_fee_amount)]),
  });

  showPaymentStatus(t("Approval submitted: {hash}. Waiting for confirmation...", { hash: abbreviateHash(txHash) }));
  const receipt = await waitForTransactionReceipt(txHash);
  if (receipt === null) {
    showPaymentStatus(t("Approval submitted: {hash}. It is not confirmed yet; wait a moment, then click Check balance.", { hash: abbreviateHash(txHash) }), "success");
    return;
  }

  if (receipt.status !== "0x1") {
    showPaymentStatus(t("Approval transaction failed: {hash}.", { hash: abbreviateHash(txHash) }), "error");
    return;
  }

  await refreshPaymentReadiness();
}

async function payTicket() {
  if (paymentInFlight) {
    return;
  }
  assertPaymentContext();
  const payingKey = currentAdmissionKey();
  paymentInFlight = true;
  renderAdmissionState();
  try {
    await refreshAdmissionStatus();
    assertPaymentContext();
    if (paymentTxHashInput.value.trim() !== "") {
      throw new Error(t("A payment transaction is already saved for this wallet and room. Verify it before paying again."));
    }
    showPaymentStatus(t("Checking allowance before payment..."));

    const requiredAmount = BigInt(activeRoom.entry_fee_amount);
    const allowance = await readAllowance(authSession.address);
    if (currentAdmissionKey() !== payingKey) {
      throw new Error(t("Wallet or room changed during payment. Check the ticket again."));
    }
    paymentAllowance.textContent = `${formatTokenAmount(allowance)} EVA`;
    if (allowance < requiredAmount) {
      showPaymentStatus(t("Approve EVA and wait for the approval transaction to confirm before paying this ticket."), "error");
      return;
    }

    showPaymentStatus(t("Submitting payment transaction in wallet..."));

    const txHash = await sendWalletTransaction({
      to: PaymentAdapterAddress,
      data: paymentInterface(["function play(uint256 amount, address potentialReferrer, bytes32 gameId)"])
        .encodeFunctionData("play", [
          BigInt(activeRoom.entry_fee_amount),
          ZeroAddress,
          deriveGameIdBytes32(activeRoom.game_id),
        ]),
    });

    paymentTxHashInput.value = txHash;
    persistPaymentDraft();
    showPaymentStatus(t("Payment submitted: {hash}. Verifying...", { hash: abbreviateHash(txHash) }));
    await verifyManualPayment();
  } finally {
    paymentInFlight = false;
    renderAdmissionState();
  }
}

async function readTokenBalance(ownerAddress) {
  const result = await callContract({
    to: PaymentTokenAddress,
    data: paymentInterface(["function balanceOf(address owner) view returns (uint256)"])
      .encodeFunctionData("balanceOf", [ownerAddress]),
  });
  const [balance] = paymentInterface(["function balanceOf(address owner) view returns (uint256)"])
    .decodeFunctionResult("balanceOf", result);
  return BigInt(balance.toString());
}

async function readAllowance(ownerAddress) {
  const result = await callContract({
    to: PaymentTokenAddress,
    data: paymentInterface(["function allowance(address owner, address spender) view returns (uint256)"])
      .encodeFunctionData("allowance", [ownerAddress, PaymentHandlerAddress]),
  });
  const [allowance] = paymentInterface(["function allowance(address owner, address spender) view returns (uint256)"])
    .decodeFunctionResult("allowance", result);
  return BigInt(allowance.toString());
}

async function callContract(transaction) {
  const provider = getEthereumProvider();
  await ensureExpectedChain(provider);
  return provider.request({
    method: "eth_call",
    params: [transaction, "latest"],
  });
}

async function sendWalletTransaction(transaction) {
  const provider = getEthereumProvider();
  await ensureExpectedChain(provider);
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const from = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof from !== "string" || from.length === 0) {
    throw new Error(t("The wallet did not return an account."));
  }

  const request = {
    from,
    ...transaction,
  };
  try {
    await provider.request({
      method: "eth_call",
      params: [request, "latest"],
    });
  } catch (error) {
    throw new Error(t("Transaction preflight failed: {reason}", { reason: walletErrorMessage(error) }));
  }

  try {
    return await provider.request({
      method: "eth_sendTransaction",
      params: [request],
    });
  } catch (error) {
    throw new Error(t("Wallet transaction failed: {reason}", { reason: paymentWalletErrorMessage(error) }));
  }
}

async function waitForTransactionReceipt(txHash) {
  const provider = getEthereumProvider();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt !== null) {
      return receipt;
    }

    await sleep(2000);
  }

  return null;
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function assertPaymentContext() {
  if (activeRoom === null) {
    throw new Error(t("Load a room before using payment actions."));
  }

  if (!hasUsableAuthSession()) {
    throw new Error(t("Connect wallet before using payment actions."));
  }
  if (admissionState !== "unpaid") {
    throw new Error(admissionState === "admitted"
      ? t("This wallet already has a ticket for this room. Open the paid client.")
      : t("Wait for the ticket check before using payment actions."));
  }
}

function currentAdmissionKey() {
  if (activeRoom === null || !hasUsableAuthSession()) {
    return null;
  }
  return `${activeRoom.game_id}:${authSession.address.toLowerCase()}:${authSession.token}`;
}

function invalidateAdmission() {
  admissionRequestId += 1;
  admissionKey = null;
  admissionState = "idle";
  admittedPayment = null;
  renderAdmissionState();
}

async function refreshAdmissionStatus() {
  const key = currentAdmissionKey();
  if (key === null) {
    invalidateAdmission();
    return;
  }

  admissionKey = key;
  const requestId = ++admissionRequestId;
  admissionState = "checking";
  admittedPayment = null;
  renderAdmissionState();
  try {
    const response = await fetch(`${normalizedAuthBaseUrl()}/payments/admission/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authSession.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId: activeRoom.game_id,
        amount: activeRoom.entry_fee_amount,
      }),
    });
    const body = await readJson(response);
    if (admissionRequestId !== requestId || admissionKey !== key || currentAdmissionKey() !== key) {
      return;
    }
    if (response.ok && body?.admitted === true
      && body.player?.toLowerCase() === authSession.address.toLowerCase()) {
      admittedPayment = body;
      admissionState = "admitted";
    } else if (response.status === 403 && body?.reason === "payment_not_found") {
      admissionState = "unpaid";
    } else {
      throw new Error(body?.error || body?.reason || t("Ticket check failed with HTTP {status}.", { status: response.status }));
    }
  } catch (error) {
    if (admissionRequestId !== requestId || admissionKey !== key || currentAdmissionKey() !== key) {
      return;
    }
    admissionState = "error";
    renderAdmissionState();
    throw error;
  }
  renderAdmissionState();
}

function renderAdmissionState() {
  paymentPanel.hidden = activeRoom === null || admissionState === "admitted";
  const canPay = admissionState === "unpaid";
  checkPaymentButton.disabled = !canPay;
  approvePaymentButton.disabled = !canPay;
  payTicketButton.disabled = !canPay || paymentInFlight || paymentTxHashInput.value.trim() !== "";
  continuePaymentButton.disabled = !canPay || paymentInFlight || primaryPaymentInFlight
    || paymentTxHashInput.value.trim() !== "";
  verifyPaymentButton.disabled = !canPay;
  recoverPaymentButton.disabled = !canPay;
  retryAdmissionButton.hidden = admissionState !== "error";
  const messages = {
    idle: t("Connect wallet to check whether you already have a ticket."),
    checking: t("Checking this wallet for an existing ticket..."),
    admitted: t("This wallet already has a ticket for this room."),
    unpaid: t("No ticket found for this wallet and room. You can pay for one seat."),
    error: t("Could not check this wallet's ticket. Retry before paying."),
  };
  admissionStatus.textContent = admissionState === "unpaid" && paymentTxHashInput.value.trim() !== ""
    ? t("A payment transaction is saved. Verify it before paying again, or clear an invalid hash.")
    : messages[admissionState];
  renderPaidLaunchState();
  renderEntryFlow();
}

function paymentInterface(abi) {
  if (window.ethers === undefined) {
    throw new Error(t("Payment helper library did not load."));
  }

  return new window.ethers.Interface(abi);
}

function deriveGameIdBytes32(gameId) {
  return window.ethers.keccak256(window.ethers.toUtf8Bytes(`evanopolis:v1:${gameId}`));
}

async function verifyManualPayment() {
  if (activeRoom === null) {
    showPaymentStatus(t("Load a room before verifying payment."), "error");
    return;
  }

  if (!hasUsableAuthSession()) {
    showPaymentStatus(t("Connect wallet before verifying payment."), "error");
    return;
  }

  const txHash = paymentTxHashInput.value.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    showPaymentStatus(t("Enter a valid transaction hash."), "error");
    return;
  }

  persistPaymentDraft();
  showPaymentStatus(t("Verifying payment..."));
  const verifiedPayment = await postPaymentVerify({
    txHash,
    gameId: activeRoom.game_id,
    amount: activeRoom.entry_fee_amount,
  });
  saveStoredPayment({
    txHash,
    verifiedPayment,
  });
  await refreshAdmissionStatus();
  renderPaidLaunchState();
  refreshHeaderBalance().catch(() => {});
  showPaymentStatus(t("Payment verified in block {block}.", { block: verifiedPayment.blockNumber }), "success");
}

async function recoverPayment() {
  assertPaymentContext();

  if (paymentTxHashInput.value.trim() !== "") {
    await verifyManualPayment();
    return;
  }

  showPaymentStatus(t("Searching the last {hours} hours for this payment...", { hours: PaymentRecoveryLookbackHours }));

  const recoveredPayment = await postPaymentRecover({
    gameId: activeRoom.game_id,
    amount: activeRoom.entry_fee_amount,
    lookbackHours: PaymentRecoveryLookbackHours,
  });

  if (recoveredPayment === null || typeof recoveredPayment !== "object") {
    showPaymentStatus(t("No matching payment was recovered."), "error");
    return;
  }

  if (recoveredPayment.recovered !== true) {
    handleUnrecoveredPayment(recoveredPayment);
    return;
  }

  if (typeof recoveredPayment.txHash !== "string" || recoveredPayment.txHash === "") {
    showPaymentStatus(t("Payment recovery succeeded, but no transaction hash was returned."), "error");
    return;
  }

  paymentTxHashInput.value = recoveredPayment.txHash;
  saveStoredPayment({
    txHash: recoveredPayment.txHash,
    verifiedPayment: recoveredPayment,
  });
  await refreshAdmissionStatus();
  renderPaidLaunchState();
  showPaymentStatus(t("Payment recovered and verified: {hash}.", { hash: abbreviateHash(recoveredPayment.txHash) }), "success");
}

async function postPaymentVerify({ txHash, gameId, amount }) {
  const response = await fetch(`${normalizedAuthBaseUrl()}/payments/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authSession.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      txHash,
      gameId,
      amount,
    }),
  });

  const body = await readJson(response);
  if (response.ok) {
    return body;
  }

  throw new Error(paymentErrorMessage(response.status, body, "verify"));
}

async function postPaymentRecover({ gameId, amount, lookbackHours }) {
  const response = await fetch(`${normalizedAuthBaseUrl()}/payments/recover`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authSession.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      gameId,
      amount,
      lookbackHours,
    }),
  });

  const body = await readJson(response);
  if (response.ok) {
    return body;
  }

  throw new Error(paymentErrorMessage(response.status, body, "recover"));
}

function handleUnrecoveredPayment(body) {
  if (body === null || typeof body !== "object") {
    showPaymentStatus(t("No matching payment was recovered."), "error");
    return;
  }

  if (body.reason === "multiple_candidates") {
    const candidateCount = Array.isArray(body.candidates) ? body.candidates.length : t("Multiple");
    showPaymentStatus(t("{count} matching payments found. Paste one candidate transaction hash and verify it.", { count: candidateCount }), "error");
    return;
  }

  if (typeof body.reason === "string" && body.reason !== "") {
    showPaymentStatus(body.reason, "error");
    return;
  }

  showPaymentStatus(t("No matching payment was recovered."), "error");
}

function paymentErrorMessage(status, body, action) {
  const errorCode = body && typeof body.error === "string" ? body.error : "";

  if (errorCode === "payment_not_confirmed") {
    return t("Payment transaction found, but it is not confirmed yet. Wait for confirmations and try again.");
  }

  if (errorCode === "payment_not_found") {
    return t("Payment was not found yet. Wait for it to mine, verify again, or try Recover Payment.");
  }

  if (errorCode === "payment_mismatch") {
    return t("The payment proof did not match this wallet, room, or ticket amount.");
  }

  if (errorCode === "not_implemented") {
    if (action === "recover") {
      return t("Payment recovery is not enabled on this auth server.");
    }

    return t("Payment verification is not enabled on this auth server.");
  }

  if (errorCode === "multiple_candidates") {
    if (Array.isArray(body.candidates)) {
      return t("{count} matching payments were found. Paste one candidate transaction hash and verify it.", { count: body.candidates.length });
    }

    return t("Multiple matching payments were found. Paste one candidate transaction hash and verify it.");
  }

  if (errorCode !== "") {
    return errorCode;
  }

  return t("Payment verification failed with HTTP {status}.", { status });
}

function buildInviteUrl(gameId) {
  const inviteParams = new URLSearchParams();
  inviteParams.set("game_id", gameId);
  inviteParams.set("rooms_api_url", normalizedBaseUrl());
  inviteParams.set("auth_api_url", normalizedAuthBaseUrl());
  inviteParams.set("chain_id", expectedChainId());
  return `${window.location.origin}${window.location.pathname}?${inviteParams.toString()}`;
}

function buildPaidLaunchUrl(payloadKey, room) {
  const launchParams = new URLSearchParams();
  launchParams.set("mode", "paid_room");
  launchParams.set("match_id", room.game_id);
  launchParams.set("player_count", String(room.player_count));
  launchParams.set("server_url", defaultGameServerUrl());
  launchParams.set("client_id", generatedClientId());
  launchParams.set("paid_launch_key", payloadKey);
  launchParams.set("language", entryLanguage());
  launchParams.set("auto_join", "1");
  return `./paid-client.html?${launchParams.toString()}`;
}

function defaultGameServerUrl() {
  if (isLocalBrowserHost()) {
    return "ws://127.0.0.1:8788/match";
  }
  if (window.location.hostname === LocalTunnelHostname) {
    return `wss://${LocalTunnelHostname}/match`;
  }

  return "wss://evanopolis-v1-game-server-staging.fly.dev/match";
}

function generatedClientId() {
  const suffix = Math.random().toString(16).slice(2, 10);
  return `browser-${suffix}`;
}

function writeRoomParams(gameId) {
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("game_id", gameId);
  if (entryMode === "host_room") {
    nextParams.set("view", "host");
  } else {
    nextParams.delete("view");
  }
  nextParams.set("rooms_api_url", normalizedBaseUrl());
  nextParams.set("auth_api_url", normalizedAuthBaseUrl());
  nextParams.set("chain_id", expectedChainId());
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function persistRoomsApiUrl() {
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("rooms_api_url", normalizedBaseUrl());
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function persistAuthParams() {
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("auth_api_url", normalizedAuthBaseUrl());
  nextParams.set("chain_id", expectedChainId());
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function normalizedBaseUrl() {
  return roomsApiUrlInput.value.trim().replace(/\/+$/, "");
}

function normalizedAuthBaseUrl() {
  return authApiUrlInput.value.trim().replace(/\/+$/, "");
}

function expectedChainId() {
  return expectedChainIdInput.value.trim() || "421614";
}

function assertExpectedChainId() {
  if (!/^[1-9][0-9]*$/.test(expectedChainId())) {
    throw new Error(t("Expected chain must be a positive numeric chain id."));
  }
}

function showStatus(message, tone = "") {
  entryStatus.textContent = message;
  if (tone === "") {
    entryStatus.removeAttribute("data-tone");
    return;
  }

  entryStatus.dataset.tone = tone;
}

function showAuthStatus(message, tone = "") {
  authStatus.textContent = message;
  if (tone === "") {
    authStatus.removeAttribute("data-tone");
    return;
  }

  authStatus.dataset.tone = tone;
}

function showPaymentStatus(message, tone = "") {
  paymentStatus.textContent = message;
  if (tone === "") {
    paymentStatus.removeAttribute("data-tone");
    return;
  }

  paymentStatus.dataset.tone = tone;
}

function showPaidLaunchStatus(message, tone = "") {
  paidLaunchStatus.hidden = message === "";
  paidLaunchStatus.textContent = message;
  if (tone === "") {
    paidLaunchStatus.removeAttribute("data-tone");
    return;
  }

  paidLaunchStatus.dataset.tone = tone;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function paymentStorageKey() {
  if (activeRoom === null || authSession === null) {
    return null;
  }

  return `evanopolis.roomEntry.payment:${activeRoom.game_id}:${authSession.address.toLowerCase()}`;
}

function loadStoredPaymentDraft() {
  const key = paymentStorageKey();
  if (key === null) {
    paymentTxHashInput.value = "";
    showPaymentStatus("");
    renderPaidLaunchState();
    return;
  }

  const rawValue = window.localStorage.getItem(key);
  if (rawValue === null) {
    paymentTxHashInput.value = "";
    showPaymentStatus("");
    renderPaidLaunchState();
    return;
  }

  const storedPayment = parseJson(rawValue);
  if (storedPayment === null || typeof storedPayment.txHash !== "string") {
    paymentTxHashInput.value = "";
    showPaymentStatus("");
    renderPaidLaunchState();
    return;
  }

  paymentTxHashInput.value = storedPayment.txHash;
  if (storedPayment.verifiedPayment !== null && typeof storedPayment.verifiedPayment === "object") {
    showPaymentStatus(t("Payment verified."), "success");
    renderPaidLaunchState();
    return;
  }

  showPaymentStatus(t("Payment transaction saved locally."));
  renderPaidLaunchState();
}

function persistPaymentDraft() {
  const key = paymentStorageKey();
  if (key === null) {
    return;
  }

  const txHash = paymentTxHashInput.value.trim();
  if (txHash === "") {
    window.localStorage.removeItem(key);
    clearPaidLaunchPayload();
    renderAdmissionState();
    return;
  }

  saveStoredPayment({
    txHash,
    verifiedPayment: null,
  });
  renderAdmissionState();
}

function saveStoredPayment(value) {
  const key = paymentStorageKey();
  if (key === null) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function clearStoredPayment() {
  const key = paymentStorageKey();
  if (key !== null) {
    window.localStorage.removeItem(key);
  }

  clearPaidLaunchPayload();
  paymentTxHashInput.value = "";
  showPaymentStatus("");
  renderAdmissionState();
}

async function openPaidClient() {
  if (activeRoom === null) {
    throw new Error(t("Load a room before opening the paid client."));
  }

  if (!hasUsableAuthSession()) {
    throw new Error(t("Connect wallet before opening the paid client."));
  }

  if (admissionState !== "admitted" || admittedPayment === null) {
    throw new Error(t("Check and confirm this wallet's ticket before opening the paid client."));
  }

  const payloadKey = paidLaunchStorageKey();
  const payload = buildPaidLaunchPayload(admittedPayment);
  window.sessionStorage.setItem(payloadKey, JSON.stringify(payload));
  window.location.assign(buildPaidLaunchUrl(payloadKey, activeRoom));
}

function renderPaidLaunchState() {
  if (activeRoom === null) {
    paidLaunchPanel.hidden = true;
    openPaidClientButton.disabled = true;
    showPaidLaunchStatus("");
    return;
  }

  if (!hasUsableAuthSession()) {
    paidLaunchPanel.hidden = true;
    openPaidClientButton.disabled = true;
    showPaidLaunchStatus("");
    return;
  }

  if (admissionState !== "admitted" || admittedPayment === null) {
    paidLaunchPanel.hidden = true;
    openPaidClientButton.disabled = true;
    showPaidLaunchStatus("");
    return;
  }

  paidLaunchPanel.hidden = false;
  openPaidClientButton.disabled = false;
  showPaidLaunchStatus("");
}

function paidLaunchStorageKey() {
  return `evanopolis.paidLaunch:${activeRoom.game_id}:${authSession.address.toLowerCase()}`;
}

function clearPaidLaunchPayload() {
  if (activeRoom === null || authSession === null) {
    return;
  }

  window.sessionStorage.removeItem(paidLaunchStorageKey());
}

function buildPaidLaunchPayload(verifiedPayment) {
  return {
    protocol: "evanopolis-launch",
    version: 1,
    mode: "paid_room",
    gameServerUrl: defaultGameServerUrl(),
    room: {
      gameId: activeRoom.game_id,
      playerCount: activeRoom.player_count,
      entryFeeAmount: activeRoom.entry_fee_amount,
      entryFeeTier: activeRoom.entry_fee_tier,
    },
    wallet: {
      address: authSession.address,
    },
    authToken: authSession.token,
    authExpiresAt: authSession.expires_at,
    authApiUrl: normalizedAuthBaseUrl(),
    roomsApiUrl: normalizedBaseUrl(),
    expectedChainId: Number(expectedChainId()),
    verifiedPayment: {
      txHash: verifiedPayment.txHash || paymentTxHashInput.value.trim(),
      blockNumber: verifiedPayment.blockNumber || null,
      logIndex: verifiedPayment.logIndex ?? null,
    },
  };
}

function hasUsableAuthSession() {
  if (authSession === null) {
    return false;
  }

  const expiresAt = new Date(authSession.expires_at);
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt.getTime() > Date.now();
}

function renderAuthSession() {
  const hasConnectedWallet = hasUsableAuthSession();
  createRoomButton.disabled = !hasConnectedWallet;
  connectWalletButton.hidden = hasConnectedWallet;
  if (!hasConnectedWallet) {
    walletAddress.hidden = true;
    walletAddress.textContent = "";
    walletTokenStatus.textContent = authSession === null ? "missing" : "expired";
    walletBalance = null;
    renderPaidLaunchState();
    renderEntryFlow();
    return;
  }

  walletAddress.hidden = false;
  walletAddress.textContent = abbreviateAddress(authSession.address);
  walletTokenStatus.textContent = hasUsableAuthSession()
    ? `expires ${formatDate(authSession.expires_at)}`
    : "expired";
  renderPaidLaunchState();
  renderEntryFlow();
}

function resetAuthSession(message) {
  authSession = null;
  invalidateAdmission();
  renderAuthSession();
  showAuthStatus(message, "error");
}

function installWalletChangeHandlers() {
  const provider = window.ethereum;
  if (provider === undefined || typeof provider.on !== "function") {
    return;
  }

  provider.on("accountsChanged", () => {
    resetAuthSession(t("Wallet account changed. Connect again."));
  });
  provider.on("chainChanged", () => {
    resetAuthSession(t("Wallet network changed. Connect again."));
  });
}

function getEthereumProvider() {
  if (window.ethereum === undefined) {
    throw new Error(t("No injected wallet found. Open this page in a wallet-enabled browser."));
  }

  return window.ethereum;
}

async function ensureExpectedChain(provider) {
  assertExpectedChainId();
  const currentChainId = await provider.request({ method: "eth_chainId" });
  const expectedChainHex = getChainHex(expectedChainId());

  if (String(currentChainId).toLowerCase() === expectedChainHex.toLowerCase()) {
    return;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: expectedChainHex }],
    });
  } catch (error) {
    if (getWalletErrorCode(error) === 4902) {
      const chainParams = chainParamsFor(expectedChainId());
      if (chainParams === null) {
        throw new Error(t("Expected chain {chain} is not available in the wrapper presets.", { chain: expectedChainId() }));
      }

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [chainParams],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expectedChainHex }],
      });
      return;
    }

    if (getWalletErrorCode(error) === 4001) {
      throw new Error(t("Network switch was cancelled in the wallet."));
    }

    throw new Error(t("Failed to switch network: {reason}", { reason: walletErrorMessage(error) }));
  }
}

async function fetchJson(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch {
    const requestUrl = new URL(url);
    throw new Error(t("Could not reach the auth server at {origin}.", { origin: requestUrl.origin }));
  }

  const body = await readJson(response);
  if (response.ok) {
    return body;
  }

  if (body && body.error === "origin_not_allowed") {
    throw new Error(t("This page origin is not allowed by the auth server. Add {origin} to its allowed origins.", { origin: window.location.origin }));
  }

  if (body && typeof body.error === "string") {
    throw new Error(body.error);
  }

  throw new Error(t("Auth request failed with HTTP {status}.", { status: response.status }));
}

function getChainHex(chainId) {
  return `0x${Number(chainId).toString(16)}`;
}

function chainParamsFor(chainId) {
  const presets = {
    "42161": {
      chainName: "Arbitrum One",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://arb1.arbitrum.io/rpc"],
      blockExplorerUrls: ["https://arbiscan.io"],
    },
    "421614": {
      chainName: "Arbitrum Sepolia",
      nativeCurrency: { name: "Arbitrum Sepolia Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
      blockExplorerUrls: ["https://sepolia.arbiscan.io"],
    },
  };
  const preset = presets[chainId];
  if (preset === undefined) {
    return null;
  }

  return {
    chainId: getChainHex(chainId),
    ...preset,
  };
}

function getWalletErrorCode(error) {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  return error.code ?? error.data?.originalError?.code ?? error.data?.code;
}

function walletErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const walletError = error;
    if (typeof walletError.reason === "string") {
      return walletError.reason;
    }

    if (typeof walletError.message === "string") {
      return walletError.message;
    }

    if (typeof walletError.data === "object" && walletError.data !== null) {
      if (typeof walletError.data.message === "string") {
        return walletError.data.message;
      }

      if (
        typeof walletError.data.originalError === "object" &&
        walletError.data.originalError !== null &&
        typeof walletError.data.originalError.message === "string"
      ) {
        return walletError.data.originalError.message;
      }
    }
  }

  return String(error);
}

function paymentWalletErrorMessage(error) {
  const message = walletErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("max fee per gas less than block base fee")) {
    return t("The wallet submitted a stale gas fee below the current network base fee. Retry the transaction; if MetaMask keeps reusing the stale fee, edit the gas fee upward or clear the pending wallet activity for this account.");
  }

  return message;
}

function abbreviateAddress(address) {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function abbreviateHash(hash) {
  if (hash.length <= 14) {
    return hash;
  }

  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatTokenAmount(amount) {
  const divisor = 1_000_000_000_000_000_000n;
  const whole = amount / divisor;
  const fractional = amount % divisor;
  if (fractional === 0n) {
    return whole.toString();
  }

  const fractionalText = fractional.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionalText.slice(0, 4)}`;
}

function formatRawEva(rawAmount) {
  const value = Number(rawAmount) / 1_000_000_000_000_000_000;
  if (!Number.isFinite(value)) {
    return String(rawAmount);
  }

  return `${value.toLocaleString("en-US", { maximumFractionDigits: 4 })} EVA`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

// Reads the connected wallet's EVA balance for the header pill. A response
// for a wallet that disconnected or changed meanwhile is discarded.
async function refreshHeaderBalance() {
  if (!hasUsableAuthSession()) {
    return;
  }

  const address = authSession.address;
  const balance = await readTokenBalance(address);
  if (!hasUsableAuthSession() || authSession.address !== address) {
    return;
  }

  walletBalance = balance;
  renderEntryFlow();
}

/*
  Renders the visible entry flow from the wallet, room, and admission state
  owned by the functions above. Screens:
    connect - creating a room, no wallet yet
    setup   - creating a room, wallet connected
    pay     - a room is loaded and the ticket is not confirmed
    enter   - the ticket is confirmed and the game can open
*/
function renderEntryFlow() {
  const isConnected = hasUsableAuthSession();
  const hasRoom = activeRoom !== null;
  const isInviteMode = entryMode === "invite";
  const isAdmitted = hasRoom && admissionState === "admitted";
  const screen = entryScreen({ isConnected, hasRoom, isInviteMode, isAdmitted });
  entryShell.dataset.screen = screen;

  const isLoadingInvite = isInviteMode && !hasRoom;
  const ticketPrice = hasRoom
    ? formatRawEva(activeRoom.entry_fee_amount)
    : EntryFeeTierPrices[entryFeeTierSelect.value];
  const seatTotal = hasRoom ? Number(activeRoom.player_count) : Number(playerCountSelect.value);
  const hostName = hasRoom
    ? activeRoom.creator_display_name || t("Host")
    : displayNameInput.value.trim() || t("You");

  renderHeaderWallet(isConnected);
  renderHero(isInviteMode, hasRoom);
  renderPressedOptions("player-count-option", ["2", "3", "4"], playerCountSelect.value);
  renderPressedOptions("entry-fee-tier-option", Object.keys(EntryFeeTierPrices), entryFeeTierSelect.value);
  renderSteps({ isConnected, hasRoom, isInviteMode, isAdmitted, isLoadingInvite, ticketPrice, seatTotal, hostName });

  // Until an invitation loads, its price and seats are unknown.
  const showsRoomPreview = hasRoom || (isConnected && !isInviteMode);
  emptyRoomState.hidden = showsRoomPreview;
  roomSeats.hidden = !showsRoomPreview;
  roomRows.hidden = !showsRoomPreview;
  roomSupport.hidden = !hasRoom;
  renderSeats(hostName, seatTotal);
  roomTicketValue.textContent = ticketPrice;
  roomSeatCount.textContent = String(seatTotal);

  createRoomButton.hidden = screen !== "setup";
  connectWalletBarButton.hidden = isConnected;
  // Payment needs a signed-in wallet; until then the card asks to connect.
  if (hasRoom && !isConnected) {
    paymentPanel.hidden = true;
  }
  continuePaymentButton.hidden = admissionState === "error";
  renderRoomNotice(roomNoticeFor(screen, isConnected, isInviteMode));
}

function entryScreen({ isConnected, hasRoom, isInviteMode, isAdmitted }) {
  if (!hasRoom && !isInviteMode) {
    return isConnected ? "setup" : "connect";
  }

  return isAdmitted ? "enter" : "pay";
}

// Sets each step to active, pending, or done and fills its summary line.
function renderSteps({ isConnected, hasRoom, isInviteMode, isAdmitted, isLoadingInvite, ticketPrice, seatTotal, hostName }) {
  stepWallet.dataset.state = isConnected ? "done" : "active";
  if (isInviteMode) {
    stepSetup.dataset.state = hasRoom ? "done" : "active";
  } else {
    stepSetup.dataset.state = hasRoom ? "done" : isConnected ? "active" : "pending";
  }
  stepPay.dataset.state = isAdmitted ? "done" : hasRoom && isConnected ? "active" : "pending";
  stepEnter.dataset.state = isAdmitted ? "active" : "pending";

  stepSetupSummaryLabel.textContent = isInviteMode ? t("Invitation loaded") : t("Game set up");
  stepSetupSummaryValue.textContent = hasRoom
    ? t("{game} · {count} players · {price}", { game: isInviteMode ? t("Paid game") : hostName, count: seatTotal, price: ticketPrice })
    : "";
  if (stepPay.dataset.state === "active") {
    stepPayCopy.textContent = t("Your seat is held by the wallet that pays for it. The wallet may ask you twice — once to allow EVA, once to send it.");
  } else if (isLoadingInvite) {
    stepPayCopy.textContent = t("The ticket price appears once the invitation loads. Your wallet may ask twice: first to allow EVA, then to pay.");
  } else {
    stepPayCopy.textContent = t("{price}, once the room is open. Your wallet may ask twice: first to allow EVA, then to pay.", { price: ticketPrice });
  }
  stepPaySummaryValue.textContent = ticketPrice;
}

// Shows "Not connected", the short address while the balance loads, or the
// EVA balance once it is known.
function renderHeaderWallet(isConnected) {
  if (!isConnected) {
    headerWalletPill.dataset.state = "idle";
    headerWalletLabel.textContent = t("Wallet");
    headerWalletValue.textContent = t("Not connected");
    headerWalletUnit.hidden = true;
    return;
  }

  headerWalletPill.dataset.state = "connected";
  if (walletBalance === null) {
    headerWalletLabel.textContent = t("Wallet");
    headerWalletValue.textContent = abbreviateAddress(authSession.address);
    headerWalletUnit.hidden = true;
    return;
  }

  headerWalletLabel.textContent = t("Balance");
  headerWalletValue.textContent = formatBalance(walletBalance);
  headerWalletUnit.hidden = false;
}

function renderHero(isInviteMode, hasRoom) {
  entryModeSwitch.hidden = isInviteMode || hasRoom;
  if (isInviteMode) {
    const hostName = hasRoom && activeRoom.creator_display_name ? activeRoom.creator_display_name : t("Someone");
    entryEyebrowState.textContent = t("Invitation");
    entryPageTitle.textContent = t("You’re invited");
    entryPageIntro.textContent = t("{host} saved you a seat in a paid game of Evanopolis. Connect your wallet, pay your ticket, and the board opens once every seat is paid.", { host: hostName });
    return;
  }

  if (hasRoom) {
    entryEyebrowState.textContent = t("Room open");
    entryPageTitle.textContent = t("Your room is open");
    entryPageIntro.textContent = t("Send the link to your players. Each one pays their own ticket, and the board opens as soon as every seat is paid.");
    return;
  }

  entryEyebrowState.textContent = t("New room");
  entryPageTitle.textContent = t("Create a game");
  entryPageIntro.textContent = t("Choose how many players and what the ticket costs. We open the room and give you a link to invite them — the game starts once everyone has joined.");
}

// Marks the option button matching the selected value as pressed.
function renderPressedOptions(idPrefix, values, selectedValue) {
  for (const value of values) {
    document.getElementById(`${idPrefix}-${value}`).ariaPressed = String(value === selectedValue);
  }
}

// The Rooms API only reports the host and the seat count, so the card shows
// the host followed by open seats.
function renderSeats(hostName, seatTotal) {
  for (let index = 1; index <= MaxSeatCount; index += 1) {
    const seat = document.getElementById(`seat-${index}`);
    const avatar = document.getElementById(`seat-${index}-avatar`);
    const name = document.getElementById(`seat-${index}-name`);
    const tag = document.getElementById(`seat-${index}-tag`);
    seat.hidden = index > seatTotal;
    if (index === 1) {
      seat.dataset.state = "host";
      avatar.textContent = hostName.charAt(0).toUpperCase();
      name.textContent = hostName;
      tag.textContent = t("Host");
      continue;
    }

    seat.dataset.state = "open";
    avatar.textContent = String(index);
    name.textContent = t("Open seat");
    tag.textContent = "";
  }
}

function roomNoticeFor(screen, isConnected, isInviteMode) {
  if (screen === "connect") {
    return WalletNotices.create;
  }
  if (screen === "setup") {
    return displayNameInput.value.trim() === "" ? SetupNotices.missingName : SetupNotices.ready;
  }
  if (!isConnected) {
    return isInviteMode ? WalletNotices.invite : WalletNotices.create;
  }

  return AdmissionNotices[admissionState];
}

function renderRoomNotice(notice) {
  roomNotice.dataset.icon = notice.icon;
  roomNoticeText.textContent = t(notice.text);
  roomNoticeMobile.textContent = t(notice.mobile);
  roomCtaNote.textContent = notice.note === "" ? "" : t(notice.note);
  roomCtaNote.hidden = notice.note === "";
}

// Formats a raw 18-decimal EVA amount with two decimals, e.g. 1,234.50.
// EVA amounts always use "." decimals, matching the ticket tier labels.
function formatBalance(amount) {
  const hundredths = amount / 10_000_000_000_000_000n;
  return (Number(hundredths) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
