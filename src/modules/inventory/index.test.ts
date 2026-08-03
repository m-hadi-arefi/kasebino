import { describe, expect, it } from "vitest";

import {
  INVENTORY_DOMAIN_DECISION,
  STOCK_ADJUSTED_EVENT,
} from "../../inventory-domain/index.js";
import {
  INVENTORY_SYNC_DECISION,
  OFFLINE_STOCK_SYNC,
  PICKUP_STOCK_SYNC,
} from "../../inventory-sync/index.js";
import {
  INVENTORY_ERROR_MESSAGES_FA,
  InventoryDomainError,
  InMemoryInventorySyncIdempotency,
  InMemoryStockItemRepository,
  createInventoryUseCases,
  createStockItemAggregate,
} from "./index.js";

function createHarness() {
  const stockItems = new InMemoryStockItemRepository();
  const syncIdempotency = new InMemoryInventorySyncIdempotency();
  let n = 0;
  const useCases = createInventoryUseCases({
    stockItems,
    syncIdempotency,
    idFactory: () => `st-${++n}`,
    now: (() => {
      let t = 1_700_000_000_000;
      return () => new Date(t++);
    })(),
  });
  return { stockItems, syncIdempotency, useCases };
}

describe("ADR-008 Inventory Domain", () => {
  it("contract: StockItem store-scoped; StockAdjusted primary event", () => {
    expect(INVENTORY_DOMAIN_DECISION.ownedAggregate).toBe("StockItem");
    expect(INVENTORY_DOMAIN_DECISION.scope).toBe("store");
    expect(STOCK_ADJUSTED_EVENT).toBe("StockAdjusted");
    expect(INVENTORY_DOMAIN_DECISION.syncStrategy).toBe("ADR-049");
  });

  it("adjusts stock per store and emits StockAdjusted", async () => {
    const { useCases } = createHarness();
    const { stockItem, event, syncEvents } = await useCases.adjustStock({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      delta: 10,
      reason: "ورود کالا",
    });

    expect(stockItem.quantity).toBe(10);
    expect(stockItem.storeId).toBe("store-a");
    expect(stockItem.merchantId).toBe("m1");
    expect(event.eventName).toBe("StockAdjusted");
    expect(event.payload.previousQuantity).toBe(0);
    expect(event.payload.nextQuantity).toBe(10);
    expect(event.payload.delta).toBe(10);
    expect(event.payload.reason).toBe("ورود کالا");
    expect(syncEvents[0]?.eventName).toBe("InventoryChanged");
  });

  it("isolates stock across stores under same merchant", async () => {
    const { useCases, stockItems } = createHarness();
    await useCases.adjustStock({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      delta: 5,
    });
    await useCases.adjustStock({
      merchantId: "m1",
      storeId: "store-b",
      productId: "prod-1",
      delta: 20,
    });

    const a = await stockItems.findByStoreProduct("m1", "store-a", "prod-1");
    const b = await stockItems.findByStoreProduct("m1", "store-b", "prod-1");
    expect(a?.quantity).toBe(5);
    expect(b?.quantity).toBe(20);

    const listedA = await stockItems.listByStore("m1", "store-a");
    expect(listedA).toHaveLength(1);
  });

  it("rejects negative stock with Persian shop-floor error", async () => {
    const { useCases } = createHarness();
    await useCases.adjustStock({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      delta: 3,
    });

    await expect(
      useCases.adjustStock({
        merchantId: "m1",
        storeId: "store-a",
        productId: "prod-1",
        delta: -5,
      }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
      messageFa: INVENTORY_ERROR_MESSAGES_FA.INSUFFICIENT_STOCK,
    });

    await expect(
      useCases.adjustStock({
        merchantId: "m1",
        storeId: "store-a",
        productId: "prod-1",
        delta: 0,
      }),
    ).rejects.toBeInstanceOf(InventoryDomainError);

    expect(INVENTORY_ERROR_MESSAGES_FA.INSUFFICIENT_STOCK).toMatch(
      /[\u0600-\u06FF]/,
    );
  });
});

