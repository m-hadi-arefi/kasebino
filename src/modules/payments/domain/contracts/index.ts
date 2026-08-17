/**
 * ADR-012 — Payment Domain contract.
 *
 * PaymentGateway port + sandbox/mock until ADR-084 Accepted.
 * OrderPaid via Ordering PaymentConfirmPort. Fees inactive (ADR-091 Kerman pilot).
 * No real Iranian PSP in this cycle. Checkout UI → ARD-012/034 + uiuxpromax.
 */

import { MONETIZATION_POLICY, VENDOR_POLICY } from "../../../../shared/contracts/mvp-policies/index.js";

export { MONETIZATION_POLICY, VENDOR_POLICY };

export const PAYMENT_STATUSES = [
  "requires_payment",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_TERMINAL_STATUSES = [
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
] as const satisfies readonly PaymentStatus[];

export type PaymentTerminalStatus = (typeof PAYMENT_TERMINAL_STATUSES)[number];

/** Sandbox provider id until ADR-084 selects a concrete Iranian PSP. */
export const SANDBOX_PROVIDER_ID = "sandbox" as const;

/** Western PSPs must never be assumed as default (Iranian First / ADR-012). */
export const FORBIDDEN_DEFAULT_PROVIDERS = [
  "stripe",
  "paypal",
  "square",
] as const;

export const PAYMENT_EVENTS = [
  "PaymentIntentCreated",
  "PaymentSucceeded",
  "PaymentFailed",
  "PaymentRefunded",
] as const;

export type PaymentEventName = (typeof PAYMENT_EVENTS)[number];

/**
 * Binding decision snapshot (ADR-012 + ADR-084 Proposed + ADR-091 fees).
 */
export const PAYMENTS_DECISION = {
  module: "payments",
  aggregate: "PaymentIntent",
  port: "PaymentGateway",
  providerSelectionAdr: "ADR-084",
  providerDecisionStatus: VENDOR_POLICY.decisionStatus,
  implementationAllowed: VENDOR_POLICY.implementationAllowed,
  sandboxProviderId: SANDBOX_PROVIDER_ID,
  forbiddenDefaultProviders: FORBIDDEN_DEFAULT_PROVIDERS,
  statuses: PAYMENT_STATUSES,
  terminals: PAYMENT_TERMINAL_STATUSES,
  orderIntegration: "PaymentConfirmPort" as const,
  marksOrderPaidVia: "OrderPaid" as const,
  fees: {
    active: false,
    reason: MONETIZATION_POLICY.phase1Stance,
    chargeTxFeeInPilot: MONETIZATION_POLICY.chargeTxFeeInPilot,
    chargeSaasFeeInPilot: MONETIZATION_POLICY.chargeSaasFeeInPilot,
    persianPilotCopy: MONETIZATION_POLICY.persianPilotCopy,
  },
  apiDeferredTo: "ARD-012",
  checkoutUiDeferredTo: "ARD-034",
  events: PAYMENT_EVENTS,
  currency: "IRR" as const,
  moneyUnit: "minor" as const,
} as const;

/**
 * Iranian First — Persian payment copy (domain contract; UI later).
 */
export const PAYMENT_STATUS_LABELS_FA = {
  requires_payment: "در انتظار پرداخت",
  processing: "در حال پردازش پرداخت",
  succeeded: "پرداخت موفق",
  failed: "پرداخت ناموفق",
  cancelled: "پرداخت لغو شده",
  refunded: "بازپرداخت‌شده",
} as const satisfies Record<PaymentStatus, string>;

export const PAYMENTS_COPY_FA = {
  sandboxOnly: "در این نسخه فقط درگاه آزمایشی فعال است.",
  amountTomanHint: "مبلغ به تومان نمایش داده می‌شود.",
  pilotFeeInactive: MONETIZATION_POLICY.persianPilotCopy,
  paymentFailed: "پرداخت انجام نشد. دوباره تلاش کنید.",
  webhookInvalid: "احراز هویت وب‌هوک پرداخت نامعتبر است.",
} as const;

/** Fee extension point — inactive for Kerman pilot (ADR-091). */
export const FEE_POLICY = {
  active: false as const,
  txFeeBps: 0,
  saasFeeMonthlyToman: 0,
  computeTxFeeMinor(amountMinor: bigint): bigint {
    void amountMinor;
    return 0n;
  },
} as const;

/** Cache — do not aggressively cache payment intents. */
export const PAYMENTS_CACHE = {
  intentKeyHint: "mos:{env}:{merchantId}:payment:{paymentId}",
  ttlSeconds: 30,
  neverSourceOfTruth: true,
  aggressiveCachingForbidden: true,
} as const;

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isPaymentTerminalStatus(
  value: PaymentStatus,
): value is PaymentTerminalStatus {
  return (PAYMENT_TERMINAL_STATUSES as readonly string[]).includes(value);
}

export function paymentStatusLabelFa(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS_FA[status];
}

export function assertNotForbiddenDefaultProvider(providerId: string): void {
  const normalized = providerId.trim().toLowerCase();
  if (
    (FORBIDDEN_DEFAULT_PROVIDERS as readonly string[]).includes(normalized)
  ) {
    throw new Error(
      `Provider "${providerId}" must not be the MVP default (ADR-012 Iranian First). Use sandbox until ADR-084.`,
    );
  }
}

export const PAYMENTS = {
  decision: PAYMENTS_DECISION,
  events: PAYMENT_EVENTS,
  statusLabelsFa: PAYMENT_STATUS_LABELS_FA,
  copyFa: PAYMENTS_COPY_FA,
  feePolicy: FEE_POLICY,
  cache: PAYMENTS_CACHE,
} as const;
