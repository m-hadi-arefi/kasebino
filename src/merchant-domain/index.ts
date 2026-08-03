/**
 * ADR-005 — Merchant Domain contract.
 *
 * Merchant is the multi-tenant root. Lifecycle draft→active→suspended.
 * Full multi-store under one merchant (ADR-091). Activation gates POS/storefront.
 */

import { MULTI_STORE_POLICY } from "../mvp-policies/index.js";

export const MERCHANT_STATUSES = ["draft", "active", "suspended"] as const;
export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];

export const MERCHANT_LIFECYCLE = {
  statuses: MERCHANT_STATUSES,
  initial: "draft" as const satisfies MerchantStatus,
  /** Normal activation path for onboarding. */
  activationFrom: "draft" as const satisfies MerchantStatus,
  activationTo: "active" as const satisfies MerchantStatus,
  /** Platform admin suspend (ADR-013). */
  suspendTo: "suspended" as const satisfies MerchantStatus,
  /** Platform admin may activate from draft or reactivate from suspended. */
  adminActivateFrom: ["draft", "suspended"] as const satisfies readonly MerchantStatus[],
} as const;

/**
 * Binding decision snapshot (ADR-005 + ADR-091 multi-store).
 */
export const MERCHANT_DOMAIN_DECISION = {
  aggregate: "Merchant",
  isTenantRoot: true,
  /** MVP includes full multi-store under one merchant. */
  multiStore: {
    ...MULTI_STORE_POLICY,
    enabledInMvp: true as const,
  },
  /** Activation gates POS and storefront until merchant is active. */
  activationGates: ["pos", "storefront"] as const,
  lifecycle: MERCHANT_LIFECYCLE,
  persianTradeNames: true,
  phoneCentricContact: true,
  defaultLocale: "fa-IR" as const,
  defaultTimezone: "Asia/Tehran" as const,
} as const;

export const MERCHANT_DOMAIN_EVENTS = [
  "MerchantCreated",
  "MerchantActivated",
  "MerchantUpdated",
  "MerchantSuspended",
] as const;
export type MerchantDomainEventName =
  (typeof MERCHANT_DOMAIN_EVENTS)[number];

/** Cache policy note — Redis adapter later (ADR-051/053). */
export const MERCHANT_PROFILE_CACHE = {
  keyHint: "mos:{env}:{merchantId}:merchant:profile",
  ttlSeconds: 300,
  invalidateOn: ["MerchantActivated", "MerchantUpdated"] as const,
} as const;

export function assertMerchantStatus(value: string): asserts value is MerchantStatus {
  if (!(MERCHANT_STATUSES as readonly string[]).includes(value)) {
    throw new Error(
      `Invalid merchant status "${value}" (ADR-005). Allowed: ${MERCHANT_STATUSES.join(", ")}.`,
    );
  }
}

export function isMerchantActive(status: MerchantStatus): boolean {
  return status === "active";
}

/** POS/storefront allowed only when merchant is active. */
export function merchantGatesOperations(status: MerchantStatus): boolean {
  return isMerchantActive(status);
}

export const MERCHANT_DOMAIN = {
  decision: MERCHANT_DOMAIN_DECISION,
  events: MERCHANT_DOMAIN_EVENTS,
  cache: MERCHANT_PROFILE_CACHE,
} as const;
