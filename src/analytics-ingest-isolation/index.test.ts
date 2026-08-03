import { describe, expect, it } from "vitest";

import {
  ANALYTICS_CRITICAL_PATH,
  DELIVERY_GUARANTEES,
} from "../event-driven/index.js";
import {
  ANALYTICS_INGEST_ISOLATION,
  ANALYTICS_INGEST_ISOLATION_DECISION,
  ANALYTICS_INGEST_ISOLATION_REQUIREMENTS,
  INGEST_ISOLATION_UX_FA,
  INGEST_METRIC_NAMES,
  INGEST_RETRY_POLICY,
  ISOLATED_INGEST_PATHS,
  assertAnalyticsIngestOffCriticalPath,
  assertIngestRetryPolicyAligned,
  assertIsolationImplementedHere,
  assertSalePathIndependentOfMongo,
  createAnalyticsAfterSalePort,
  createAnalyticsIngestBuffer,
  createInMemoryIngestMetrics,
  createIsolatingAnalyticsIngestPort,
  createUnavailableMongoSink,
  type AnalyticsIngestRecord,
  type AnalyticsIngestSink,
} from "./index.js";

function sampleRecord(
  overrides: Partial<AnalyticsIngestRecord> = {},
): AnalyticsIngestRecord {
  return {
    eventId: "evt-1",
    eventType: "SaleCompleted",
    merchantId: "m-1",
    storeId: "s-1",
    occurredAt: "2026-08-03T12:00:00.000Z",
    ingestClass: "domain_mirror",
    payload: { saleId: "sale-1" },
    ...overrides,
  };
}

