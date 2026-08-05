import { describe, expect, it } from "vitest";
import { createDomainEvent } from "../shared/ddd/index.js";
import { OUTBOX_SPINE } from "../modular-monolith/index.js";
import {
  ANALYTICS_CRITICAL_PATH,
  DELIVERY_GUARANTEES,
  EVENT_DRIVEN,
  EVENT_DRIVEN_DECISION,
  EVENT_ENVELOPE_FIELDS,
  EVENT_LOG_POLICY,
  EVENT_OUTBOX_SPINE,
  EVENT_UX_FA,
  OUTBOX_CONSUMERS,
  OUTBOX_EVENT_ROW,
  PROCESSED_EVENTS,
  TRANSACTIONAL_OUTBOX,
  assertAnalyticsOffCheckoutCriticalPath,
  assertAtLeastOnceDelivery,
  assertConsumersIdempotent,
  assertEnvelopeComplete,
  assertOutboxSpineAligned,
  assertTransactionalOutboxSameTx,
  createEventEnvelope,
  envelopeFromDomainEvent,
  scrubEnvelopeForLogs,
} from "./index.js";

describe("ADR-036 Event-Driven Architecture", () => {
  it("decides domain events + transactional outbox with at-least-once idempotent consumers", () => {
    expect(EVENT_DRIVEN_DECISION.pattern).toBe(
      "domain_events_plus_transactional_outbox",
    );
    expect(EVENT_DRIVEN_DECISION.delivery).toBe("at_least_once");
    expect(EVENT_DRIVEN_DECISION.consumersMustBeIdempotent).toBe(true);
    expect(EVENT_DRIVEN_DECISION.fullEventSourcingMvp).toBe(false);
    expect(EVENT_DRIVEN_DECISION.cqrsReady).toBe(true);
    expect(EVENT_DRIVEN.decision).toBe(EVENT_DRIVEN_DECISION);

    expect(() => assertAtLeastOnceDelivery("at_least_once")).not.toThrow();
    expect(() => assertAtLeastOnceDelivery("at-least-once")).not.toThrow();
    expect(() => assertAtLeastOnceDelivery("exactly_once")).toThrow(
      /at-least-once/i,
    );
    expect(() => assertConsumersIdempotent(true)).not.toThrow();
    expect(() => assertConsumersIdempotent(false)).toThrow(/idempotent/i);
  });

  it("defines the canonical envelope and builds past-tense envelopes", () => {
    expect(EVENT_ENVELOPE_FIELDS).toEqual([
      "eventId",
      "eventType",
      "occurredAt",
      "merchantId",
      "storeId",
      "actorId",
      "correlationId",
      "causationId",
      "payloadVersion",
      "payload",
    ]);

    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: "m-1",
      storeId: "s-1",
      correlationId: "corr-1",
      payload: { saleId: "sale-1", totalAmountMinor: "10000" },
    });

    expect(envelope.eventType).toBe("SaleCompleted");
    expect(envelope.merchantId).toBe("m-1");
    expect(envelope.storeId).toBe("s-1");
    expect(envelope.correlationId).toBe("corr-1");
    expect(envelope.payloadVersion).toBe(1);
    expect(envelope.payload.saleId).toBe("sale-1");
    expect(envelope.eventId.length).toBeGreaterThan(0);
    expect(envelope.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(() => assertEnvelopeComplete(envelope)).not.toThrow();
    expect(() =>
      createEventEnvelope({
        eventType: "CreateSale",
        merchantId: "m-1",
        payload: {},
      }),
    ).toThrow(/past tense/i);
  });

  it("lifts domain events into envelopes for the outbox path", () => {
    const domainEvent = createDomainEvent({
      eventName: "InventoryChanged",
      aggregateId: "stock-1",
      aggregateType: "StockItem",
      payload: { productId: "p-1", quantity: 3 },
    });

    const envelope = envelopeFromDomainEvent({
      domainEvent,
      merchantId: "m-1",
      storeId: "s-1",
      correlationId: "corr-inv",
    });

    expect(envelope.eventType).toBe("InventoryChanged");
    expect(envelope.payload.productId).toBe("p-1");
    expect(envelope.correlationId).toBe("corr-inv");
  });

  it("requires transactional outbox in the same TX as the aggregate", () => {
    expect(TRANSACTIONAL_OUTBOX.pattern).toBe("transactional_outbox");
    expect(TRANSACTIONAL_OUTBOX.table).toBe("outbox_events");
    expect(TRANSACTIONAL_OUTBOX.sameTransactionAsAggregate).toBe(true);
    expect(TRANSACTIONAL_OUTBOX.dualWriteWithoutOutboxForbidden).toBe(true);
    expect(TRANSACTIONAL_OUTBOX.workerImplementedIn).toBe("src/outbox");
    expect(TRANSACTIONAL_OUTBOX.workerAdr).toBe("ADR-035");
    expect(OUTBOX_EVENT_ROW.pendingPredicate).toBe("published_at IS NULL");
    expect(PROCESSED_EVENTS.uniqueOn).toBe("event_id");

    expect(() => assertTransactionalOutboxSameTx(true)).not.toThrow();
    expect(() => assertTransactionalOutboxSameTx(false)).toThrow(/same TX/i);
  });

  it("documents at-least-once retries and dead-letter after max attempts", () => {
    expect(DELIVERY_GUARANTEES.mode).toBe("at_least_once");
    expect(DELIVERY_GUARANTEES.retryBackoffSeconds).toEqual([
      1, 5, 30, 120, 600,
    ]);
    expect(DELIVERY_GUARANTEES.maxRetries).toBe(5);
    expect(DELIVERY_GUARANTEES.afterMaxRetries).toBe("dead_letter");
    expect(DELIVERY_GUARANTEES.globalOrderAssumedForbidden).toBe(true);
  });

  it("feeds cache, realtime, analytics, and notifications off the critical path", () => {
    expect(Object.keys(OUTBOX_CONSUMERS).sort()).toEqual(
      [
        "cache_invalidation",
        "emqx_realtime",
        "minio_receipts",
        "mongodb_warehouse",
        "notifications",
      ].sort(),
    );
    expect(OUTBOX_CONSUMERS.mongodb_warehouse.onCriticalPath).toBe(false);
    expect(OUTBOX_CONSUMERS.mongodb_warehouse.analyticsPlaneOnly).toBe(true);
    expect(ANALYTICS_CRITICAL_PATH.onCheckoutCriticalPath).toBe(false);
    expect(
      ANALYTICS_CRITICAL_PATH.syncMongoWriteInCompleteSaleForbidden,
    ).toBe(true);

    expect(() => assertAnalyticsOffCheckoutCriticalPath(false)).not.toThrow();
    expect(() => assertAnalyticsOffCheckoutCriticalPath(true)).toThrow(
      /critical path/i,
    );
  });

  it("aligns consumers with modular-monolith OUTBOX_SPINE", () => {
    expect(EVENT_OUTBOX_SPINE.pattern).toBe(OUTBOX_SPINE.pattern);
    expect(EVENT_OUTBOX_SPINE.feeds).toEqual(OUTBOX_SPINE.feeds);
    expect(EVENT_OUTBOX_SPINE.analyticsOnCheckoutCriticalPath).toBe(false);
    expect(OUTBOX_SPINE.feeds).toEqual(
      expect.arrayContaining([
        "emqx_realtime",
        "mongodb_warehouse",
        "cache_invalidation",
        "notifications",
      ]),
    );
    expect(() => assertOutboxSpineAligned()).not.toThrow();
  });

  it("scrubs payloads in logs and ships Persian realtime/notification copy", () => {
    expect(EVENT_LOG_POLICY.scrubPayloadsInLogs).toBe(true);
    expect(EVENT_LOG_POLICY.piiInLogsForbidden).toBe(true);

    const envelope = createEventEnvelope({
      eventType: "SaleCompleted",
      merchantId: "m-1",
      payload: { phoneNational: "09123456789" },
    });
    const scrubbed = scrubEnvelopeForLogs(envelope);
    expect(scrubbed.payload).toBe("[scrubbed]");
    expect(scrubbed.eventType).toBe("SaleCompleted");

    expect(EVENT_UX_FA.dir).toBe("rtl");
    expect(EVENT_UX_FA.locale).toBe("fa-IR");
    for (const msg of [
      EVENT_UX_FA.SALE_COMPLETED_TOAST,
      EVENT_UX_FA.INVENTORY_LOW_TOAST,
      EVENT_UX_FA.PICKUP_ORDER_PAID_TOAST,
      EVENT_UX_FA.NOTIFICATION_DRAWER_TITLE,
      EVENT_UX_FA.REALTIME_OFFLINE,
    ]) {
      expect(msg).toMatch(/[\u0600-\u06FF]/);
    }
  });
});
