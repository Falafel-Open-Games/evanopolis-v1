/*
  Browser-only production entrypoint for wallet login, room creation, and
  invite lookup. It can pay, verify, and recover payment proofs before the
  game server owns authoritative paid admission.
*/
const createRoomForm = document.getElementById("create-room-form");
const roomActionTitle = document.getElementById("room-action-title");
const inviteModePanel = document.getElementById("invite-mode-panel");
const joinRoomButton = document.getElementById("join-room-button");
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
const lookupRoomButton = document.getElementById("lookup-room-button");
const entryStatus = document.getElementById("entry-status");
const roomSummary = document.getElementById("room-summary");
const emptyRoomState = document.getElementById("empty-room-state");
const roomGameId = document.getElementById("room-game-id");
const roomCreatorDisplayName = document.getElementById("room-creator-display-name");
const roomPlayerCount = document.getElementById("room-player-count");
const roomEntryFeeTier = document.getElementById("room-entry-fee-tier");
const roomEntryFeeAmount = document.getElementById("room-entry-fee-amount");
const roomCreatedAt = document.getElementById("room-created-at");
const inviteLink = document.getElementById("invite-link");
const launchRoomLink = document.getElementById("launch-room-link");
const paymentPanel = document.getElementById("payment-panel");
const paymentTxHashInput = document.getElementById("payment-tx-hash-input");
const paymentBalance = document.getElementById("payment-balance");
const paymentAllowance = document.getElementById("payment-allowance");
const checkPaymentButton = document.getElementById("check-payment-button");
const approvePaymentButton = document.getElementById("approve-payment-button");
const payTicketButton = document.getElementById("pay-ticket-button");
const verifyPaymentButton = document.getElementById("verify-payment-button");
const recoverPaymentButton = document.getElementById("recover-payment-button");
const clearPaymentButton = document.getElementById("clear-payment-button");
const paymentStatus = document.getElementById("payment-status");
const paidLaunchPanel = document.getElementById("paid-launch-panel");
const openPaidClientButton = document.getElementById("open-paid-client-button");
const paidLaunchStatus = document.getElementById("paid-launch-status");

const PaymentTokenAddress = "0x422d3188537b3226c9a3cd47647d363fc5e0d727";
const PaymentHandlerAddress = "0x666711a0e1b300d3ba0e5d9579974ebaf28fecdb";
const PaymentAdapterAddress = "0x6863896de06241853470205f2df5d6a76f491fe1";
const PaymentRecoveryLookbackHours = 24;
const ZeroAddress = "0x0000000000000000000000000000000000000000";

const pageParams = new URLSearchParams(window.location.search);
const configuredGameId = pageParams.get("game_id") || pageParams.get("room") || "";
let authSession = null;
let activeRoom = null;
let isInviteMode = configuredGameId !== "";

roomsApiUrlInput.value = pageParams.get("rooms_api_url") || defaultRoomsApiUrl();
authApiUrlInput.value = pageParams.get("auth_api_url") || defaultAuthApiUrl();
expectedChainIdInput.value = pageParams.get("chain_id") || "421614";
displayNameInput.value = pageParams.get("display_name") || "";
playerCountSelect.value = normalizedPlayerCount(pageParams.get("player_count"));
entryFeeTierSelect.value = normalizedEntryFeeTier(pageParams.get("entry_fee_tier"));

connectWalletButton.addEventListener("click", () => {
  connectWallet().catch((error) => {
    resetAuthSession(error.message);
  });
});
joinRoomButton.addEventListener("click", handleJoinRoom);
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
lookupRoomButton.addEventListener("click", () => {
  handleLookupClick().catch((error) => {
    showStatus(error.message, "error");
  });
});
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

  return "https://evanopolis-v1-rooms-api-staging.fly.dev";
}

