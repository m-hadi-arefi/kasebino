/**
 * ADR-126 accounting integration tests — Fake provider idempotency + mappers.
 */

import { describe, expect, it } from "vitest";

import {
  createAccountingOutboxHandler,
  FakeAccountingProvider,
  InMemoryExternalEntityMappingRepository,
  INTEGRATION_METRIC_NAMES,
  mapProductToAccountingSync,
  mapSaleToAccountingRecord,
  mapStoreToWarehouseProjection,
  NoopAccountingProvider,
  resetIntegrationMetrics,
  snapshotIntegrationMetrics,
} from "./index.js";
import { createOutboxMessage } from "../../outbox/index.js";
import { envelopeFromDomainEvent } from "../../event-driven/index.js";

describe("ADR-126 AccountingProvider", () => {
  it("FakeAccountingProvider is idempotent by eventId", async () => {
    const fake = new FakeAccountingProvider();
    const input = mapSaleToAccountingRecord({
      eventId: "evt-1",
      merchantId: "m1",
      storeId: "s1",
      saleId: "sale-1",
      idempotencyKey: "idem-1",
      totalAmountMinor: 1000n,
      occurredAt: new Date("2026-08-09T00:00:00Z"),
      lines: [
        {
          productId: "p1",
          quantity: 2,
          unitPriceMinor: 500n,
          lineTotalMinor: 1000n,
        },
      ],
    });
    const first = await fake.recordSale(input);
    const second = await fake.recordSale(input);
    expect(first.alreadyApplied).toBe(false);
    expect(second.alreadyApplied).toBe(true);
    expect(second.externalId).toBe(first.externalId);
    expect(fake.calls).toHaveLength(2);
  });

  it("NoopAccountingProvider rejects purchase/return stubs", async () => {
    const noop = new NoopAccountingProvider();
    const purchase = await noop.recordPurchase();
    expect(purchase.ok).toBe(false);
    expect(purchase.message).toBe("purchase_unsupported");
  });

  it("maps product/customer/store without ERPNext fields", () => {
    const product = mapProductToAccountingSync({
      eventId: "e1",
      merchantId: "m1",
      productId: "p1",
      sku: "SKU-1",
      barcode: "123",
      name: "نان",
      priceAmountMinor: 25000n,
    });
    expect(product.unitCode).toBe("piece");
    expect(product.name).toBe("نان");
    const store = mapStoreToWarehouseProjection({
      merchantId: "m1",
      storeId: "s1",
      displayName: "فروشگاه یک",
    });
    expect(store.entityType).toBe("store_warehouse");
  });

  it("outbox handler records sale and upserts mapping", async () => {
    resetIntegrationMetrics();
    const fake = new FakeAccountingProvider();
    const mappings = new InMemoryExternalEntityMappingRepository();
    const handler = createAccountingOutboxHandler({
      provider: fake,
      mappings,
      idFactory: () => "map-1",
      now: () => new Date("2026-08-09T00:00:00Z"),
    });

    const domainEvent = {
      eventName: "SaleCompleted",
      aggregateId: "sale-9",
      aggregateType: "Sale",
      occurredAt: new Date("2026-08-09T00:00:00Z"),
      payload: {
        saleId: "sale-9",
        idempotencyKey: "k9",
        totalAmountMinor: "5000",
        lineCount: 1,
        tenderType: "cash",
      },
    };
    const message = createOutboxMessage({
      envelope: envelopeFromDomainEvent({
        domainEvent,
        merchantId: "m1",
        storeId: "s1",
      }),
      aggregateId: "sale-9",
      aggregateType: "Sale",
    });

    await handler(message);
    await handler(message);

    expect(fake.calls.filter((c) => c.method === "recordSale")).toHaveLength(2);
    const mapped = await mappings.findByInternal({
      merchantId: "m1",
      provider: "fake",
      entityType: "sale",
      entityId: "sale-9",
    });
    expect(mapped?.externalId).toBeTruthy();
    const snap = snapshotIntegrationMetrics();
    expect(
      Object.keys(snap).some((k) =>
        k.startsWith(INTEGRATION_METRIC_NAMES.success),
      ),
    ).toBe(true);
  });

  it("outbox handler processes Purchase, Return, Expense, Transfer, and Supplier events", async () => {
    const fake = new FakeAccountingProvider();
    const mappings = new InMemoryExternalEntityMappingRepository();
    const handler = createAccountingOutboxHandler({
      provider: fake,
      mappings,
      idFactory: () => "map-test",
      now: () => new Date("2026-08-16T00:00:00Z"),
    });

    // 1. PurchaseCreated
    await handler(
      createOutboxMessage({
        envelope: envelopeFromDomainEvent({
          domainEvent: {
            eventName: "PurchaseCreated",
            aggregateId: "pur-100",
            aggregateType: "Purchase",
            occurredAt: new Date("2026-08-16T00:00:00Z"),
            payload: {
              purchaseId: "pur-100",
              supplierName: "تامین‌کننده البرز",
              totalAmountMinor: "10000000",
              lines: [{ productId: "p1", quantity: 5, unitCostMinor: "2000000" }],
            },
          },
          merchantId: "m1",
          storeId: "s1",
        }),
        aggregateId: "pur-100",
        aggregateType: "Purchase",
      }),
    );
    expect(fake.calls.some((c) => c.method === "recordPurchase")).toBe(true);

    // 2. SaleReturned
    await handler(
      createOutboxMessage({
        envelope: envelopeFromDomainEvent({
          domainEvent: {
            eventName: "SaleReturned",
            aggregateId: "ret-100",
            aggregateType: "Return",
            occurredAt: new Date("2026-08-16T00:00:00Z"),
            payload: {
              returnId: "ret-100",
              saleId: "sale-9",
              totalAmountMinor: "5000",
              lines: [{ productId: "p1", quantity: 1, unitPriceMinor: "5000" }],
            },
          },
          merchantId: "m1",
          storeId: "s1",
        }),
        aggregateId: "ret-100",
        aggregateType: "Return",
      }),
    );
    expect(fake.calls.some((c) => c.method === "recordReturn")).toBe(true);

    // 3. ExpenseRecorded
    await handler(
      createOutboxMessage({
        envelope: envelopeFromDomainEvent({
          domainEvent: {
            eventName: "ExpenseRecorded",
            aggregateId: "exp-100",
            aggregateType: "Expense",
            occurredAt: new Date("2026-08-16T00:00:00Z"),
            payload: {
              expenseId: "exp-100",
              amountMinor: "500000",
              description: "هزینه اینترنت",
            },
          },
          merchantId: "m1",
          storeId: "s1",
        }),
        aggregateId: "exp-100",
        aggregateType: "Expense",
      }),
    );
    expect(fake.calls.some((c) => c.method === "recordExpense")).toBe(true);

    // 4. StockTransferred
    await handler(
      createOutboxMessage({
        envelope: envelopeFromDomainEvent({
          domainEvent: {
            eventName: "StockTransferred",
            aggregateId: "xfer-100",
            aggregateType: "StockTransfer",
            occurredAt: new Date("2026-08-16T00:00:00Z"),
            payload: {
              transferId: "xfer-100",
              fromStoreId: "s1",
              toStoreId: "s2",
              lines: [{ productId: "p1", quantity: 2 }],
            },
          },
          merchantId: "m1",
          storeId: "s1",
        }),
        aggregateId: "xfer-100",
        aggregateType: "StockTransfer",
      }),
    );
    expect(fake.calls.some((c) => c.method === "recordTransfer")).toBe(true);

    // 5. SupplierCreated
    await handler(
      createOutboxMessage({
        envelope: envelopeFromDomainEvent({
          domainEvent: {
            eventName: "SupplierCreated",
            aggregateId: "sup-100",
            aggregateType: "Supplier",
            occurredAt: new Date("2026-08-16T00:00:00Z"),
            payload: {
              supplierId: "sup-100",
              name: "تامین‌کننده آریا",
              phone: "09121111111",
            },
          },
          merchantId: "m1",
          storeId: "s1",
        }),
        aggregateId: "sup-100",
        aggregateType: "Supplier",
      }),
    );
    expect(fake.calls.some((c) => c.method === "syncSupplier")).toBe(true);
  });

  it("resolves erpnext provider id and exports adapter only from accounting module", async () => {
    const mod = await import("./index.js");
    expect(mod.resolveAccountingProviderId({ MOS_ACCOUNTING_PROVIDER: "noop" })).toBe(
      "noop",
    );
    expect(mod.resolveAccountingProviderId({ MOS_ACCOUNTING_PROVIDER: "erpnext" })).toBe(
      "erpnext",
    );
    expect(typeof mod.ErpNextAccountingProvider).toBe("function");
    expect(typeof mod.createAccountingProvider).toBe("function");
  });
});
