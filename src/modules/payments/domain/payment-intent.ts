/**
 * PaymentIntent aggregate (ADR-012) — minimal payment for pickup orders.
 * Money as IRR minor units. Provider refs unique when set.
 */

import {
  SANDBOX_PROVIDER_ID,
  type PaymentStatus,
} from "./contracts/index.js";

export type { PaymentStatus };

export type PaymentIntent = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  readonly orderId: string;
  /** IRR minor units (rial). */
  readonly amountMinor: bigint;
  /** Always IRR for MVP Iranian retail. */
  readonly currency: "IRR";
  status: PaymentStatus;
  readonly providerId: string;
  providerRef: string | null;
  readonly idempotencyKey: string;
  /** Platform fee charged (always 0 while ADR-091 pilot fees inactive). */
  feeChargedMinor: bigint;
  failureCode: string | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CreatePaymentIntentInput = {
  id: string;
  merchantId: string;
  storeId: string;
  orderId: string;
  amountMinor: bigint;
  idempotencyKey: string;
  providerId?: string;
  now?: Date;
};

export function createPaymentIntent(
  input: CreatePaymentIntentInput,
): PaymentIntent {
  if (!input.merchantId.trim()) throw new Error("INVALID_MERCHANT");
  if (!input.storeId.trim()) throw new Error("INVALID_STORE");
  if (!input.orderId.trim()) throw new Error("INVALID_ORDER");
  if (!input.idempotencyKey.trim()) throw new Error("IDEMPOTENCY_REQUIRED");
  if (input.amountMinor <= 0n) throw new Error("INVALID_AMOUNT");

  const now = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId,
    orderId: input.orderId,
    amountMinor: input.amountMinor,
    currency: "IRR",
    status: "requires_payment",
    providerId: input.providerId ?? SANDBOX_PROVIDER_ID,
    providerRef: null,
    idempotencyKey: input.idempotencyKey,
    feeChargedMinor: 0n,
    failureCode: null,
    paidAt: null,
    refundedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function markPaymentProcessing(
  payment: PaymentIntent,
  providerRef: string,
  at: Date = new Date(),
): void {
  if (payment.status !== "requires_payment" && payment.status !== "processing") {
    throw new Error("INVALID_TRANSITION");
  }
  if (!providerRef.trim()) throw new Error("INVALID_PROVIDER_REF");
  payment.status = "processing";
  payment.providerRef = providerRef;
  payment.updatedAt = at;
}

export function markPaymentSucceeded(
  payment: PaymentIntent,
  at: Date = new Date(),
  opts?: { providerRef?: string; feeChargedMinor?: bigint },
): void {
  if (
    payment.status !== "requires_payment" &&
    payment.status !== "processing"
  ) {
    if (payment.status === "succeeded") return; // idempotent
    throw new Error("INVALID_TRANSITION");
  }
  if (opts?.providerRef !== undefined) {
    payment.providerRef = opts.providerRef;
  }
  payment.status = "succeeded";
  payment.feeChargedMinor = opts?.feeChargedMinor ?? 0n;
  payment.failureCode = null;
  payment.paidAt = at;
  payment.updatedAt = at;
}

export function markPaymentFailed(
  payment: PaymentIntent,
  failureCode: string,
  at: Date = new Date(),
): void {
  if (
    payment.status !== "requires_payment" &&
    payment.status !== "processing"
  ) {
    throw new Error("INVALID_TRANSITION");
  }
  payment.status = "failed";
  payment.failureCode = failureCode;
  payment.updatedAt = at;
}

export function markPaymentRefunded(
  payment: PaymentIntent,
  at: Date = new Date(),
): void {
  if (payment.status !== "succeeded") {
    throw new Error("INVALID_TRANSITION");
  }
  payment.status = "refunded";
  payment.refundedAt = at;
  payment.updatedAt = at;
}

export function isPaymentSucceeded(payment: PaymentIntent): boolean {
  return payment.status === "succeeded";
}