function defaultAuthApiUrl() {
  if (isLocalBrowserHost()) {
    return `http://${window.location.hostname || "127.0.0.1"}:3000`;
  }

  return window.location.origin;
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

async function connectWallet() {
  persistAuthParams();
  const provider = getEthereumProvider();

  showAuthStatus("Connecting wallet...");
  connectWalletButton.disabled = true;

  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const address = Array.isArray(accounts) ? accounts[0] : undefined;
    if (typeof address !== "string" || address.length === 0) {
      throw new Error("The wallet did not return an account.");
    }

    await ensureExpectedChain(provider);
    showAuthStatus("Requesting sign-in challenge...");
    const challenge = await fetchJson(`${normalizedAuthBaseUrl()}/auth/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address,
        chainId: Number(expectedChainId()),
        origin: window.location.origin,
      }),
    });

    showAuthStatus("Waiting for wallet signature...");
    const signature = await provider.request({
      method: "personal_sign",
      params: [challenge.message, address],
    });

    showAuthStatus("Verifying signature...");
    const verified = await fetchJson(`${normalizedAuthBaseUrl()}/auth/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address,
        nonce: challenge.nonce,
        signature,
      }),
    });

    authSession = {
      address,
      token: verified.token,
      expires_at: verified.expires_at,
      chain_id: expectedChainId(),
    };
    renderAuthSession();
    loadStoredPaymentDraft();
    showAuthStatus("Wallet connected.", "success");
  } finally {
    connectWalletButton.disabled = false;
  }
}

