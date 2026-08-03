/**
 * ADR-049 — Inventory Synchronization Strategy.
 *
 * Event-driven stock updates from POS sales and pickup orders:
 * - CompleteSale: decrement inside the same TX
 * - Pickup: hard decrement on `paid` (preparing is idempotent no-op)
 * - Optimistic concurrency via stock_items.version
 * - Offline stock shortage = reject-and-review (ADR-091 / ADR-024)
 * - Inventory* events invalidate cache + feed realtime
 *
 * Scope: store-scoped StockItem under merchant (ADR-091).
 */

import { OFFLINE_CONFLICT_POLICY } from "../mvp-policies/index.js";
import { INVENTORY_CACHE } from "../inventory-domain/index.js";

/** POS CompleteSale path — stock decrement is part of the UoW TX (ADR-009). */
export const SALE_STOCK_SYNC = {
  trigger: "CompleteSale" as const,
  timing: "same_transaction" as const,
  action: "decrement" as const,
  storeScoped: true,
  identityKeys: ["merchantId", "storeId", "productId"] as const,
  allowsNegative: false,
  eventOnChange: "InventoryChanged" as const,
} as const;

/**
 * Pickup order path (ADR-011 / pickup-order-architecture).
 *
 * MVP: hard decrement when order reaches `paid` (payment confirmed).
 * `preparing` must not decrement again if already applied on paid.
 * No reservations table in MVP (ADR-049 future evolution).
 * Cancel/refund restores stock via compensating increment.
 */
export const PICKUP_STOCK_SYNC = {
  decrementOnStatus: "paid" as const,
  /** Documented: preparing does not re-decrement when paid already applied. */
  preparingBehavior: "idempotent_no_op_if_already_decremented" as const,
  reservationsTableMvp: false,
  restoreOnStatuses: ["cancelled", "refunded"] as const,
  action: "decrement" as const,
  storeScoped: true,
  avoidDoubleSell: true,
  eventOnChange: "InventoryChanged" as const,
} as const;

/** Optimistic lock on stock_items (ADR-043/047 deepening). */
export const STOCK_OPTIMISTIC_LOCK = {
  columnSql: "version",
  typeSql: "integer",
  notNull: true,
  updatePattern:
    "UPDATE stock_items SET quantity = $q, version = version + 1, updated_at = $now WHERE id = $id AND version = $expected",
  onConflict: "VERSION_CONFLICT" as const,
  required: true,
} as const;

/**
 * Offline staff PWA sync (restate ADR-091 / ADR-024).
 * Stock shortage on sync = reject-and-review; never silent overwrite.
 */
export const OFFLINE_STOCK_SYNC = {
  onlinePathPriority: OFFLINE_CONFLICT_POLICY.onlinePathPriority,
  offlineQueuePriority: OFFLINE_CONFLICT_POLICY.offlineQueuePriority,
  stockShortageConflict: OFFLINE_CONFLICT_POLICY.stockShortageConflict,
  idempotentSyncKeys: OFFLINE_CONFLICT_POLICY.idempotentSyncKeys,
  silentOverwriteForbidden: true,
} as const;

/**
 * Domain events that drive cache invalidation + realtime (ADR-008/049).
 * Past-tense wire names (ADR-002); docs may say InventoryLow / InventoryOutOfStock.
 */
export const INVENTORY_SYNC_EVENTS = [
  "InventoryChanged",
  "InventoryLowDetected",
  "InventoryDepleted",
  "StockAdjusted",
] as const;

export type InventorySyncEventName = (typeof INVENTORY_SYNC_EVENTS)[number];

/** Cache-aside stock keys — invalidate on Inventory* (TTL from inventory-domain). */
export const INVENTORY_SYNC_CACHE = {
  strategy: "cache_aside" as const,
  ttlSeconds: INVENTORY_CACHE.ttlSeconds,
  keyHint: INVENTORY_CACHE.stockKeyHint,
  invalidateOn: [
    "InventoryChanged",
    "InventoryLowDetected",
    "InventoryDepleted",
    "StockAdjusted",
  ] as const,
  neverSourceOfTruth: true,
  realtimeSubscribers: true,
} as const;

