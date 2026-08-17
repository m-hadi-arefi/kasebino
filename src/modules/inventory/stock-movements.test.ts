/**
 * ADR-126 stock movement ledger + CompleteSale invariants (in-memory).
 */

import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { createInventoryUseCases } from "./application/use-cases.js";
import {
  InMemoryStockItemRepository,
  InMemoryStockMovementRepository,
} from "./infrastructure/index.js";
import { createStockItemAggregate } from "./domain/stock-item.js";
import { createPosUseCases } from "../pos/application/use-cases.js";
import { InMemorySaleRepository } from "../pos/infrastructure/persistence/in-memory-sale-repository.js";
import { InMemoryOutboxStore } from "../../events/outbox/index.js";
import { envelopeFromDomainEvent } from "../../events/contracts/event-driven/index.js";

describe("ADR-126 stock movements + sale integrity helpers", () => {
  it("appends a sale movement when decrementing stock", async () => {
    const stockItems = new InMemoryStockItemRepository();
    const stockMovements = new InMemoryStockMovementRepository();
    const item = createStockItemAggregate({
      id: "st1",
      merchantId: "m1",
      storeId: "s1",
      productId: "p1",
      quantity: 10,
    });
    await stockItems.save(item);

    const inventory = createInventoryUseCases({
      stockItems,
      stockMovements,
    });

    await inventory.decrementForSale({
      merchantId: "m1",
      storeId: "s1",
      productId: "p1",
      quantity: 2,
      sameTransaction: true,
      saleId: "sale-1",
    });

    const movements = await stockMovements.listByReference({
      merchantId: "m1",
      referenceType: "sale",
      referenceId: "sale-1",
    });
    expect(movements).toHaveLength(1);
    expect(movements[0]?.quantityDelta).toBe(-2);
    expect(movements[0]?.reason).toBe("sale");
    expect((await stockItems.findById("st1"))?.quantity).toBe(8);
  });

  it("rolls back in-memory sale path when inventory fails after membership", async () => {
    const sales = new InMemorySaleRepository();
    const stockItems = new InMemoryStockItemRepository();
    const stockMovements = new InMemoryStockMovementRepository();
    const inventory = createInventoryUseCases({ stockItems, stockMovements });

    const pos = createPosUseCases({
      sales,
      membership: {
        async upsertFromPosPhoneCapture() {
          return {
            membershipId: "mem1",
            customerId: "c1",
            phoneNational: "09121234567",
            created: true,
          };
        },
      },
      inventory: {
        async decrementForSale(input) {
          await inventory.decrementForSale(input);
        },
      },
      idFactory: () => randomUUID(),
    });

    await expect(
      pos.completeSale({
        merchantId: "m1",
        storeId: "s1",
        phone: "09121234567",
        tenderType: "cash",
        idempotencyKey: "idem-fail-stock",
        lines: [
          {
            productId: "missing",
            productName: "ناموجود",
            quantity: 1,
            unitPriceMinor: 1000n,
          },
        ],
      }),
    ).rejects.toThrow();

    expect(await sales.findByIdempotencyKey("m1", "idem-fail-stock")).toBeNull();
    expect(stockMovements.items).toHaveLength(0);
  });

  it("enqueues SaleCompleted outbox on successful CompleteSale", async () => {
    const sales = new InMemorySaleRepository();
    const stockItems = new InMemoryStockItemRepository();
    const stockMovements = new InMemoryStockMovementRepository();
    await stockItems.save(
      createStockItemAggregate({
        id: "st2",
        merchantId: "m1",
        storeId: "s1",
        productId: "p1",
        quantity: 5,
      }),
    );
    const inventory = createInventoryUseCases({ stockItems, stockMovements });
    const outbox = new InMemoryOutboxStore();

    const pos = createPosUseCases({
      sales,
      membership: {
        async upsertFromPosPhoneCapture() {
          return {
            membershipId: "mem1",
            customerId: "c1",
            phoneNational: "09121234567",
            created: false,
          };
        },
      },
      inventory: {
        async decrementForSale(input) {
          await inventory.decrementForSale(input);
        },
      },
      outbox: {
        async enqueueSaleEvents(input) {
          await outbox.enqueue({
            envelope: envelopeFromDomainEvent({
              domainEvent: input.createdEvent,
              merchantId: input.merchantId,
              storeId: input.storeId,
            }),
            aggregateId: input.createdEvent.aggregateId,
            aggregateType: input.createdEvent.aggregateType,
          });
          await outbox.enqueue({
            envelope: envelopeFromDomainEvent({
              domainEvent: input.completedEvent,
              merchantId: input.merchantId,
              storeId: input.storeId,
            }),
            aggregateId: input.completedEvent.aggregateId,
            aggregateType: input.completedEvent.aggregateType,
          });
        },
      },
      idFactory: () => "fixed-sale-id",
    });

    const result = await pos.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09121234567",
      tenderType: "cash",
      idempotencyKey: "idem-ok",
      lines: [
        {
          productId: "p1",
          productName: "شیر",
          quantity: 1,
          unitPriceMinor: 2000n,
        },
      ],
    });

    expect(result.created).toBe(true);
    const pending = await outbox.pollPending(10);
    expect(pending.map((m) => m.eventType).sort()).toEqual(
      ["SaleCompleted", "SaleCreated"].sort(),
    );
    expect(
      await stockMovements.listByReference({
        merchantId: "m1",
        referenceType: "sale",
        referenceId: "fixed-sale-id",
      }),
    ).toHaveLength(1);
  });

  it("ADR-148: listStockMovements filters by store and product with cursor pagination", async () => {
    const stockItems = new InMemoryStockItemRepository();
    const stockMovements = new InMemoryStockMovementRepository();
    const inventory = createInventoryUseCases({
      stockItems,
      stockMovements,
    });

    await inventory.adjustStock({
      merchantId: "m1",
      storeId: "s1",
      productId: "p1",
      delta: 10,
      reason: "initial_stock",
      createIfMissing: true,
    });

    await inventory.decrementForSale({
      merchantId: "m1",
      storeId: "s1",
      productId: "p1",
      quantity: 3,
      sameTransaction: true,
      saleId: "sale-101",
    });

    await inventory.adjustStock({
      merchantId: "m1",
      storeId: "s1",
      productId: "p2",
      delta: 5,
      reason: "initial_stock",
      createIfMissing: true,
    });

    // Query all movements for store s1
    const allS1 = await inventory.listStockMovements({
      merchantId: "m1",
      storeId: "s1",
    });
    expect(allS1.movements).toHaveLength(3);

    // Query filtered by productId p1
    const p1Only = await inventory.listStockMovements({
      merchantId: "m1",
      storeId: "s1",
      productId: "p1",
    });
    expect(p1Only.movements).toHaveLength(2);
    expect(p1Only.movements.map((m) => m.productId)).toEqual(["p1", "p1"]);

    // Pagination limit 1
    const page1 = await inventory.listStockMovements({
      merchantId: "m1",
      storeId: "s1",
      limit: 1,
    });
    expect(page1.movements).toHaveLength(1);
    expect(page1.nextCursor).not.toBeNull();

    // Tenant isolation: foreign merchant gets empty list
    const foreign = await inventory.listStockMovements({
      merchantId: "m2",
      storeId: "s1",
    });
    expect(foreign.movements).toHaveLength(0);
  });
});
