// ---
// summary: Checks paid-room admission with the auth/payment service.
// ---

export interface PaidAdmission {
  readonly admitted: true;
  readonly player: string;
  readonly game_id: string;
  readonly amount: string;
  readonly tx_hash: string;
  readonly log_index: number;
  readonly block_number: number;
}

export async function checkPaidAdmission(input: {
  readonly auth_api_base_url: string;
  readonly auth_token: string;
  readonly game_id: string;
  readonly amount: string;
}): Promise<PaidAdmission | string> {
  let admission_url: URL;
  try {
    admission_url = new URL("/payments/admission/check", input.auth_api_base_url);
  } catch {
    return "invalid_auth_api_url";
  }

  let response: Response;
  try {
    response = await fetch(admission_url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.auth_token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        gameId: input.game_id,
        amount: input.amount
      })
    });
  } catch {
    return "admission_service_unavailable";
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return "invalid_admission_response";
  }

  if (!response.ok) {
    return parseAdmissionError(response.status, body);
  }

  return parseAdmission(body, input.game_id, input.amount);
}

export function configuredAuthApiUrl(): string | undefined {
  const value = process.env.EVANOPOLIS_AUTH_API_URL?.trim();
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}

function parseAdmissionError(status: number, body: unknown): string {
  const reason = typeof body === "object" && body !== null && typeof (body as { reason?: unknown }).reason === "string"
    ? (body as { reason: string }).reason
    : undefined;
  const error = typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string"
    ? (body as { error: string }).error
    : undefined;

  if (status === 401) {
    return "invalid_auth_token";
  }
  if (status === 403 && reason !== undefined) {
    return reason;
  }
  if (status === 501) {
    return "payment_verification_unavailable";
  }
  return error ?? "admission_service_unavailable";
}

function parseAdmission(body: unknown, game_id: string, amount: string): PaidAdmission | string {
  if (typeof body !== "object" || body === null) {
    return "invalid_admission_response";
  }

  const record = body as Record<string, unknown>;
  if (
    record.admitted !== true
    || typeof record.player !== "string"
    || record.gameId !== game_id
    || record.amount !== amount
    || typeof record.txHash !== "string"
    || !/^0x[0-9a-fA-F]{64}$/.test(record.txHash)
    || typeof record.logIndex !== "number"
    || !Number.isInteger(record.logIndex)
    || typeof record.blockNumber !== "number"
    || !Number.isInteger(record.blockNumber)
  ) {
    return "invalid_admission_response";
  }

  return {
    admitted: true,
    player: record.player,
    game_id,
    amount,
    tx_hash: record.txHash,
    log_index: record.logIndex,
    block_number: record.blockNumber
  };
}