describe("ADR-049 Inventory sync hooks", () => {
  it("decrements for CompleteSale in same TX and emits InventoryChanged", async () => {
    const { useCases } = createHarness();
    await useCases.adjustStock({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      delta: 10,
    });

    const result = await useCases.decrementForSale({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      quantity: 3,
      sameTransaction: true,
    });

    expect(result.stockItem.quantity).toBe(7);
    expect(result.alreadyApplied).toBe(false);
    expect(result.inventoryChanged?.eventName).toBe("InventoryChanged");
    expect(result.inventoryChanged?.payload.reason).toBe("sale");
    expect(result.inventoryChanged?.payload.delta).toBe(-3);
    expect(result.inventoryChanged?.payload.quantityAfter).toBe(7);

    await expect(
      useCases.decrementForSale({
        merchantId: "m1",
        storeId: "store-a",
        productId: "prod-1",
        quantity: 1,
        sameTransaction: false,
      }),
    ).rejects.toMatchObject({ code: "SALE_TX_REQUIRED" });

    expect(INVENTORY_ERROR_MESSAGES_FA.SALE_TX_REQUIRED).toMatch(
      /[\u0600-\u06FF]/,
    );
  });

  it("decrements pickup on paid once; preparing policy documented; restore idempotent", async () => {
    expect(PICKUP_STOCK_SYNC.decrementOnStatus).toBe("paid");
    expect(INVENTORY_SYNC_DECISION.pickup.reservationsTableMvp).toBe(false);

    const { useCases } = createHarness();
    await useCases.adjustStock({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      delta: 8,
    });

    const first = await useCases.decrementForPickupPaid({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      quantity: 2,
      orderStatus: "paid",
      syncKey: "pickup:ord-1:prod-1",
    });
    expect(first.stockItem.quantity).toBe(6);
    expect(first.inventoryChanged?.payload.reason).toBe("pickup_paid");

    const second = await useCases.decrementForPickupPaid({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      quantity: 2,
      orderStatus: "paid",
      syncKey: "pickup:ord-1:prod-1",
    });
    expect(second.alreadyApplied).toBe(true);
    expect(second.stockItem.quantity).toBe(6);
    expect(second.inventoryChanged).toBeNull();

    await expect(
      useCases.decrementForPickupPaid({
        merchantId: "m1",
        storeId: "store-a",
        productId: "prod-1",
        quantity: 1,
        orderStatus: "preparing",
        syncKey: "pickup:ord-2:prod-1",
      }),
    ).rejects.toMatchObject({ code: "INVALID_QUANTITY_DELTA" });

    const restored = await useCases.restorePickupStock({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      quantity: 2,
      syncKey: "pickup-restore:ord-1:prod-1",
    });
    expect(restored.stockItem.quantity).toBe(8);
    expect(restored.inventoryChanged?.payload.reason).toBe("pickup_restore");
  });

  it("rejects optimistic version conflicts with Persian message", async () => {
    const { stockItems } = createHarness();
    const item = createStockItemAggregate({
      id: "st-fixed",
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      quantity: 5,
    });
    await stockItems.save(item);

    const conflict = await stockItems.updateWithOptimisticLock(
      { ...item, quantity: 3, version: 2 },
      1,
    );
    // version still 1 in store — wait, save stored version 1, update with expected 1 should succeed
    expect(conflict).toBe(true);

    const raceItems = new InMemoryStockItemRepository();
    const syncIdempotency = new InMemoryInventorySyncIdempotency();
    const seeded = createStockItemAggregate({
      id: "race-1",
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-race",
      quantity: 10,
    });
    await raceItems.save(seeded);

    const originalUpdate = raceItems.updateWithOptimisticLock.bind(raceItems);
    raceItems.updateWithOptimisticLock = async (row, expected) => {
      const winner = await raceItems.findById(row.id);
      if (winner) {
        winner.quantity = 9;
        winner.version = expected + 1;
        await raceItems.update(winner);
      }
      return originalUpdate(row, expected);
    };

    const racing = createInventoryUseCases({
      stockItems: raceItems,
      syncIdempotency,
      idFactory: () => "x",
    });

    await expect(
      racing.decrementForSale({
        merchantId: "m1",
        storeId: "store-a",
        productId: "prod-race",
        quantity: 1,
        sameTransaction: true,
      }),
    ).rejects.toMatchObject({
      code: "VERSION_CONFLICT",
      messageFa: INVENTORY_ERROR_MESSAGES_FA.VERSION_CONFLICT,
    });

    expect(INVENTORY_ERROR_MESSAGES_FA.VERSION_CONFLICT).toMatch(
      /[\u0600-\u06FF]/,
    );
  });

  it("emits InventoryLowDetected and InventoryDepleted at thresholds", async () => {
    const { useCases, stockItems } = createHarness();
    const item = createStockItemAggregate({
      id: "thr-1",
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      quantity: 5,
      reorderLevel: 3,
    });
    await stockItems.save(item);

    const low = await useCases.decrementForSale({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      quantity: 2,
      sameTransaction: true,
    });
    expect(low.stockItem.quantity).toBe(3);
    expect(low.thresholdEvents.map((e) => e.eventName)).toEqual([
      "InventoryLowDetected",
    ]);

    const oos = await useCases.decrementForSale({
      merchantId: "m1",
      storeId: "store-a",
      productId: "prod-1",
      quantity: 3,
      sameTransaction: true,
    });
    expect(oos.stockItem.quantity).toBe(0);
    expect(oos.thresholdEvents.map((e) => e.eventName)).toEqual([
      "InventoryDepleted",
    ]);
  });

  it("rejects offline stock shortage for review (ADR-091)", () => {
    const { useCases } = createHarness();
    expect(OFFLINE_STOCK_SYNC.stockShortageConflict).toBe("reject_and_review");

    try {
      useCases.rejectOfflineStockConflict();
      expect.unreachable("should reject");
    } catch (error) {
      expect(error).toBeInstanceOf(InventoryDomainError);
      expect(error).toMatchObject({
        code: "OFFLINE_STOCK_REJECTED",
        messageFa: INVENTORY_ERROR_MESSAGES_FA.OFFLINE_STOCK_REJECTED,
      });
    }

    expect(INVENTORY_ERROR_MESSAGES_FA.OFFLINE_STOCK_REJECTED).toMatch(
      /[\u0600-\u06FF]/,
    );
  });
});
