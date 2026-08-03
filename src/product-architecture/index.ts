/**
 * ADR-001 — Product Architecture contract (Store-First Retention OS).
 * ADR-091 — MVP product policy defaults (multi-store, URL, locale, fulfillment).
 * Forbidden capabilities stay aligned with ADR-015 / PRD §3.
 *
 * Import from later modules; do not invent conflicting product defaults.
 */

export const PRODUCT_NAME = "MerchantOS" as const;

/** Product framing: store owns the customer relationship. */
export const OWNERSHIP_MODEL = "store-first" as const;

/** Online fulfillment allowed in MVP. */
export type FulfillmentMode = "pickup";

export const ALLOWED_FULFILLMENT_MODES = ["pickup"] as const satisfies readonly FulfillmentMode[];

export const DEFAULT_FULFILLMENT_MODE: FulfillmentMode = "pickup";

/**
 * Capabilities explicitly forbidden without a superseding ADR.
 * Aligned with ADR-015 / PRD §3 non-goals.
 */
export const FORBIDDEN_CAPABILITIES = [
  "delivery",
  "courier",
  "rider_fleet",
  "shipping",
  "marketplace_browse",
  "full_accounting",
  "supplier_network",
  "desktop_offline_suite",
  "multi_warehouse_erp",
  "advanced_ai_recommendations",
] as const;

export type ForbiddenCapability = (typeof FORBIDDEN_CAPABILITIES)[number];

/** OLTP vs analytics plane split. */
export const DATA_PLANES = {
  oltp: "postgresql",
  analytics: "mongodb",
} as const;

/** Iranian-native UX defaults (ADR-001 + Iranian First). */
export const LOCALE_DEFAULTS = {
  language: "fa",
  locale: "fa-IR",
  dir: "rtl",
  calendar: "jalali",
  timeZone: "Asia/Tehran",
  /** Display unit for merchant/customer money surfaces. */
  moneyDisplayUnit: "toman",
  /** Persist money as integer minor units of IRR in OLTP (presentation converts). */
  moneyStorageCurrency: "IRR",
} as const;

/** ADR-091 storefront URL. */
export const STOREFRONT_URL = {
  strategy: "path",
  pattern: "/s/{storeSlug}",
  prefix: "/s/",
} as const;

/** ADR-091 multi-store. */
export const MULTI_STORE = {
  enabledInMvp: true,
  inventoryScopedTo: "store",
  membershipScopedTo: "store",
  loyaltyWalletScopedTo: "store_membership",
  brandingScopedTo: "store",
} as const;

/** Primary growth / retention loops to instrument (analytics later ADRs). */
export const RETENTION_LOOPS = [
  "pos_phone_capture",
  "store_membership",
  "loyalty_wallet",
  "qr_acquisition",
  "store_pwa",
  "pickup_order",
] as const;

export function isAllowedFulfillmentMode(mode: string): mode is FulfillmentMode {
  return (ALLOWED_FULFILLMENT_MODES as readonly string[]).includes(mode);
}

export function assertPickupOnlyFulfillment(mode: string): asserts mode is FulfillmentMode {
  if (!isAllowedFulfillmentMode(mode)) {
    throw new Error(
      `Fulfillment mode "${mode}" is not allowed in MVP. Only pickup is permitted (ADR-001 / ADR-082).`,
    );
  }
}

export function isForbiddenCapability(capability: string): capability is ForbiddenCapability {
  return (FORBIDDEN_CAPABILITIES as readonly string[]).includes(capability);
}

export function assertCapabilityAllowed(capability: string): void {
  if (isForbiddenCapability(capability)) {
    throw new Error(
      `Capability "${capability}" is a hard non-goal for MVP (ADR-001 / ADR-015). Requires superseding ADR.`,
    );
  }
}

export function buildStorefrontPath(storeSlug: string): string {
  const slug = storeSlug.trim();
  if (!slug) {
    throw new Error("storeSlug is required");
  }
  return `${STOREFRONT_URL.prefix}${encodeURIComponent(slug)}`;
}

/** Snapshot for docs/tests — keep aligned with PRD + ADR-001 + ADR-091. */
export const PRODUCT_ARCHITECTURE = {
  name: PRODUCT_NAME,
  ownershipModel: OWNERSHIP_MODEL,
  allowedFulfillmentModes: ALLOWED_FULFILLMENT_MODES,
  defaultFulfillmentMode: DEFAULT_FULFILLMENT_MODE,
  forbiddenCapabilities: FORBIDDEN_CAPABILITIES,
  dataPlanes: DATA_PLANES,
  localeDefaults: LOCALE_DEFAULTS,
  storefrontUrl: STOREFRONT_URL,
  multiStore: MULTI_STORE,
  retentionLoops: RETENTION_LOOPS,
} as const;
