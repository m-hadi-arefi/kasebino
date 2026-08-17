/**
 * ADR-054 — Cache Invalidation via Domain Events.
 *
 * Mutations emit events → CacheInvalidationService deletes keys → next
 * cache-aside read rebuilds from PostgreSQL. Prefer explicit ID deletes
 * from the event → key map (never FLUSHDB; SCAN sparingly).
 *
 * Normative: docs/architecture/event-catalog.md (Cache invalidation columns),
 * docs/architecture/cache-strategy.md, docs/architecture/07-cache-architecture.md
 *
 * MVP map: SaleCompleted / ProductUpdated / StoreUpdated.
 * Key builders: `src/infrastructure/redis/cache-keys` (ADR-053). Store port: `src/infrastructure/redis/cache-aside` (ADR-052).
 */

import type { CacheAsideStorePort } from "../cache-aside/port.js";
import {
  buildBarcodeKey,
  buildCacheKey,
  buildDashboardOverviewKey,
  buildDashboardRevenueKey,
  buildMembershipKey,
  buildProductKey,
  buildStockKey,
  buildStoreKey,
  buildStorefrontProductKey,
  buildWalletKey,
} from "../cache-keys/index.js";

/** ADR-054 Decision — binding invalidation stance. */
export const CACHE_INVALIDATION_DECISION = {
  pattern: "event_driven_key_delete" as const,
  ttlOnlyTooStaleForPos: true,
  subscriber: "in_process_plus_outbox_side_effect" as const,
  rebuildOnNextRead: true,
  neverFlushDb: true,
  preferExplicitDeletes: true,
  redisNeverSourceOfTruth: true,
  detailAdr: "ADR-054",
  keysAdr: "ADR-053",
  cacheAsideAdr: "ADR-052",
  eventDrivenAdr: "ADR-036",
  architectureDoc: "docs/architecture/07-cache-architecture.md",
  catalogDoc: "docs/architecture/event-catalog.md",
} as const;

export const CACHE_INVALIDATION_PLACEMENT = {
  package: "src/infrastructure/redis/cache-invalidation/",
  outboxConsumer: "cache_invalidation" as const,
  detailAdr: "ADR-054",
} as const;

/**
 * Iranian First — deletes target ID-based keys only.
 * Persian UTF-8 in sibling cached values must stay intact.
 */
export const CACHE_INVALIDATION_UNICODE = {
  keysRemainIdBased: true,
  deletesDoNotScrubUtf8Values: true,
  persianMayExistInCachedValues: true,
} as const;

/** MVP event types with full key maps (expand per event-catalog). */
export const CACHE_INVALIDATION_MVP_EVENTS = [
  "SaleCompleted",
  "ProductUpdated",
  "ProductCreated",
  "ProductDeleted",
  "InventoryChanged",
  "StoreUpdated",
] as const;

export type CacheInvalidationMvpEvent =
  (typeof CACHE_INVALIDATION_MVP_EVENTS)[number];

export type CacheInvalidationEnv = {
  env: string;
};

/** Payload fields required / used by MVP maps (event-catalog aligned). */
export type StoreUpdatedInvalidationPayload = {
  merchantId: string;
  storeId: string;
};

export type ProductUpdatedInvalidationPayload = {
  merchantId: string;
  productId: string;
  /** When present, barcode→productId mapping key is deleted. */
  barcode?: string | null;
};

export type InventoryChangedInvalidationPayload = {
  merchantId: string;
  storeId: string;
  productId: string;
};

export type SaleCompletedInvalidationPayload = {
  merchantId: string;
  storeId: string;
  customerId?: string | null;
  lineProductIds?: readonly string[];
  /**
   * Optional revenue dashboard ranges to delete
   * (`analytics:revenue:{range}`). Overview always deleted.
   */
  revenueRanges?: readonly string[];
};

/** Mapped MVP events — keep separate from catch-all so literals narrow. */
export type MappedCacheInvalidationInput =
  | {
      eventType: "StoreUpdated";
      payload: StoreUpdatedInvalidationPayload;
    }
  | {
      eventType: "ProductUpdated" | "ProductCreated" | "ProductDeleted";
      payload: ProductUpdatedInvalidationPayload;
    }
  | {
      eventType: "InventoryChanged";
      payload: InventoryChangedInvalidationPayload;
    }
  | {
      eventType: "SaleCompleted";
      payload: SaleCompletedInvalidationPayload;
    };

/** Unknown / not-yet-mapped catalog events → no deletes. */
export type UnmappedCacheInvalidationInput = {
  eventType: string;
  payload: { merchantId?: string };
};

export type CacheInvalidationEventInput =
  | MappedCacheInvalidationInput
  | UnmappedCacheInvalidationInput;

export type KeysForEventInput = CacheInvalidationEnv & MappedCacheInvalidationInput;

export type InvalidateOnEventInput = CacheInvalidationEnv &
  CacheInvalidationEventInput;

export type InvalidateOnEventResult = {
  eventType: string;
  keys: readonly string[];
  deleted: readonly string[];
  /** True when eventType has no MVP map entry. */
  skipped: boolean;
};

function uniqueKeys(keys: string[]): string[] {
  return [...new Set(keys)];
}

/** Storefront info key for a store (600s class; catalog storefront invalidation). */
export function buildStorefrontStoreInfoKey(
  input: CacheInvalidationEnv & { merchantId: string; storeId: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: ["sf", "info", input.storeId],
  });
}

