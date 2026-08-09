/**
 * ADR-126+ ERPNext readiness — CompleteSale OLTP UoW + mapping uniqueness.
 */

import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { createPosUseCases } from "../pos/application/use-cases.js";
import { InMemorySaleRepository } from "../pos/infrastructure/persistence/in-memory-sale-repository.js";
import { createInventoryUseCases } from "../inventory/application/use-cases.js";
import {
  InMemoryStockItemRepository,
  InMemoryStockMovementRepository,
} from "../inventory/infrastructure/index.js";
import { createStockItemAggregate } from "../inventory/domain/stock-item.js";
import { InMemoryOutboxStore } from "../../outbox/index.js";
import { envelopeFromDomainEvent } from "../../event-driven/index.js";
import {
  createAccountingOutboxHandler,
  FakeAccountingProvider,
  InMemoryExternalEntityMappingRepository,
  mapPaymentToAccountingRecord,
  mapStockReasonToAccountingMovementType,
} from "./index.js";
import { createOutboxMessage } from "../../outbox/index.js";
import { InMemoryObjectStorageAdapter } from "../../minio-storage/index.js";

describe("ERPNext readiness — CompleteSale UoW boundary", () => {
  it("runs object storage only after OLTP unit of work commits", async () => {
    const sales = new InMemorySaleRepository();
    const stockItems = new InMemoryStockItemRepository();
    const stockMovements = new InMemoryStockMovementRepository();
    await stockItems.save(
      createStockItemAggregate({
        id: "st-uow",
        merchantId: "m1",
        storeId: "s1",
        productId: "p1",
        quantity: 5,
      }),
    );
    const inventory = createInventoryUseCases({ stockItems, stockMovements });
    const outbox = new InMemoryOutboxStore();
    const innerStorage = new InMemoryObjectStorageAdapter();

    let uowActive = false;
    let storageSeenDuringUow = false;
    const order: string[] = [];

    const storage = {
      ensureBucket: (bucket: Parameters<InMemoryObjectStorageAdapter["ensureBucket"]>[0]) =>
        innerStorage.ensureBucket(bucket),
      putObject: async (
        params: Parameters<InMemoryObjectStorageAdapter["putObject"]>[0],
      ) => {
        if (uowActive) storageSeenDuringUow = true;
        order.push("storage");
        return innerStorage.putObject(params);
      },
      getObject: (params: Parameters<InMemoryObjectStorageAdapter["getObject"]>[0]) =>
        innerStorage.getObject(params),
      deleteObject: (
        params: Parameters<InMemoryObjectStorageAdapter["deleteObject"]>[0],
      ) => innerStorage.deleteObject(params),
      createPresignedUploadUrl: (
        params: Parameters<
          InMemoryObjectStorageAdapter["createPresignedUploadUrl"]
        >[0],
      ) => innerStorage.createPresignedUploadUrl(params),
      createPresignedDownloadUrl: (
        params: Parameters<
          InMemoryObjectStorageAdapter["createPresignedDownloadUrl"]
        >[0],
      ) => innerStorage.createPresignedDownloadUrl(params),
    };

    const pos = createPosUseCases({
      sales,
      runInUnitOfWork: async (fn) => {
        uowActive = true;
        order.push("uow:start");
        try {
          return await fn();
        } finally {
          uowActive = false;
          order.push("uow:end");
        }
      },
      membership: {
        async upsertFromPosPhoneCapture() {
          order.push("membership");
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
          order.push("inventory");
          await inventory.decrementForSale(input);
        },
      },
      outbox: {
        async enqueueSaleEvents(input) {
          order.push("outbox");
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
      objectStorage: storage,
      idFactory: () => randomUUID(),
    });

    const result = await pos.completeSale({
      merchantId: "m1",
      storeId: "s1",
      phone: "09121234567",
      tenderType: "cash",
      idempotencyKey: "uow-key-1",
      lines: [
        {
          productId: "p1",
          productName: "شیر",
          quantity: 1,
          unitPriceMinor: 1000n,
        },
      ],
    });

    expect(result.created).toBe(true);
    expect(storageSeenDuringUow).toBe(false);
    expect(order.indexOf("uow:end")).toBeLessThan(order.indexOf("storage"));
    expect(result.event.payload.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: "p1", quantity: 1 }),
      ]),
    );
  });

  it("rolls back OLTP when inventory fails inside unit of work", async () => {
    const sales = new InMemorySaleRepository();
    let committed = false;
    const pos = createPosUseCases({
      sales,
      runInUnitOfWork: async (fn) => {
        try {
          const value = await fn();
          committed = true;
          return value;
        } catch (err) {
          sales.clear();
          committed = false;
          throw err;
        }
      },
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
        async decrementForSale() {
          throw new Error("insufficient");
        },
      },
      outbox: {
        async enqueueSaleEvents() {},
      },
    });

    await expect(
      pos.completeSale({
        merchantId: "m1",
        storeId: "s1",
        phone: "09121234567",
        tenderType: "cash",
        idempotencyKey: "rollback-1",
        lines: [
          {
            productId: "p1",
            productName: "x",
            quantity: 1,
            unitPriceMinor: 100n,
          },
        ],
      }),
    ).rejects.toThrow(/insufficient/);

    expect(committed).toBe(false);
    expect(await sales.findByIdempotencyKey("m1", "rollback-1")).toBeNull();
  });
  it("requires outbox when UnitOfWork is bound (fail-closed)", async () => {
    const sales = new InMemorySaleRepository();
    const pos = createPosUseCases({
      sales,
      runInUnitOfWork: async (fn) => fn(),
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
        async decrementForSale() {},
      },
    });

    await expect(
      pos.completeSale({
        merchantId: "m1",
        storeId: "s1",
        phone: "09121234567",
        tenderType: "cash",
        idempotencyKey: "no-outbox",
        lines: [
          {
            productId: "p1",
            productName: "x",
            quantity: 1,
            unitPriceMinor: 100n,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "OUTBOX_REQUIRED" });
  });

  it("rolls back sale when outbox enqueue fails inside UnitOfWork", async () => {
    const sales = new InMemorySaleRepository();
    let committed = false;
    const pos = createPosUseCases({
      sales,
      runInUnitOfWork: async (fn) => {
        try {
          const value = await fn();
          committed = true;
          return value;
        } catch (err) {
          sales.clear();
          committed = false;
          throw err;
        }
      },
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
        async decrementForSale() {},
      },
      outbox: {
        async enqueueSaleEvents() {
          throw new Error("outbox_down");
        },
      },
    });

    await expect(
      pos.completeSale({
        merchantId: "m1",
        storeId: "s1",
        phone: "09121234567",
        tenderType: "cash",
        idempotencyKey: "outbox-fail",
        lines: [
          {
            productId: "p1",
            productName: "x",
            quantity: 1,
            unitPriceMinor: 100n,
          },
        ],
      }),
    ).rejects.toThrow(/outbox_down/);

    expect(committed).toBe(false);
    expect(await sales.findByIdempotencyKey("m1", "outbox-fail")).toBeNull();
  });
});

