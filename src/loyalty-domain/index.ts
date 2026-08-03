/**
 * ADR-010 — Loyalty Architecture contract.
 *
 * Configurable PointRule; Wallet per StoreMembership; earn on POS sale
 * (and paid pickup later); redeem at POS; expiry 12m after last earn (ADR-091).
 * Append-only PointsLedger. Customer portal visibility → ARD-035.
 */

import { LOYALTY_EXPIRY_POLICY } from "../mvp-policies/index.js";

export { LOYALTY_EXPIRY_POLICY };

export const LOYALTY_EVENTS = [
  "PointsEarned",
  "PointsRedeemed",
  "PointsExpired",
] as const;

export type LoyaltyEventName = (typeof LOYALTY_EVENTS)[number];

/** Optional campaign events — stubs until growth campaigns MVP+. */
export const LOYALTY_CAMPAIGN_EVENT_NAMES = [
  "CampaignCreated",
  "CampaignCompleted",
] as const;

export const LEDGER_ENTRY_TYPES = ["earn", "redeem", "expire"] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

/**
 * Binding decision snapshot (ADR-010 + ADR-091 loyalty expiry).
 */
export const LOYALTY_DECISION = {
  module: "loyalty",
  aggregates: ["PointRule", "Wallet"] as const,
  ledger: "PointsLedger" as const,
  ledgerAppendOnly: true,
  walletScopedTo: "store_membership" as const,
  noCrossStorePooling: true,
  preventNegativeBalance: true,
  /** Default earn: 100_000 IRR minor (ریال) → 1 point. */
  defaultAmountMinorPerPoint: 100_000n,
  defaultPointsPerUnit: 1,
  expiry: LOYALTY_EXPIRY_POLICY,
  earnOn: ["pos_sale", "paid_pickup"] as const,
  redeemAt: ["pos"] as const,
  events: LOYALTY_EVENTS,
  campaignEventsDeferred: LOYALTY_CAMPAIGN_EVENT_NAMES,
  customerPortalDeferredTo: "ARD-035",
  expireJobSchedulerDeferredTo: "ADR-035",
  analyticsFeatureUsed: "loyalty",
} as const;

/** Cache invalidation notes — adapters later (ADR-052/054). */
export const LOYALTY_CACHE = {
  walletKeyHint:
    "mos:{env}:{merchantId}:store:{storeId}:loyalty:wallet:{membershipId}",
  ttlSeconds: 120,
  invalidateOn: LOYALTY_EVENTS,
  neverSourceOfTruth: true,
} as const;

/**
 * Iranian First — plain-language loyalty copy (domain contract; UI later).
 * Avoid English marketing jargon for traditional merchants/customers.
 */
export const LOYALTY_COPY_FA = {
  pointsUnit: "امتیاز",
  walletLabel: "کیف امتیاز",
  earnOnSale: "با هر خرید امتیاز می‌گیرید.",
  redeemAtPos: "امتیاز را هنگام تسویه در فروشگاه خرج کنید.",
  expiryDefault:
    "امتیازها دوازده ماه پس از آخرین دریافت امتیاز منقضی می‌شوند.",
  balanceEmpty: "هنوز امتیازی ندارید.",
} as const;

export function assertLoyaltyWalletScopedToMembership(
  scope: string,
): asserts scope is "store_membership" {
  if (scope !== LOYALTY_DECISION.walletScopedTo) {
    throw new Error(
      `Loyalty wallet must be scoped to store_membership (ADR-010); got "${scope}".`,
    );
  }
}

export const LOYALTY = {
  decision: LOYALTY_DECISION,
  events: LOYALTY_EVENTS,
  cache: LOYALTY_CACHE,
  copyFa: LOYALTY_COPY_FA,
} as const;