async function handleCreateRoom(event) {
  event.preventDefault();
  persistRoomsApiUrl();
  persistAuthParams();

  if (!hasUsableAuthSession()) {
    showStatus("Connect wallet before creating a room.", "error");
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
  writeRoomParams(body.game_id);
  switchToInviteMode();
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
  switchToInviteMode();
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
  activeRoom = room;
  const inviteUrl = buildInviteUrl(room.game_id);
  const launchUrl = buildLaunchUrl(room);

  roomGameId.textContent = room.game_id;
  roomCreatorDisplayName.textContent = room.creator_display_name || "-";
  roomPlayerCount.textContent = String(room.player_count);
  roomEntryFeeTier.textContent = room.entry_fee_tier;
  roomEntryFeeAmount.textContent = formatRawEva(room.entry_fee_amount);
  roomCreatedAt.textContent = formatDate(room.created_at);
  inviteLink.href = inviteUrl;
  inviteLink.textContent = inviteUrl;
  launchRoomLink.href = launchUrl;

  roomSummary.hidden = false;
  emptyRoomState.hidden = true;
  paymentPanel.hidden = false;
  loadStoredPaymentDraft();
  renderPaidLaunchState();
}

function renderEntryMode() {
  roomActionTitle.textContent = isInviteMode ? "Join Room" : "Create Room";
  inviteModePanel.hidden = !isInviteMode;
  createRoomForm.hidden = isInviteMode;

  if (isInviteMode && activeRoom === null) {
    showStatus("Loading invite...");
  } else if (isInviteMode) {
    showStatus("Invite loaded.", "success");
  } else {
    showStatus("Ready.");
  }
}

function switchToInviteMode() {
  isInviteMode = true;
  renderEntryMode();
}

function switchToCreateMode() {
  isInviteMode = false;
  activeRoom = null;
  roomSummary.hidden = true;
  emptyRoomState.hidden = false;
  paymentPanel.hidden = true;
  paymentTxHashInput.value = "";
  paymentBalance.textContent = "not checked";
  paymentAllowance.textContent = "not checked";
  paidLaunchPanel.hidden = true;
  showPaymentStatus("Payment not verified.");
  showPaidLaunchStatus("Verify payment before paid launch.");

  const nextParams = new URLSearchParams(window.location.search);
  nextParams.delete("game_id");
  nextParams.delete("room");
  const nextUrl = `${window.location.pathname}?${nextParams.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
  renderEntryMode();
}

function handleJoinRoom() {
  if (activeRoom === null) {
    showStatus("Load an invite before continuing.", "error");
    return;
  }

  if (!hasUsableAuthSession()) {
    showStatus("Connect wallet before continuing.", "error");
    return;
  }

  showStatus("Enter a payment transaction hash and verify it before launch.", "success");
  paymentTxHashInput.focus();
}

async function refreshPaymentReadiness() {
  assertPaymentContext();
  showPaymentStatus("Checking EVA balance and allowance...");
  const [balance, allowance] = await Promise.all([
    readTokenBalance(authSession.address),
    readAllowance(authSession.address),
  ]);

  paymentBalance.textContent = `${formatTokenAmount(balance)} EVA`;
  paymentAllowance.textContent = `${formatTokenAmount(allowance)} EVA`;

  const requiredAmount = BigInt(activeRoom.entry_fee_amount);
  if (balance < requiredAmount) {
    showPaymentStatus("Wallet balance is below this room ticket amount.", "error");
    return;
  }

  if (allowance < requiredAmount) {
    showPaymentStatus("Approve EVA before paying this ticket.");
    return;
  }

  showPaymentStatus("Balance and allowance are ready.", "success");
}

async function approvePayment() {
  assertPaymentContext();
  showPaymentStatus("Requesting EVA approval in wallet...");

  const txHash = await sendWalletTransaction({
    to: PaymentTokenAddress,
    data: paymentInterface(["function approve(address spender, uint256 amount)"])
      .encodeFunctionData("approve", [PaymentHandlerAddress, BigInt(activeRoom.entry_fee_amount)]),
  });

  showPaymentStatus(`Approval submitted: ${abbreviateHash(txHash)}. Waiting for confirmation...`);
  const receipt = await waitForTransactionReceipt(txHash);
  if (receipt === null) {
    showPaymentStatus(`Approval submitted: ${abbreviateHash(txHash)}. It is not confirmed yet; wait a moment, then click Check Balance.`, "success");
    return;
  }

  if (receipt.status !== "0x1") {
    showPaymentStatus(`Approval transaction failed: ${abbreviateHash(txHash)}.`, "error");
    return;
  }

  await refreshPaymentReadiness();
}

async function payTicket() {
  assertPaymentContext();
  showPaymentStatus("Checking allowance before payment...");

  const requiredAmount = BigInt(activeRoom.entry_fee_amount);
  const allowance = await readAllowance(authSession.address);
  paymentAllowance.textContent = `${formatTokenAmount(allowance)} EVA`;
  if (allowance < requiredAmount) {
    showPaymentStatus("Approve EVA and wait for the approval transaction to confirm before paying this ticket.", "error");
    return;
  }

  showPaymentStatus("Submitting payment transaction in wallet...");

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
  showPaymentStatus(`Payment submitted: ${abbreviateHash(txHash)}. Verifying...`);
  await verifyManualPayment();
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
    throw new Error("The wallet did not return an account.");
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
    throw new Error(`Transaction preflight failed: ${walletErrorMessage(error)}`);
  }

  try {
    return await provider.request({
      method: "eth_sendTransaction",
      params: [request],
    });
  } catch (error) {
    throw new Error(`Wallet transaction failed: ${paymentWalletErrorMessage(error)}`);
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
    throw new Error("Load a room before using payment actions.");
  }

  if (!hasUsableAuthSession()) {
    throw new Error("Connect wallet before using payment actions.");
  }
}

function paymentInterface(abi) {
  if (window.ethers === undefined) {
    throw new Error("Payment helper library did not load.");
  }

  return new window.ethers.Interface(abi);
}

function deriveGameIdBytes32(gameId) {
  return window.ethers.keccak256(window.ethers.toUtf8Bytes(`evanopolis:v1:${gameId}`));
}

async function verifyManualPayment() {
  if (activeRoom === null) {
    showPaymentStatus("Load a room before verifying payment.", "error");
    return;
  }

  if (!hasUsableAuthSession()) {
    showPaymentStatus("Connect wallet before verifying payment.", "error");
    return;
  }

  const txHash = paymentTxHashInput.value.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    showPaymentStatus("Enter a valid transaction hash.", "error");
    return;
  }

  persistPaymentDraft();
  showPaymentStatus("Verifying payment...");
  const verifiedPayment = await postPaymentVerify({
    txHash,
    gameId: activeRoom.game_id,
    amount: activeRoom.entry_fee_amount,
  });
  saveStoredPayment({
    txHash,
    verifiedPayment,
  });
  renderPaidLaunchState();
  showPaymentStatus(`Payment verified in block ${verifiedPayment.blockNumber}.`, "success");
}

async function recoverPayment() {
  assertPaymentContext();

  if (paymentTxHashInput.value.trim() !== "") {
    await verifyManualPayment();
    return;
  }

  showPaymentStatus(`Searching the last ${PaymentRecoveryLookbackHours} hours for this payment...`);

  const recoveredPayment = await postPaymentRecover({
    gameId: activeRoom.game_id,
    amount: activeRoom.entry_fee_amount,
    lookbackHours: PaymentRecoveryLookbackHours,
  });

  if (recoveredPayment === null || typeof recoveredPayment !== "object") {
    showPaymentStatus("No matching payment was recovered.", "error");
    return;
  }

  if (recoveredPayment.recovered !== true) {
    handleUnrecoveredPayment(recoveredPayment);
    return;
  }

  if (typeof recoveredPayment.txHash !== "string" || recoveredPayment.txHash === "") {
    showPaymentStatus("Payment recovery succeeded, but no transaction hash was returned.", "error");
    return;
  }

  paymentTxHashInput.value = recoveredPayment.txHash;
  saveStoredPayment({
    txHash: recoveredPayment.txHash,
    verifiedPayment: recoveredPayment,
  });
  renderPaidLaunchState();
  showPaymentStatus(`Payment recovered and verified: ${abbreviateHash(recoveredPayment.txHash)}.`, "success");
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
    showPaymentStatus("No matching payment was recovered.", "error");
    return;
  }

  if (body.reason === "multiple_candidates") {
    const candidateCount = Array.isArray(body.candidates) ? body.candidates.length : "Multiple";
    showPaymentStatus(`${candidateCount} matching payments found. Paste one candidate transaction hash and verify it.`, "error");
    return;
  }

  if (typeof body.reason === "string" && body.reason !== "") {
    showPaymentStatus(body.reason, "error");
    return;
  }

  showPaymentStatus("No matching payment was recovered.", "error");
}

function paymentErrorMessage(status, body, action) {
  const errorCode = body && typeof body.error === "string" ? body.error : "";

  if (errorCode === "payment_not_confirmed") {
    return "Payment transaction found, but it is not confirmed yet. Wait for confirmations and try again.";
  }

  if (errorCode === "payment_not_found") {
    return "Payment was not found yet. Wait for it to mine, verify again, or try Recover Payment.";
  }

  if (errorCode === "payment_mismatch") {
    return "The payment proof did not match this wallet, room, or ticket amount.";
  }

  if (errorCode === "not_implemented") {
    if (action === "recover") {
      return "Payment recovery is not enabled on this auth server.";
    }

    return "Payment verification is not enabled on this auth server.";
  }

  if (errorCode === "multiple_candidates") {
    if (Array.isArray(body.candidates)) {
      return `${body.candidates.length} matching payments were found. Paste one candidate transaction hash and verify it.`;
    }

    return "Multiple matching payments were found. Paste one candidate transaction hash and verify it.";
  }

  if (errorCode !== "") {
    return errorCode;
  }

  return `Payment verification failed with HTTP ${status}.`;
}

function buildInviteUrl(gameId) {
  const inviteParams = new URLSearchParams();
  inviteParams.set("game_id", gameId);
  inviteParams.set("rooms_api_url", normalizedBaseUrl());
  inviteParams.set("auth_api_url", normalizedAuthBaseUrl());
  inviteParams.set("chain_id", expectedChainId());
  return `${window.location.origin}${window.location.pathname}?${inviteParams.toString()}`;
}

function buildLaunchUrl(room) {
  const launchParams = new URLSearchParams();
  launchParams.set("match_id", room.game_id);
  launchParams.set("player_count", String(room.player_count));
  launchParams.set("auto_join", "0");
  return `./server-client.html?${launchParams.toString()}`;
}

function buildPaidLaunchUrl(payloadKey, room) {
  const launchParams = new URLSearchParams();
  launchParams.set("mode", "paid_room");
  launchParams.set("match_id", room.game_id);
  launchParams.set("client_id", generatedClientId());
  launchParams.set("paid_launch_key", payloadKey);
  launchParams.set("auto_join", "1");
  return `./server-client.html?${launchParams.toString()}`;
}

function defaultGameServerUrl() {
  if (isLocalBrowserHost()) {
    return "ws://127.0.0.1:8788/match";
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
    throw new Error("Expected chain must be a positive numeric chain id.");
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
    showPaymentStatus("Payment not verified.");
    renderPaidLaunchState();
    return;
  }

  const rawValue = window.localStorage.getItem(key);
  if (rawValue === null) {
    paymentTxHashInput.value = "";
    showPaymentStatus("Payment not verified.");
    renderPaidLaunchState();
    return;
  }

  const storedPayment = parseJson(rawValue);
  if (storedPayment === null || typeof storedPayment.txHash !== "string") {
    paymentTxHashInput.value = "";
    showPaymentStatus("Payment not verified.");
    renderPaidLaunchState();
    return;
  }

  paymentTxHashInput.value = storedPayment.txHash;
  if (storedPayment.verifiedPayment !== null && typeof storedPayment.verifiedPayment === "object") {
    showPaymentStatus("Payment verified.", "success");
    renderPaidLaunchState();
    return;
  }

  showPaymentStatus("Payment transaction saved locally.");
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
    renderPaidLaunchState();
    return;
  }

  saveStoredPayment({
    txHash,
    verifiedPayment: null,
  });
  renderPaidLaunchState();
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
  showPaymentStatus("Payment not verified.");
  renderPaidLaunchState();
}

async function openPaidClient() {
  if (activeRoom === null) {
    throw new Error("Load a room before opening the paid client.");
  }

  if (!hasUsableAuthSession()) {
    throw new Error("Connect wallet before opening the paid client.");
  }

  const storedPayment = verifiedStoredPayment();
  if (storedPayment === null) {
    throw new Error("Verify or recover payment before opening the paid client.");
  }

  const payloadKey = paidLaunchStorageKey();
  const payload = buildPaidLaunchPayload(storedPayment.verifiedPayment);
  window.sessionStorage.setItem(payloadKey, JSON.stringify(payload));
  window.location.assign(buildPaidLaunchUrl(payloadKey, activeRoom));
}

function renderPaidLaunchState() {
  if (activeRoom === null) {
    paidLaunchPanel.hidden = true;
    openPaidClientButton.disabled = true;
    showPaidLaunchStatus("Verify payment before paid launch.");
    return;
  }

  paidLaunchPanel.hidden = false;

  if (!hasUsableAuthSession()) {
    openPaidClientButton.disabled = true;
    showPaidLaunchStatus("Connect wallet before paid launch.");
    return;
  }

  if (verifiedStoredPayment() === null) {
    openPaidClientButton.disabled = true;
    showPaidLaunchStatus("Verify or recover payment before paid launch.");
    return;
  }

  openPaidClientButton.disabled = false;
  showPaidLaunchStatus("Paid launch is ready.", "success");
}

function verifiedStoredPayment() {
  const key = paymentStorageKey();
  if (key === null) {
    return null;
  }

  const storedPayment = parseJson(window.localStorage.getItem(key));
  if (storedPayment === null || typeof storedPayment !== "object") {
    return null;
  }

  if (typeof storedPayment.txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(storedPayment.txHash)) {
    return null;
  }

  if (storedPayment.verifiedPayment === null || typeof storedPayment.verifiedPayment !== "object") {
    return null;
  }

  return storedPayment;
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
  if (authSession === null) {
    walletAddress.textContent = "not connected";
    walletTokenStatus.textContent = "missing";
    renderPaidLaunchState();
    return;
  }

  walletAddress.textContent = abbreviateAddress(authSession.address);
  walletTokenStatus.textContent = hasUsableAuthSession()
    ? `expires ${formatDate(authSession.expires_at)}`
    : "expired";
  renderPaidLaunchState();
}

function resetAuthSession(message) {
  authSession = null;
  renderAuthSession();
  showAuthStatus(message, "error");
}

function installWalletChangeHandlers() {
  const provider = window.ethereum;
  if (provider === undefined || typeof provider.on !== "function") {
    return;
  }

  provider.on("accountsChanged", () => {
    resetAuthSession("Wallet account changed. Connect again.");
  });
  provider.on("chainChanged", () => {
    resetAuthSession("Wallet network changed. Connect again.");
  });
}

function getEthereumProvider() {
  if (window.ethereum === undefined) {
    throw new Error("No injected wallet found. Open this page in a wallet-enabled browser.");
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
        throw new Error(`Expected chain ${expectedChainId()} is not available in the wrapper presets.`);
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
      throw new Error("Network switch was cancelled in the wallet.");
    }

    throw new Error(`Failed to switch network: ${walletErrorMessage(error)}`);
  }
}

async function fetchJson(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch {
    const requestUrl = new URL(url);
    throw new Error(`Could not reach the auth server at ${requestUrl.origin}.`);
  }

  const body = await readJson(response);
  if (response.ok) {
    return body;
  }

  if (body && body.error === "origin_not_allowed") {
    throw new Error(`This page origin is not allowed by the auth server. Add ${window.location.origin} to its allowed origins.`);
  }

  if (body && typeof body.error === "string") {
    throw new Error(body.error);
  }

  throw new Error(`Auth request failed with HTTP ${response.status}.`);
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
    return "The wallet submitted a stale gas fee below the current network base fee. Retry the transaction; if MetaMask keeps reusing the stale fee, edit the gas fee upward or clear the pending wallet activity for this account.";
  }

  return message;
}

function abbreviateAddress(address) {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

  return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} EVA`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}
