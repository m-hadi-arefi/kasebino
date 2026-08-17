import { describe, expect, it } from "vitest";

import {
  createEventEnvelope,
  OUTBOX_CONSUMERS,
} from "../event-driven/index.js";
import { MVP_EVENT_TYPES } from "../event-naming/index.js";
import { MONGO_COLLECTIONS } from "../../../infrastructure/mongodb/contracts/analytics/index.js";
import {
  createOutboxWorker,
  InMemoryOutboxStore,
  InMemoryProcessedSet,
} from "../../outbox/index.js";
import {
  assertCollectionIsMosEvents,
  assertIdempotentByEventId,
  assertMerchantTenantField,
  assertPersianPayloadPreserved,
  assertWarehouseImplementedHere,
  assertWarehouseOffCriticalPath,
  computeWarehouseLag,
  createInMemoryWarehouseMetrics,
  createWarehouseOutboxHandler,
  EVENT_WAREHOUSE,
  EVENT_WAREHOUSE_AUTHZ,
  EVENT_WAREHOUSE_DECISION,
  EVENT_WAREHOUSE_REQUIREMENTS,
  EVENT_WAREHOUSE_UNICODE,
  EVENT_WAREHOUSE_UX_FA,
  InMemoryEventWarehouseStore,
  warehouseDocumentFromEnvelope,
  WAREHOUSE_EVENT_MAPPING,
  WAREHOUSE_METRIC_NAMES,
} from "./index.js";

