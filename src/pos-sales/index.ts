/**
 * ADR-009 — POS and Sales Domain contract.
 *
 * CompleteSale UoW: validate cart → tender → membership upsert → stock
 * decrement → loyalty earn (LoyaltyEarnPort / ADR-010) → receipt/outbox later → SaleCompleted.
 * Tender: cash | card_terminal | mixed (ADR-091). Card-acquiring out of MVP.
 * Phone required; Idempotency-Key required (ADR-030).
 */

import {
  POS_TENDER_POLICY,
  POS_TENDER_TYPES,
  type PosTenderType,
  assertPosTenderType,
  isPosTenderType,
} from "../mvp-policies/index.js";

export {
  POS_TENDER_POLICY,
  POS_TENDER_TYPES,
  assertPosTenderType,
  isPosTenderType,
  type PosTenderType,
};

export const POS_SALE_EVENTS = [
  "SaleCreated",
  "SaleCompleted",
  "SaleCanceled",
] as const;

export type PosSaleEventName = (typeof POS_SALE_EVENTS)[number];

/** Binding decision snapshot (ADR-009 + ADR-091 tender/consent). */
export const POS_SALES_DECISION = {
  aggregate: "Sale",
  module: "pos",
  completeSaleUnitOfWork: true,
  phoneRequired: true,
  /** Continuing checkout = consent via CRM membership port (ADR-007/091). */
  consentAtPos: "notice_continue_equals_consent" as const,
  tender: POS_TENDER_POLICY,
  tenderTypes: POS_TENDER_TYPES,
  cardAcquiringInScope: false,
  idempotencyRequired: true,
  idempotencyHeader: "Idempotency-Key",
  /** NFR: happy-path checkout budget (seconds). */
  checkoutBudgetSeconds: 5,
  /** Critical-path culture target for cashier speed (seconds). */
  criticalPathCultureSeconds: 3,
  analyticsOnCriticalPath: false,
  /** ADR-065 — fire-and-forget ingest after OLTP; never block SaleCompleted. */
  analyticsIngestIsolationPackage: "src/analytics-ingest-isolation/",
  analyticsIngestIsolationAdr: "ADR-065",
  loyaltyEarnPort: "LoyaltyEarnPort",
  loyaltyModule: "loyalty",
  /** Receipt binaries → MinIO (ADR-040 / ADR-111); sale id is receiptRef now. */
  receiptStoragePackage: "src/minio-storage/",
  receiptStorageAdr: "ADR-111",
  receiptStorageDeferred: true,
  receiptRefIsSaleId: true,
  /** ADR-096 — CompleteSale enqueues SaleCreated / SaleCompleted. */
  outboxDeferred: false,
  inventoryDecrementSameTx: true,
  events: POS_SALE_EVENTS,
  primaryCompletionEvent: "SaleCompleted" as const,
} as const;

/** Cache invalidation notes — adapters later (ADR-052/054). */
export const POS_SALES_CACHE = {
  invalidateOn: ["SaleCompleted", "SaleCanceled"] as const,
  targets: [
    "stock",
    "membership_stats",
    "loyalty_wallet",
    "analytics_aggregates",
  ] as const,
  neverSourceOfTruth: true,
} as const;

/**
 * Iranian First — POS rush-speed notes for cashiers (domain contract, UI later).
 * No blocking network beyond CompleteSale UoW; keypad/phone capture UX → ARD-007 UI.
 */
export const POS_SPEED_NOTES_FA = {
  checkoutBudget:
    "تسویه‌حساب معمولی باید زیر پنج ثانیه تمام شود؛ مسیر بحرانی کمتر از سه ثانیه هدف است.",
  phoneCapture:
    "گرفتن شماره در صندوق باید سریع و طبیعی باشد؛ اعلان کوتاه فارسی کافی است و چک‌باکس اضافه ممنوع.",
  tenderRecord:
    "نوع پرداخت (نقد / کارت‌خوان / ترکیبی) فقط ثبت می‌شود؛ تسویه کارت‌خوان خارج از سیستم است.",
  noAnalyticsBlock:
    "تحلیل و متریک نباید مسیر صندوق را مسدود کند.",
} as const;

export const TENDER_LABELS_FA = POS_TENDER_POLICY.persianLabels;

export function assertCheckoutBudgetSeconds(seconds: number): void {
  if (seconds !== POS_SALES_DECISION.checkoutBudgetSeconds) {
    throw new Error(
      `POS checkout budget must be ${POS_SALES_DECISION.checkoutBudgetSeconds}s (ADR-009); got ${seconds}.`,
    );
  }
}

export const POS_SALES = {
  decision: POS_SALES_DECISION,
  events: POS_SALE_EVENTS,
  cache: POS_SALES_CACHE,
  speedNotesFa: POS_SPEED_NOTES_FA,
  tenderLabelsFa: TENDER_LABELS_FA,
} as const;