function keysForStoreUpdated(
  env: string,
  payload: StoreUpdatedInvalidationPayload,
): string[] {
  const { merchantId, storeId } = payload;
  return uniqueKeys([
    buildStoreKey({ env, merchantId, storeId }),
    buildStorefrontStoreInfoKey({ env, merchantId, storeId }),
  ]);
}

function keysForProductUpdated(
  env: string,
  payload: ProductUpdatedInvalidationPayload,
): string[] {
  const { merchantId, productId, barcode } = payload;
  const keys = [
    buildProductKey({ env, merchantId, productId }),
    buildStorefrontProductKey({ env, merchantId, productId }),
  ];
  if (barcode != null && String(barcode).trim() !== "") {
    keys.push(
      buildBarcodeKey({
        env,
        merchantId,
        barcode: String(barcode),
      }),
    );
  }
  return uniqueKeys(keys);
}

function keysForSaleCompleted(
  env: string,
  payload: SaleCompletedInvalidationPayload,
): string[] {
  const {
    merchantId,
    storeId,
    customerId,
    lineProductIds,
    revenueRanges,
  } = payload;
  const keys: string[] = [buildDashboardOverviewKey({ env, merchantId })];
  for (const range of revenueRanges ?? []) {
    if (range.trim() !== "") {
      keys.push(buildDashboardRevenueKey({ env, merchantId, range }));
    }
  }
  if (customerId != null && String(customerId).trim() !== "") {
    const cid = String(customerId);
    keys.push(
      buildWalletKey({
        env,
        merchantId,
        storeId,
        customerId: cid,
      }),
      buildMembershipKey({
        env,
        merchantId,
        storeId,
        customerId: cid,
      }),
    );
  }
  for (const productId of lineProductIds ?? []) {
    if (productId.trim() === "") {
      continue;
    }
    keys.push(
      buildStockKey({ env, merchantId, storeId, productId }),
      buildStorefrontProductKey({ env, merchantId, productId }),
    );
  }
  return uniqueKeys(keys);
}

function keysForInventoryChanged(
  env: string,
  payload: InventoryChangedInvalidationPayload,
): string[] {
  const { merchantId, storeId, productId } = payload;
  return uniqueKeys([
    buildStockKey({ env, merchantId, storeId, productId }),
    buildStorefrontProductKey({ env, merchantId, productId }),
  ]);
}

/**
 * Pure event → keys map (event-catalog Cache invalidation columns + ADR-053 builders).
 * Explicit ID deletes only — no SCAN / FLUSHDB.
 * Accepts unmapped event types (returns []).
 */
export function keysForEvent(input: InvalidateOnEventInput): string[] {
  const { env, eventType } = input;
  if (eventType === "StoreUpdated") {
    return keysForStoreUpdated(
      env,
      input.payload as StoreUpdatedInvalidationPayload,
    );
  }
  if (
    eventType === "ProductUpdated" ||
    eventType === "ProductCreated" ||
    eventType === "ProductDeleted"
  ) {
    return keysForProductUpdated(
      env,
      input.payload as ProductUpdatedInvalidationPayload,
    );
  }
  if (eventType === "InventoryChanged") {
    return keysForInventoryChanged(
      env,
      input.payload as InventoryChangedInvalidationPayload,
    );
  }
  if (eventType === "SaleCompleted") {
    return keysForSaleCompleted(
      env,
      input.payload as SaleCompletedInvalidationPayload,
    );
  }
  return [];
}

export function isMappedInvalidationEvent(
  eventType: string,
): eventType is CacheInvalidationMvpEvent {
  return (CACHE_INVALIDATION_MVP_EVENTS as readonly string[]).includes(
    eventType,
  );
}

/**
 * Delete keys for a domain event against a cache store port.
 * Fail-open on individual del errors (commit already happened in PG).
 */
export async function invalidateOnEvent(
  store: CacheAsideStorePort,
  input: InvalidateOnEventInput,
): Promise<InvalidateOnEventResult> {
  const skipped = !isMappedInvalidationEvent(input.eventType);
  const keys = keysForEvent(input);
  const deleted: string[] = [];

  for (const key of keys) {
    try {
      await store.del(key);
      deleted.push(key);
    } catch {
      // Fail-open — mutation path already committed to PostgreSQL.
    }
  }

  return {
    eventType: input.eventType,
    keys,
    deleted,
    skipped,
  };
}

export function assertNeverFlushDb(allowed: boolean): void {
  if (allowed) {
    throw new Error(
      "FLUSHDB is forbidden in application invalidation paths (ADR-054 / cache-strategy).",
    );
  }
  if (!CACHE_INVALIDATION_DECISION.neverFlushDb) {
    throw new Error(
      "CACHE_INVALIDATION_DECISION.neverFlushDb must be true (ADR-054).",
    );
  }
}

export function assertPreferExplicitDeletes(prefer: boolean): void {
  if (!prefer) {
    throw new Error(
      "Prefer explicit event→key deletes over TTL-only or SCAN (ADR-054).",
    );
  }
}

export const CACHE_INVALIDATION = {
  decision: CACHE_INVALIDATION_DECISION,
  placement: CACHE_INVALIDATION_PLACEMENT,
  unicode: CACHE_INVALIDATION_UNICODE,
  mvpEvents: CACHE_INVALIDATION_MVP_EVENTS,
  keysForEvent,
  invalidateOnEvent,
  isMappedInvalidationEvent,
  buildStorefrontStoreInfoKey,
  assertNeverFlushDb,
  assertPreferExplicitDeletes,
} as const;
