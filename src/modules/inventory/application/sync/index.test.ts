import { describe, expect, it } from "vitest";

import {
  INVENTORY_SYNC,
  INVENTORY_SYNC_CACHE,
  INVENTORY_SYNC_DECISION,
  INVENTORY_SYNC_EVENTS,
  INVENTORY_SYNC_MESSAGES_FA,
  OFFLINE_STOCK_SYNC,
  PICKUP_STOCK_SYNC,
  SALE_STOCK_SYNC,
  STOCK_OPTIMISTIC_LOCK,
  assertOfflineRejectAndReview,
  assertOptimisticVersionRequired,
  assertPickupDecrementOnPaid,
  assertSaleDecrementInSameTx,
  assertStoreScopedSync,
} from "./index.js";

describe("ADR-049 Inventory Synchronization Strategy", () => {
  it("requires CompleteSale same-TX decrement and store scope", () => {
    expect(SALE_STOCK_SYNC.trigger).toBe("CompleteSale");
    expect(SALE_STOCK_SYNC.timing).toBe("same_transaction");
    expect(SALE_STOCK_SYNC.action).toBe("decrement");
    expect(SALE_STOCK_SYNC.storeScoped).toBe(true);
    expect(SALE_STOCK_SYNC.allowsNegative).toBe(false);
    expect(INVENTORY_SYNC_DECISION.storeScoped).toBe(true);
    expect(INVENTORY_SYNC_DECISION.eventualStockOnlyForbidden).toBe(true);

    expect(() => assertSaleDecrementInSameTx(true)).not.toThrow();
    expect(() => assertSaleDecrementInSameTx(false)).toThrow(/CompleteSale TX/);
    expect(() => assertStoreScopedSync("store")).not.toThrow();
    expect(() => assertStoreScopedSync("merchant")).toThrow(/store-scoped/);
  });

  it("documents pickup hard decrement on paid with idempotent preparing", () => {
    expect(PICKUP_STOCK_SYNC.decrementOnStatus).toBe("paid");
    expect(PICKUP_STOCK_SYNC.preparingBehavior).toBe(
      "idempotent_no_op_if_already_decremented",
    );
    expect(PICKUP_STOCK_SYNC.reservationsTableMvp).toBe(false);
    expect(PICKUP_STOCK_SYNC.restoreOnStatuses).toEqual([
      "cancelled",
      "refunded",
    ]);
    expect(PICKUP_STOCK_SYNC.avoidDoubleSell).toBe(true);

    expect(() => assertPickupDecrementOnPaid("paid")).not.toThrow();
    expect(() => assertPickupDecrementOnPaid("preparing")).toThrow(/paid/);
  });

  it("requires optimistic version and offline reject-and-review", () => {
    expect(STOCK_OPTIMISTIC_LOCK.columnSql).toBe("version");
    expect(STOCK_OPTIMISTIC_LOCK.onConflict).toBe("VERSION_CONFLICT");
    expect(OFFLINE_STOCK_SYNC.stockShortageConflict).toBe("reject_and_review");
    expect(OFFLINE_STOCK_SYNC.idempotentSyncKeys).toBe(true);
    expect(OFFLINE_STOCK_SYNC.silentOverwriteForbidden).toBe(true);

    expect(() => assertOptimisticVersionRequired(true)).not.toThrow();
    expect(() => assertOptimisticVersionRequired(false)).toThrow(/version/);
    expect(() => assertOfflineRejectAndReview("reject_and_review")).not.toThrow();
    expect(() => assertOfflineRejectAndReview("last_write_wins")).toThrow(
      /reject_and_review/,
    );
  });

  it("invalidates cache on Inventory* and ships Persian shop-floor messages", () => {
    expect(INVENTORY_SYNC_EVENTS).toEqual([
      "InventoryChanged",
      "InventoryLowDetected",
      "InventoryDepleted",
      "StockAdjusted",
    ]);
    expect(INVENTORY_SYNC_CACHE.ttlSeconds).toBe(300);
    expect(INVENTORY_SYNC_CACHE.invalidateOn).toContain("InventoryChanged");
    expect(INVENTORY_SYNC_CACHE.realtimeSubscribers).toBe(true);
    expect(INVENTORY_SYNC.decision).toBe(INVENTORY_SYNC_DECISION);

    for (const msg of Object.values(INVENTORY_SYNC_MESSAGES_FA)) {
      expect(msg).toMatch(/[\u0600-\u06FF]/);
    }
  });
});
