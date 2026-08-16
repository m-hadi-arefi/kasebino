/**
 * ADR-142 — Unit tests for ordering ↔ inventory adapters.
 * Verifies that the adapter correctly maps ordering ports to inventory use cases.
 */

import { describe, expect, it } from "vitest";

import { createInventoryUseCases } from "../../application/use-cases.js";
import {
  InMemoryInventorySyncIdempotency,
  InMemoryStockItemRepository,
} from "../../infrastructure/index.js";
import { InMemoryStockMovementRepository } from "../../infrastructure/index.js";
import { createStockItemAggregate } from "../../domain/stock-item.js";
import {
  createInventoryReserveAdapter,
  createInventoryReleaseAdapter,
} from "./ordering-inventory-adapter.js";

function seedStock(repo: InMemoryStockItemRepository, items: Array<{
  id: string;
  merchantId: string;
  storeId: string;
  productId: string;
  quantity: number;
}>) {
  for (const item of items) {
    const stockItem = createStockItemAggregate({
      id: item.id,
      merchantId: item.merchantId,
      storeId: item.storeId,
      productId: item.productId,
      quantity: item.quantity,
      now: new Date(),
    });
    void repo.save(stockItem);
  }
}

function createDeps() {
  const stockItems = new InMemoryStockItemRepository();
  const stockMovements = new InMemoryStockMovementRepository();
  const syncIdempotency = new InMemoryInventorySyncIdempotency();
  const inventory = createInventoryUseCases({
    stockItems,
    stockMovements,
    syncIdempotency,
  });
  return { stockItems, stockMovements, syncIdempotency, inventory };
}

const M = "m-001";
const S = "s-001";
const P1 = "p-001";
const P2 = "p-002";

describe("createInventoryReserveAdapter", () => {
  it("decrements stock for each order line via decrementForPickupPaid", async () => {
    const { stockItems, inventory, stockMovements } = createDeps();
    seedStock(stockItems, [
      { id: "si-1", merchantId: M, storeId: S, productId: P1, quantity: 10 },
      { id: "si-2", merchantId: M, storeId: S, productId: P2, quantity: 5 },
    ]);

    const reserve = createInventoryReserveAdapter(inventory);
    await reserve.reserveForOrder({
      orderId: "order-1",
      merchantId: M,
      storeId: S,
      lines: [
        { productId: P1, quantity: 3 },
        { productId: P2, quantity: 2 },
      ],
      sameTransaction: true,
    });

    const s1 = await stockItems.findByStoreProduct(M, S, P1);
    const s2 = await stockItems.findByStoreProduct(M, S, P2);
    expect(s1?.quantity).toBe(7);
    expect(s2?.quantity).toBe(3);

    // Stock movements recorded
    expect(stockMovements.items).toHaveLength(2);
    expect(stockMovements.items[0]?.reason).toBe("pickup_paid");
    expect(stockMovements.items[1]?.reason).toBe("pickup_paid");
  });

  it("is idempotent — duplicate reserve with same orderId is no-op", async () => {
    const { stockItems, inventory } = createDeps();
    seedStock(stockItems, [
      { id: "si-1", merchantId: M, storeId: S, productId: P1, quantity: 10 },
    ]);

    const reserve = createInventoryReserveAdapter(inventory);
    const input = {
      orderId: "order-dup",
      merchantId: M,
      storeId: S,
      lines: [{ productId: P1, quantity: 2 }],
      sameTransaction: true as const,
    };

    await reserve.reserveForOrder(input);
    await reserve.reserveForOrder(input); // duplicate

    const s = await stockItems.findByStoreProduct(M, S, P1);
    expect(s?.quantity).toBe(8); // decremented only once
  });

  it("throws on insufficient stock with domain error", async () => {
    const { stockItems, inventory } = createDeps();
    seedStock(stockItems, [
      { id: "si-1", merchantId: M, storeId: S, productId: P1, quantity: 1 },
    ]);

    const reserve = createInventoryReserveAdapter(inventory);
    await expect(
      reserve.reserveForOrder({
        orderId: "order-fail",
        merchantId: M,
        storeId: S,
        lines: [{ productId: P1, quantity: 5 }],
        sameTransaction: true,
      }),
    ).rejects.toThrow(/موجودی کافی نیست/);
  });
});

describe("createInventoryReleaseAdapter", () => {
  it("restores stock for each order line via restorePickupStock", async () => {
    const { stockItems, inventory, stockMovements } = createDeps();
    seedStock(stockItems, [
      { id: "si-1", merchantId: M, storeId: S, productId: P1, quantity: 7 },
      { id: "si-2", merchantId: M, storeId: S, productId: P2, quantity: 3 },
    ]);

    const release = createInventoryReleaseAdapter(inventory);
    await release.releaseForOrder({
      orderId: "order-1",
      merchantId: M,
      storeId: S,
      lines: [
        { productId: P1, quantity: 3 },
        { productId: P2, quantity: 2 },
      ],
    });

    const s1 = await stockItems.findByStoreProduct(M, S, P1);
    const s2 = await stockItems.findByStoreProduct(M, S, P2);
    expect(s1?.quantity).toBe(10);
    expect(s2?.quantity).toBe(5);

    // Stock movements recorded
    expect(stockMovements.items).toHaveLength(2);
    expect(stockMovements.items[0]?.reason).toBe("pickup_restore");
    expect(stockMovements.items[1]?.reason).toBe("pickup_restore");
  });

  it("is idempotent — duplicate release with same orderId is no-op", async () => {
    const { stockItems, inventory } = createDeps();
    seedStock(stockItems, [
      { id: "si-1", merchantId: M, storeId: S, productId: P1, quantity: 7 },
    ]);

    const release = createInventoryReleaseAdapter(inventory);
    const input = {
      orderId: "order-dup-rel",
      merchantId: M,
      storeId: S,
      lines: [{ productId: P1, quantity: 3 }],
    };

    await release.releaseForOrder(input);
    await release.releaseForOrder(input); // duplicate

    const s = await stockItems.findByStoreProduct(M, S, P1);
    expect(s?.quantity).toBe(10); // incremented only once
  });
});

describe("reserve + release lifecycle", () => {
  it("full lifecycle: reserve decrements, release restores to original", async () => {
    const { stockItems, inventory } = createDeps();
    seedStock(stockItems, [
      { id: "si-1", merchantId: M, storeId: S, productId: P1, quantity: 20 },
    ]);

    const reserve = createInventoryReserveAdapter(inventory);
    const release = createInventoryReleaseAdapter(inventory);

    // Pay order → decrement
    await reserve.reserveForOrder({
      orderId: "lifecycle-order",
      merchantId: M,
      storeId: S,
      lines: [{ productId: P1, quantity: 5 }],
      sameTransaction: true,
    });

    let s = await stockItems.findByStoreProduct(M, S, P1);
    expect(s?.quantity).toBe(15);

    // Cancel order → restore
    await release.releaseForOrder({
      orderId: "lifecycle-order",
      merchantId: M,
      storeId: S,
      lines: [{ productId: P1, quantity: 5 }],
    });

    s = await stockItems.findByStoreProduct(M, S, P1);
    expect(s?.quantity).toBe(20);
  });
});
