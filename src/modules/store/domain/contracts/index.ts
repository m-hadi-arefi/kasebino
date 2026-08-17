/**
 * ADR-006 — Store Domain contract (Location, Branding, Slug).
 *
 * Store is the operational/customer-facing unit under a merchant.
 * Globally unique slug → path storefront `/s/{slug}` (ADR-091).
 * Structured address + lat/lng mandatory; static map + navigate (no embed MVP).
 */

import {
  STORE_MAP_POLICY,
  STOREFRONT_URL_POLICY,
  buildStorefrontPath,
} from "../../../../shared/contracts/mvp-policies/index.js";

export { buildStorefrontPath, STORE_MAP_POLICY, STOREFRONT_URL_POLICY };

export const STORE_STATUSES = ["draft", "active", "inactive"] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

export const STORE_LIFECYCLE = {
  statuses: STORE_STATUSES,
  /** Created with required geo + branding starts operational-ready as active. */
  initialOnCreate: "active" as const satisfies StoreStatus,
  deactivateTo: "inactive" as const satisfies StoreStatus,
} as const;

/**
 * Binding decision snapshot (ADR-006 + ADR-091 storefront/map policies).
 */
export const STORE_DOMAIN_DECISION = {
  aggregate: "Store",
  ownedBy: "Merchant",
  multiStoreUnderMerchant: true,
  slug: {
    globallyUnique: true,
    storefrontPathPattern: STOREFRONT_URL_POLICY.pattern,
    pathPrefix: STOREFRONT_URL_POLICY.prefix,
  },
  requireStructuredAddress: STORE_MAP_POLICY.persistStructuredAddress,
  requireLatLng: STORE_MAP_POLICY.persistLatLng,
  mapPresentation: STORE_MAP_POLICY.presentation,
  interactiveEmbedMandatory: STORE_MAP_POLICY.interactiveEmbedMandatory,
  navigateDeepLinks: STORE_MAP_POLICY.navigateDeepLinks,
  brandingScopedToStore: true,
  qrRefField: "qrAssetRef",
  persianAddressText: true,
  lifecycle: STORE_LIFECYCLE,
} as const;

export const STORE_DOMAIN_EVENTS = ["StoreCreated", "StoreUpdated"] as const;

export type StoreDomainEventName = (typeof STORE_DOMAIN_EVENTS)[number];

/** Event name — contract + attribution in `src/modules/storefront/domain/qr-acquisition` (ADR-081); emit later. */
export const STORE_QR_EVENT_DEFERRED = "StoreQrGenerated" as const;

/** Cache policy notes — Redis adapter later (ADR-051/053). */
export const STORE_PROFILE_CACHE = {
  keyHint: "mos:{env}:{merchantId}:store:{storeId}:profile",
  ttlSeconds: 300,
  storefrontInfoTtlSeconds: 600,
  invalidateOn: STORE_DOMAIN_EVENTS,
} as const;

/** Canonical public path for a store slug (`/s/{slug}`). */
export function storefrontPathForSlug(storeSlug: string): string {
  return buildStorefrontPath(storeSlug);
}

export function assertStoreStatus(
  value: string,
): asserts value is StoreStatus {
  if (!(STORE_STATUSES as readonly string[]).includes(value)) {
    throw new Error(
      `Invalid store status "${value}" (ADR-006). Allowed: ${STORE_STATUSES.join(", ")}.`,
    );
  }
}

export function isStorePubliclyVisible(status: StoreStatus): boolean {
  return status === "active";
}

export const STORE_DOMAIN = {
  decision: STORE_DOMAIN_DECISION,
  events: STORE_DOMAIN_EVENTS,
  cache: STORE_PROFILE_CACHE,
  mapPolicy: STORE_MAP_POLICY,
  storefrontUrlPolicy: STOREFRONT_URL_POLICY,
} as const;