/** Analytics stubs — out-of-stock tracking (warehouse emit later). */
export const OUT_OF_STOCK_ANALYTICS = {
  trackOn: "InventoryDepleted" as const,
  warehouseEmitDeferred: true,
} as const;

export const INVENTORY_SYNC_MESSAGES_FA = {
  INSUFFICIENT_STOCK:
    "موجودی کافی نیست. تعداد درخواستی از موجودی فروشگاه بیشتر است.",
  VERSION_CONFLICT:
    "موجودی هم‌زمان تغییر کرده است. لطفاً دوباره تلاش کنید.",
  OFFLINE_STOCK_REJECTED:
    "به‌خاطر کمبود موجودی، فروش آفلاین رد شد و برای بررسی نگه داشته شد.",
  STOCK_ITEM_NOT_FOUND: "موجودی این کالا در فروشگاه یافت نشد.",
  INVALID_STORE_SCOPE: "شناسه فروشگاه یا کالا معتبر نیست.",
  IDEMPOTENT_ALREADY_APPLIED: "این تغییر موجودی قبلاً اعمال شده است.",
} as const;

export function assertSaleDecrementInSameTx(sameTransaction: boolean): void {
  if (!sameTransaction) {
    throw new Error(
      "Sale stock decrement must run inside CompleteSale TX (ADR-049).",
    );
  }
}

export function assertPickupDecrementOnPaid(status: string): void {
  if (status !== PICKUP_STOCK_SYNC.decrementOnStatus) {
    throw new Error(
      `Pickup stock decrement applies on "${PICKUP_STOCK_SYNC.decrementOnStatus}" (ADR-049); got "${status}".`,
    );
  }
}

export function assertOptimisticVersionRequired(hasVersion: boolean): void {
  if (!hasVersion) {
    throw new Error(
      "stock_items.version is required for optimistic concurrency (ADR-049).",
    );
  }
}

export function assertOfflineRejectAndReview(policy: string): void {
  if (policy !== "reject_and_review") {
    throw new Error(
      'Offline stock shortage must be "reject_and_review" (ADR-049 / ADR-091).',
    );
  }
}

export function assertStoreScopedSync(scope: string): void {
  if (scope !== "store") {
    throw new Error(
      "Inventory sync is store-scoped under merchant (ADR-049 / ADR-091).",
    );
  }
}

export const INVENTORY_SYNC_DECISION = {
  sale: SALE_STOCK_SYNC,
  pickup: PICKUP_STOCK_SYNC,
  optimisticLock: STOCK_OPTIMISTIC_LOCK,
  offline: OFFLINE_STOCK_SYNC,
  events: INVENTORY_SYNC_EVENTS,
  cache: INVENTORY_SYNC_CACHE,
  outOfStockAnalytics: OUT_OF_STOCK_ANALYTICS,
  storeScoped: true,
  eventualStockOnlyForbidden: true,
  implementationPackage: "src/inventory-sync",
} as const;

export const INVENTORY_SYNC = {
  decision: INVENTORY_SYNC_DECISION,
  sale: SALE_STOCK_SYNC,
  pickup: PICKUP_STOCK_SYNC,
  optimisticLock: STOCK_OPTIMISTIC_LOCK,
  offline: OFFLINE_STOCK_SYNC,
  events: INVENTORY_SYNC_EVENTS,
  cache: INVENTORY_SYNC_CACHE,
  messagesFa: INVENTORY_SYNC_MESSAGES_FA,
  assertSaleDecrementInSameTx,
  assertPickupDecrementOnPaid,
  assertOptimisticVersionRequired,
  assertOfflineRejectAndReview,
  assertStoreScopedSync,
} as const;
