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

  it("does not import erpnext in core module surface", async () => {
    const mod = await import("./index.js");
    expect(Object.keys(mod)).not.toContain("ERPNextAccountingProvider");
    expect(mod.resolveAccountingProviderId({ MOS_ACCOUNTING_PROVIDER: "noop" })).toBe(
      "noop",
    );
  });
});
