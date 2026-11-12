import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../room-entry.js", import.meta.url), "utf8");

function functionBody(functionName, nextFunctionName) {
  const start = source.indexOf(`async function ${functionName}`);
  const end = source.indexOf(`async function ${nextFunctionName}`, start + 1);
  assert.notEqual(start, -1, `${functionName} must exist`);
  assert.notEqual(end, -1, `${nextFunctionName} must follow ${functionName}`);
  return source.slice(start, end);
}

test("paid flow reserves a seat before opening the wallet transaction", () => {
  const body = functionBody("payTicket", "readTokenBalance");
  const reservationIndex = body.indexOf("await postPaymentReservation");
  const transactionIndex = body.indexOf("await sendWalletTransaction");

  assert.notEqual(reservationIndex, -1);
  assert.notEqual(transactionIndex, -1);
  assert.ok(reservationIndex < transactionIndex);
  assert.match(body, /reservationId: paymentReservationId/);
});

test("verification and recovery carry the persisted reservation binding", () => {
  const verifyBody = functionBody("verifyManualPayment", "recoverPayment");
  const recoverBody = functionBody("recoverPayment", "postPaymentReservation");
  const reservationBody = functionBody("postPaymentReservation", "postPaymentVerify");
  const postVerifyBody = functionBody("postPaymentVerify", "postPaymentRecover");
  const postRecoverBody = source.slice(
    source.indexOf("async function postPaymentRecover"),
    source.indexOf("function handleUnrecoveredPayment"),
  );

  assert.match(verifyBody, /reservationId: paymentReservationId/);
  assert.match(recoverBody, /reservationId: paymentReservationId/);
  assert.match(reservationBody, /\/payments\/reservations/);
  assert.match(postVerifyBody, /reservationId === null \? \{\} : \{ reservationId \}/);
  assert.match(postRecoverBody, /reservationId === null \? \{\} : \{ reservationId \}/);
});

test("local payment drafts retain and restore the reservation id", () => {
  assert.match(source, /paymentReservationId = typeof storedPayment\.reservationId/);
  assert.match(source, /txHash,\s+reservationId: paymentReservationId,\s+verifiedPayment: null/);
  assert.match(source, /paymentReservationId = null;\s+paymentTxHashInput\.value = "";/);
});