describe("ERPNext readiness — mappings + accounting consumer", () => {
  it("isolates mappings by merchant (tenant)", async () => {
    const mappings = new InMemoryExternalEntityMappingRepository();
    const at = new Date("2026-08-09T00:00:00Z");
    await mappings.upsert({
      id: "map-a",
      merchantId: "m1",
      storeId: null,
      entityType: "product",
      entityId: "p1",
      provider: "fake",
      externalId: "ITEM-SHARED",
      externalSecondaryId: null,
      createdAt: at,
      updatedAt: at,
    });
    await mappings.upsert({
      id: "map-b",
      merchantId: "m2",
      storeId: null,
      entityType: "product",
      entityId: "p1",
      provider: "fake",
      externalId: "ITEM-SHARED",
      externalSecondaryId: null,
      createdAt: at,
      updatedAt: at,
    });
    const m1 = await mappings.findByExternal({
      merchantId: "m1",
      provider: "fake",
      entityType: "product",
      externalId: "ITEM-SHARED",
    });
    const m2 = await mappings.findByExternal({
      merchantId: "m2",
      provider: "fake",
      entityType: "product",
      externalId: "ITEM-SHARED",
    });
    expect(m1?.entityId).toBe("p1");
    expect(m2?.merchantId).toBe("m2");
  });

  it("prevents duplicate external ids across different entities", async () => {
    const mappings = new InMemoryExternalEntityMappingRepository();
    const at = new Date("2026-08-09T00:00:00Z");
    await mappings.upsert({
      id: "map-1",
      merchantId: "m1",
      storeId: null,
      entityType: "product",
      entityId: "p1",
      provider: "fake",
      externalId: "ITEM-1",
      externalSecondaryId: null,
      createdAt: at,
      updatedAt: at,
    });
    await expect(
      mappings.upsert({
        id: "map-2",
        merchantId: "m1",
        storeId: null,
        entityType: "product",
        entityId: "p2",
        provider: "fake",
        externalId: "ITEM-1",
        externalSecondaryId: null,
        createdAt: at,
        updatedAt: at,
      }),
    ).rejects.toThrow(/unique violation/);
  });

  it("maps MembershipCreated and SaleCompleted lines through Fake provider", async () => {
    const fake = new FakeAccountingProvider();
    const mappings = new InMemoryExternalEntityMappingRepository();
    const handler = createAccountingOutboxHandler({
      provider: fake,
      mappings,
      idFactory: () => "map-x",
      now: () => new Date("2026-08-09T00:00:00Z"),
    });

    const membershipMsg = createOutboxMessage({
      envelope: envelopeFromDomainEvent({
        domainEvent: {
          eventName: "MembershipCreated",
          aggregateId: "mem-1",
          aggregateType: "StoreMembership",
          occurredAt: new Date("2026-08-09T00:00:00Z"),
          payload: {
            customerId: "cust-9",
            phoneNational: "09120001122",
          },
        },
        merchantId: "m1",
        storeId: "s1",
      }),
      aggregateId: "mem-1",
      aggregateType: "StoreMembership",
    });
    await handler(membershipMsg);
    expect(fake.calls.some((c) => c.method === "syncCustomer")).toBe(true);

    const saleMsg = createOutboxMessage({
      envelope: envelopeFromDomainEvent({
        domainEvent: {
          eventName: "SaleCompleted",
          aggregateId: "sale-lines",
          aggregateType: "Sale",
          occurredAt: new Date("2026-08-09T00:00:00Z"),
          payload: {
            saleId: "sale-lines",
            customerId: "cust-9",
            phoneNational: "09120001122",
            idempotencyKey: "k-lines",
            totalAmountMinor: "2000",
            lines: [
              {
                productId: "p1",
                quantity: 2,
                unitCode: "piece",
                unitPriceMinor: "1000",
                lineTotalMinor: "2000",
              },
            ],
          },
        },
        merchantId: "m1",
        storeId: "s1",
      }),
      aggregateId: "sale-lines",
      aggregateType: "Sale",
    });
    await handler(saleMsg);
    const saleCall = fake.calls.filter((c) => c.method === "recordSale");
    expect(saleCall.length).toBeGreaterThanOrEqual(1);
  });

  it("maps payment + stock reasons without DocType names", () => {
    const payment = mapPaymentToAccountingRecord({
      eventId: "e1",
      merchantId: "m1",
      paymentId: "pay-1",
      orderId: "ord-1",
      amountMinor: 5000n,
      occurredAt: new Date("2026-08-09T00:00:00Z"),
    });
    expect(payment.entityType).toBe("payment");
    expect(payment.currency).toBe("IRR");
    expect(mapStockReasonToAccountingMovementType("sale")).toBe("SALE");
    expect(mapStockReasonToAccountingMovementType("adjustment")).toBe(
      "ADJUSTMENT",
    );
  });

  it("ERPNext adapter is exported from accounting infrastructure only", async () => {
    const mod = await import("./index.js");
    expect("ErpNextAccountingProvider" in mod).toBe(true);
    expect(mod.resolveAccountingProviderId({ MOS_ACCOUNTING_PROVIDER: "erpnext" })).toBe(
      "erpnext",
    );
    const ports = await import("./application/ports/accounting-provider.js");
    expect("projectItemDoc" in ports).toBe(false);
    expect(Object.keys(mod).join(",")).not.toMatch(/frappe/i);
  });
});