describe("ADR-057 Event Warehouse Architecture", () => {
  it("decides append-only mos_events mirror via outbox mongodb_warehouse", () => {
    expect(EVENT_WAREHOUSE_DECISION.pattern).toBe(
      "outbox_bridge_append_only_mos_events",
    );
    expect(EVENT_WAREHOUSE_DECISION.collection).toBe("mos_events");
    expect(EVENT_WAREHOUSE_DECISION.stream).toBe("domain");
    expect(EVENT_WAREHOUSE_DECISION.idempotencyKey).toBe("eventId");
    expect(EVENT_WAREHOUSE_DECISION.appendOnly).toBe(true);
    expect(EVENT_WAREHOUSE_DECISION.updatesForbidden).toBe(true);
    expect(EVENT_WAREHOUSE_DECISION.outboxConsumer).toBe("mongodb_warehouse");
    expect(EVENT_WAREHOUSE_DECISION.ttlMonths).toBe(24);
    expect(EVENT_WAREHOUSE_DECISION.onCheckoutCriticalPath).toBe(false);
    expect(EVENT_WAREHOUSE_DECISION.adminBrowseOnly).toBe(true);
    expect(EVENT_WAREHOUSE_DECISION.neverOltpSourceOfTruth).toBe(true);

    expect(EVENT_WAREHOUSE_REQUIREMENTS).toMatchObject({
      appendOnlyMosEvents: true,
      idempotentByEventId: true,
      outboxConsumerWired: true,
      tenantFieldsRequired: true,
      lagMetricsExposed: true,
      ttlTwentyFourMonths: true,
      unicodePersianPayloadsSafe: true,
    });

    expect(OUTBOX_CONSUMERS.mongodb_warehouse.implementation).toBe(
      "src/events/contracts/event-warehouse/",
    );
    expect(OUTBOX_CONSUMERS.mongodb_warehouse.detailAdr).toBe("ADR-057");
    expect(OUTBOX_CONSUMERS.mongodb_warehouse.onCriticalPath).toBe(false);

    expect(() => assertCollectionIsMosEvents(MONGO_COLLECTIONS.events)).not.toThrow();
    expect(() => assertCollectionIsMosEvents("events")).toThrow(/mos_events/i);
    expect(() => assertIdempotentByEventId("eventId")).not.toThrow();
    expect(() => assertIdempotentByEventId("id")).toThrow(/eventId/i);
    expect(() =>
      assertWarehouseImplementedHere("src/events/contracts/event-warehouse/"),
    ).not.toThrow();
    expect(() => assertWarehouseImplementedHere("src/elsewhere/")).toThrow(
      /event-warehouse/,
    );
    expect(() => assertWarehouseOffCriticalPath(false)).not.toThrow();
    expect(() => assertWarehouseOffCriticalPath(true)).toThrow(/critical path/i);
  });

  it("maps MVP catalog domain events to mos_events stream domain", () => {
    expect(WAREHOUSE_EVENT_MAPPING.collection).toBe("mos_events");
    expect(WAREHOUSE_EVENT_MAPPING.stream).toBe("domain");
    expect(WAREHOUSE_EVENT_MAPPING.catalogDomainEvents).toEqual(MVP_EVENT_TYPES);
    expect(WAREHOUSE_EVENT_MAPPING.catalogDomainEvents).toContain(
      "SaleCompleted",
    );
    expect(WAREHOUSE_EVENT_MAPPING.implementedDomainEvents).toContain(
      "SaleCompleted",
    );
    expect(WAREHOUSE_EVENT_MAPPING.auditEvidenceAdr).toBe("ADR-058");
    expect(WAREHOUSE_EVENT_MAPPING.auditEvidencePackage).toBe(
      "src/infrastructure/security/contracts/audit-logging/",
    );
    expect(WAREHOUSE_EVENT_MAPPING.auditEvidenceCollection).toBe("mos_audit");
    expect(WAREHOUSE_EVENT_MAPPING.productStreamAdr).toBe("ADR-059");
    expect(WAREHOUSE_EVENT_MAPPING.productAnalyticsPackage).toBe(
      "src/modules/analytics/domain/product/",
    );
    expect(WAREHOUSE_EVENT_MAPPING.productAnalyticsCollection).toBe(
      "mos_product",
    );
    expect(WAREHOUSE_EVENT_MAPPING.clickstreamAdr).toBe("ADR-060");
    expect(WAREHOUSE_EVENT_MAPPING.clickstreamPackage).toBe("src/infrastructure/mongodb/clickstream/");
    expect(WAREHOUSE_EVENT_MAPPING.clickstreamCollection).toBe("mos_behavior");
    expect(WAREHOUSE_EVENT_MAPPING.sessionAnalyticsAdr).toBe("ADR-061");
    expect(WAREHOUSE_EVENT_MAPPING.sessionAnalyticsPackage).toBe(
      "src/modules/analytics/domain/session/",
    );
    expect(WAREHOUSE_EVENT_MAPPING.sessionAnalyticsCollection).toBe(
      "mos_sessions",
    );
    expect(WAREHOUSE_EVENT_MAPPING.securityStreamDeferred).toBe(true);
    expect(EVENT_WAREHOUSE.mapping).toEqual(WAREHOUSE_EVENT_MAPPING);
  });

  it("inserts append-only and is idempotent by eventId", async () => {
    const store = new InMemoryEventWarehouseStore();
    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: "m-1",
      storeId: "s-1",
      eventId: "evt-1",
      occurredAt: "2026-08-03T10:00:00.000Z",
      payload: { saleId: "sale-1", totalToman: 120_000 },
    });
    const doc = warehouseDocumentFromEnvelope(envelope, {
      ingestedAt: "2026-08-03T10:00:05.000Z",
      source: "outbox",
    });

    expect(doc.merchantId).toBe("m-1");
    expect(doc.storeId).toBe("s-1");
    expect(doc.stream).toBe("domain");
    expect(doc.schemaVersion).toBe(1);

    const first = await store.insertIdempotent(doc);
    expect(first).toEqual({ status: "inserted", eventId: "evt-1" });
    expect(await store.count()).toBe(1);

    const mutated = {
      ...doc,
      payload: { saleId: "sale-hacked" },
    };
    const second = await store.insertIdempotent(mutated);
    expect(second).toEqual({ status: "duplicate", eventId: "evt-1" });
    expect(await store.count()).toBe(1);

    const stored = await store.findByEventId("evt-1");
    expect(stored?.payload).toEqual({
      saleId: "sale-1",
      totalToman: 120_000,
    });
  });

  it("preserves UTF-8 Persian payload strings round-trip", async () => {
    const store = new InMemoryEventWarehouseStore();
    const persianNote = "فروش ویژه کرمان — قهوه تازه";
    const envelope = createEventEnvelope({
      eventType: "ProductUpdated",
      merchantId: "m-fa",
      storeId: "s-fa",
      eventId: "evt-fa",
      payload: { nameFa: persianNote, sku: "SKU-۱" },
    });
    const doc = warehouseDocumentFromEnvelope(envelope, {
      ingestedAt: new Date("2026-08-03T11:00:00.000Z"),
    });
    await store.insertIdempotent(doc);
    const stored = await store.findByEventId("evt-fa");
    expect(stored?.payload.nameFa).toBe(persianNote);
    assertPersianPayloadPreserved(
      persianNote,
      stored?.payload.nameFa as string,
    );
    expect(EVENT_WAREHOUSE_UNICODE.preserveUtf8PersianInPayloads).toBe(true);
    expect(EVENT_WAREHOUSE_UX_FA.dir).toBe("rtl");
    expect(EVENT_WAREHOUSE_UX_FA.ADMIN_BROWSE_TITLE).toMatch(/انبار/);
  });

  it("requires merchantId tenant field and filters by merchant", async () => {
    expect(() => assertMerchantTenantField("m-1")).not.toThrow();
    expect(() => assertMerchantTenantField("")).toThrow(/merchantId/i);
    expect(() => assertMerchantTenantField(null)).toThrow(/merchantId/i);

    const store = new InMemoryEventWarehouseStore();
    for (const [eventId, merchantId] of [
      ["a", "m-1"],
      ["b", "m-2"],
      ["c", "m-1"],
    ] as const) {
      const env = createEventEnvelope({
        eventType: "StoreUpdated",
        merchantId,
        storeId: "s-1",
        eventId,
        payload: { storeId: "s-1" },
      });
      await store.insertIdempotent(
        warehouseDocumentFromEnvelope(env, { ingestedAt: new Date() }),
      );
    }

    const forM1 = await store.findByMerchant({ merchantId: "m-1" });
    expect(forM1).toHaveLength(2);
    expect(forM1.every((d) => d.merchantId === "m-1")).toBe(true);
    await expect(
      store.findByMerchant({ merchantId: "" }),
    ).rejects.toThrow(/merchantId/i);

    expect(EVENT_WAREHOUSE_AUTHZ.adminBrowseOnly).toBe(true);
    expect(EVENT_WAREHOUSE_AUTHZ.browseAudience).toBe("platform_admin");
    expect(EVENT_WAREHOUSE_AUTHZ.reservedBrowsePath).toBe(
      "/api/v1/admin/warehouse/events",
    );
  });

  it("records lag metrics on outbox mongodb_warehouse consumer", async () => {
    const store = new InMemoryEventWarehouseStore();
    const metrics = createInMemoryWarehouseMetrics();
    const outbox = new InMemoryOutboxStore();
    const processed = new InMemoryProcessedSet();
    const worker = createOutboxWorker({
      store: outbox,
      processed,
      consumers: ["mongodb_warehouse"],
      handlers: {
        mongodb_warehouse: createWarehouseOutboxHandler({
          store,
          metrics,
          now: () => new Date("2026-08-03T12:00:10.000Z"),
        }),
      },
    });

    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: "m-lag",
      storeId: "s-lag",
      eventId: "evt-lag",
      occurredAt: "2026-08-03T12:00:00.000Z",
      payload: { saleId: "sale-lag" },
    });
    await outbox.enqueue({ envelope });

    const result = await worker.dispatchOnce();
    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(await store.count()).toBe(1);

    const snap = metrics.snapshot();
    expect(snap.mirrored).toBe(1);
    expect(snap.duplicates).toBe(0);
    expect(snap.lastLagMs).toBe(10_000);
    expect(snap.maxLagMs).toBe(10_000);
    expect(WAREHOUSE_METRIC_NAMES.lagMs).toBe("event_warehouse_mirror_lag_ms");

    const doc = await store.findByEventId("evt-lag");
    expect(computeWarehouseLag(doc!).lagMs).toBe(10_000);

    // Re-dispatch same event as duplicate via direct handler
    await createWarehouseOutboxHandler({ store, metrics })({
      id: "outbox-2",
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      merchantId: envelope.merchantId,
      storeId: envelope.storeId,
      aggregateId: null,
      aggregateType: null,
      envelope,
      payloadVersion: envelope.payloadVersion,
      correlationId: envelope.correlationId,
      causationId: envelope.causationId,
      occurredAt: new Date(envelope.occurredAt),
      createdAt: new Date(),
      publishedAt: null,
      attemptCount: 0,
      lastError: null,
    });
    expect(metrics.snapshot().duplicates).toBe(1);
    expect(await store.count()).toBe(1);
  });

  it("exposes placement and bundle constants", () => {
    expect(EVENT_WAREHOUSE.placement.package).toBe("src/events/contracts/event-warehouse/");
    expect(EVENT_WAREHOUSE.decision.architectureDoc).toContain(
      "event-warehouse-architecture",
    );
    expect(EVENT_WAREHOUSE.indexes.ttlMonths).toBe(24);
  });
});