describe("ADR-065 analytics ingest failure isolation", () => {
  it("locks fire-and-forget buffer decision and sacred sale path", () => {
    expect(ANALYTICS_INGEST_ISOLATION_DECISION.pattern).toBe(
      "fire_and_forget_buffer_queue",
    );
    expect(ANALYTICS_INGEST_ISOLATION_DECISION.posSuccessIndependentOfMongo).toBe(
      true,
    );
    expect(
      ANALYTICS_INGEST_ISOLATION_DECISION.saleCompletedMustNotFailWhenMongoDown,
    ).toBe(true);
    expect(
      ANALYTICS_INGEST_ISOLATION_DECISION.syncMongoWriteInCompleteSaleTxForbidden,
    ).toBe(true);
    expect(ANALYTICS_INGEST_ISOLATION_DECISION.outboxConsumer).toBe(
      "mongodb_warehouse",
    );
    expect(ANALYTICS_INGEST_ISOLATION_DECISION.trackAcceptedHttpSemantics).toBe(
      202,
    );
    expect(ANALYTICS_INGEST_ISOLATION_DECISION.warehouseDriverDeferredTo).toBe(
      null,
    );
    expect(ANALYTICS_INGEST_ISOLATION_DECISION.warehousePackage).toBe(
      "src/event-warehouse/",
    );
    expect(ANALYTICS_INGEST_ISOLATION_DECISION.warehouseAdr).toBe("ADR-057");

    expect(ISOLATED_INGEST_PATHS.completeSale.failOpenWhenMongoDown).toBe(true);
    expect(ISOLATED_INGEST_PATHS.saleCompleted.failOpenWhenMongoDown).toBe(true);
    expect(ISOLATED_INGEST_PATHS.trackIngest.mayReturnAcceptedAndBuffer).toBe(
      true,
    );

    expect(ANALYTICS_INGEST_ISOLATION.requirements).toEqual(
      ANALYTICS_INGEST_ISOLATION_REQUIREMENTS,
    );
  });

  it("aligns retry/drop policy with event-driven delivery guarantees", () => {
    expect(INGEST_RETRY_POLICY.maxAttempts).toBe(
      DELIVERY_GUARANTEES.maxRetries,
    );
    expect(INGEST_RETRY_POLICY.backoffMs).toEqual(
      DELIVERY_GUARANTEES.retryBackoffSeconds.map((s) => s * 1000),
    );
    expect(INGEST_RETRY_POLICY.domainEvents.afterMaxAttempts).toBe(
      "dead_letter",
    );
    expect(INGEST_RETRY_POLICY.bestEffortTrack.afterMaxAttempts).toBe("dropped");
    expect(INGEST_RETRY_POLICY.domainEvents.neverRollBackCompletedSale).toBe(
      true,
    );

    expect(() => assertIngestRetryPolicyAligned()).not.toThrow();
    expect(() => assertSalePathIndependentOfMongo(true)).not.toThrow();
    expect(() => assertSalePathIndependentOfMongo(false)).toThrow(/Mongo/i);
    expect(() => assertAnalyticsIngestOffCriticalPath(false)).not.toThrow();
    expect(() => assertAnalyticsIngestOffCriticalPath(true)).toThrow(
      /critical path/i,
    );
    expect(() =>
      assertIsolationImplementedHere("src/analytics-ingest-isolation/"),
    ).not.toThrow();
    expect(() => assertIsolationImplementedHere("src/elsewhere/")).toThrow(
      /analytics-ingest-isolation/,
    );

    expect(ANALYTICS_CRITICAL_PATH.syncMongoWriteInCompleteSaleForbidden).toBe(
      true,
    );
  });

  it("enqueues fire-and-forget and never throws when Mongo sink fails", async () => {
    const metrics = createInMemoryIngestMetrics();
    const t0 = new Date("2026-08-03T12:00:00.000Z");
    const buffer = createAnalyticsIngestBuffer({
      sink: createUnavailableMongoSink(),
      metrics,
      now: () => t0,
      maxAttempts: 3,
    });
    const port = createIsolatingAnalyticsIngestPort(buffer, metrics);

    const accepted = port.accept(sampleRecord());
    expect(accepted.accepted).toBe(true);
    expect(accepted.disposition).toBe("queued");
    expect(buffer.depth()).toBe(1);

    const flush1 = await buffer.flush(t0);
    expect(flush1.attempted).toBe(1);
    expect(flush1.retried).toBe(1);
    expect(flush1.delivered).toBe(0);
    expect(buffer.depth()).toBe(1);

    const snap = metrics.snapshot();
    expect(snap.enqueued).toBe(1);
    expect(snap.accepted).toBe(1);
    expect(snap.mongoUnavailable).toBe(1);
    expect(snap.retried).toBe(1);
    expect(snap.bufferDepth).toBe(1);
  });

  it("dead-letters domain mirrors and drops best-effort tracks after max retries", async () => {
    const t0 = new Date("2026-08-03T12:00:00.000Z");
    let now = t0;
    const metrics = createInMemoryIngestMetrics();
    const buffer = createAnalyticsIngestBuffer({
      sink: createUnavailableMongoSink("mongo_down"),
      metrics,
      now: () => now,
      maxAttempts: 2,
    });

    buffer.enqueue(sampleRecord({ eventId: "dom-1", ingestClass: "domain_mirror" }));
    buffer.enqueue(
      sampleRecord({
        eventId: "track-1",
        eventType: "FeatureUsed",
        ingestClass: "best_effort_track",
      }),
    );

    await buffer.flush(now);
    expect(buffer.depth()).toBe(2);

    now = new Date(t0.getTime() + 24 * 60 * 60 * 1000);
    const finalFlush = await buffer.flush(now);
    expect(finalFlush.deadLetter).toBe(1);
    expect(finalFlush.dropped).toBe(1);
    expect(buffer.depth()).toBe(0);

    const dls = buffer.listDeadLetters();
    expect(dls).toHaveLength(2);
    expect(dls.find((d) => d.record.eventId === "dom-1")?.disposition).toBe(
      "dead_letter",
    );
    expect(dls.find((d) => d.record.eventId === "track-1")?.disposition).toBe(
      "dropped",
    );

    const snap = metrics.snapshot();
    expect(snap.deadLetter).toBe(1);
    expect(snap.dropped).toBe(1);
    expect(snap.mongoUnavailable).toBeGreaterThanOrEqual(2);
  });

  it("delivers when sink recovers", async () => {
    const written: string[] = [];
    let fail = true;
    const sink: AnalyticsIngestSink = {
      async write(record) {
        if (fail) {
          throw new Error("transient");
        }
        written.push(record.eventId);
      },
    };
    const t0 = new Date("2026-08-03T12:00:00.000Z");
    let now = t0;
    const buffer = createAnalyticsIngestBuffer({
      sink,
      now: () => now,
      maxAttempts: 5,
    });

    buffer.enqueue(sampleRecord({ eventId: "evt-recover" }));
    await buffer.flush(now);
    expect(written).toEqual([]);
    expect(buffer.depth()).toBe(1);

    fail = false;
    now = new Date(t0.getTime() + 60_000);
    const result = await buffer.flush(now);
    expect(result.delivered).toBe(1);
    expect(written).toEqual(["evt-recover"]);
    expect(buffer.depth()).toBe(0);
  });

  it("keeps SaleCompleted / after-sale enqueue successful when Mongo is down", async () => {
    const metrics = createInMemoryIngestMetrics();
    const buffer = createAnalyticsIngestBuffer({
      sink: createUnavailableMongoSink(),
      metrics,
    });
    const ingest = createIsolatingAnalyticsIngestPort(buffer, metrics);
    const afterSale = createAnalyticsAfterSalePort(ingest, metrics);

    await expect(
      afterSale.enqueueSaleCompleted({
        eventId: "sale-evt-1",
        saleId: "sale-1",
        merchantId: "m-1",
        storeId: "s-1",
        occurredAt: new Date("2026-08-03T12:00:00.000Z"),
        payload: { totalAmountMinor: "1000" },
      }),
    ).resolves.toBeUndefined();

    expect(buffer.depth()).toBe(1);
    expect(buffer.listPending()[0]?.record.eventType).toBe("SaleCompleted");
    expect(metrics.snapshot().salePathProtected).toBeGreaterThanOrEqual(1);
    expect(metrics.snapshot().enqueued).toBe(1);

    // Flush must not throw to the sale caller either.
    await expect(buffer.flush()).resolves.toMatchObject({ delivered: 0 });
  });

  it("exposes metric names and Persian ops stubs (no cashier UX)", () => {
    expect(INGEST_METRIC_NAMES.mongoUnavailable).toBe(
      "analytics_ingest_mongo_unavailable_total",
    );
    expect(INGEST_METRIC_NAMES.deadLetter).toContain("dead_letter");
    expect(INGEST_ISOLATION_UX_FA.locale).toBe("fa-IR");
    expect(INGEST_ISOLATION_UX_FA.dir).toBe("rtl");
    expect(INGEST_ISOLATION_UX_FA.cashiersNeverBlockedByTelemetry).toMatch(
      /فروش/,
    );
    expect(
      ANALYTICS_INGEST_ISOLATION_REQUIREMENTS.neverFailCompleteSaleWhenMongoDown,
    ).toBe(true);
  });
});
