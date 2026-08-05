/**
 * ADR-110 — Mongo analytics runtime acceptance tests.
 *
 * Mock path: MOS_MONGO_MODE=memory (always).
 * Live path: Compose MONGODB_URL when ping succeeds; otherwise skip.
 */

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import {
  createAnalyticsAfterSalePort,
  createAnalyticsIngestBuffer,
  createInMemoryIngestMetrics,
  createIsolatingAnalyticsIngestPort,
  ISOLATED_INGEST_PATHS,
} from "../../analytics-ingest-isolation/index.js";
import { createEventEnvelope } from "../../event-driven/index.js";
import { MONGO_COLLECTIONS } from "../../mongodb-analytics/index.js";
import { MONGO_TTL_TABLE } from "../../data-retention/index.js";
import type { OutboxMessage } from "../../outbox/index.js";
import { handleTelemetryBeacon } from "../http/handlers/telemetry.js";
import { pingMongoFromEnv } from "./client.js";
import {
  createMongoRuntime,
  setMongoRuntimeForTests,
  type MongoRuntime,
} from "./create-mongo-runtime.js";
import { listTtlIndexes } from "./ensure-indexes.js";

const LIVE_URL =
  process.env.MONGODB_URL?.trim() ||
  "mongodb://merchantos:merchantos@localhost:27017/merchantos_analytics?authSource=admin";

function saleOutboxMessage(eventId: string): OutboxMessage {
  const envelope = createEventEnvelope({
    eventType: "SaleCompleted",
    merchantId: "m-sale-1",
    storeId: "s-1",
    eventId,
    payload: { saleId: "sale-1", totalToman: 120_000, note: "فروش تست" },
  });
  return {
    id: randomUUID(),
    eventId: envelope.eventId,
    eventType: envelope.eventType,
    merchantId: envelope.merchantId,
    storeId: envelope.storeId,
    aggregateId: "sale-1",
    aggregateType: "sale",
    envelope,
    payloadVersion: envelope.payloadVersion,
    correlationId: envelope.correlationId,
    causationId: envelope.causationId,
    occurredAt: new Date(envelope.occurredAt),
    createdAt: new Date(),
    publishedAt: null,
    attemptCount: 0,
    lastError: null,
  };
}

describe("ADR-110 Mongo analytics runtime (memory)", () => {
  it("createMongoRuntime uses memory when MOS_MONGO_MODE=memory", () => {
    const runtime = createMongoRuntime({
      MOS_MONGO_MODE: "memory",
    });
    expect(runtime.mode).toBe("memory");
  });

  it("mirrors SaleCompleted into warehouse collection (memory)", async () => {
    const runtime = createMongoRuntime({ MOS_MONGO_MODE: "memory" });
    const eventId = randomUUID();
    await runtime.warehouseHandler(saleOutboxMessage(eventId));
    const doc = await runtime.warehouseStore.findByEventId(eventId);
    expect(doc?.eventType).toBe("SaleCompleted");
    expect(doc?.merchantId).toBe("m-sale-1");
    expect(doc?.payload.note).toBe("فروش تست");
    expect(MONGO_COLLECTIONS.events).toBe("mos_events");
  });

  it("POS / CompleteSale path succeeds when Mongo sink throws", async () => {
    expect(ISOLATED_INGEST_PATHS.completeSale.failOpenWhenMongoDown).toBe(true);

    const metrics = createInMemoryIngestMetrics();
    const buffer = createAnalyticsIngestBuffer({
      sink: {
        async write() {
          throw new Error("mongodb_unavailable");
        },
      },
      metrics,
    });
    const ingest = createIsolatingAnalyticsIngestPort(buffer, metrics);
    const afterSale = createAnalyticsAfterSalePort(ingest, metrics);

    await expect(
      afterSale.enqueueSaleCompleted({
        eventId: randomUUID(),
        saleId: "sale-down",
        merchantId: "m-1",
        storeId: "s-1",
        occurredAt: new Date(),
        payload: { ok: true },
        correlationId: randomUUID(),
      }),
    ).resolves.toBeUndefined();

    await expect(buffer.flush()).resolves.toBeDefined();
  });

  it("creates audit record for merchant.suspend", async () => {
    const runtime = createMongoRuntime({ MOS_MONGO_MODE: "memory" });
    const eventId = randomUUID();
    const result = await runtime.auditPort.record({
      eventId,
      action: "merchant.suspend",
      entityType: "merchant",
      entityId: "m-2",
      merchantId: "m-2",
      actorId: "admin-1",
      actorRole: "platform_admin",
      correlationId: randomUUID(),
      result: "success",
      after: { status: "suspended", phone: "09121234567" },
    });
    expect(result.status).toBe("inserted");
    const doc = await runtime.auditStore.findByEventId(eventId);
    expect(doc?.action).toBe("merchant.suspend");
    expect(JSON.stringify(doc?.after)).toMatch(/phone_redacted|phone_hash/);
  });

  it("QR land beacon includes source=qr", async () => {
    const runtime = createMongoRuntime({ MOS_MONGO_MODE: "memory" });
    const eventId = randomUUID();
    const result = await handleTelemetryBeacon(
      {
        method: "POST",
        url: "http://localhost/api/v1/telemetry/beacon",
        headers: new Headers({
          "content-type": "application/json",
          "content-length": "200",
        }),
        json: async () => ({
          events: [
            {
              eventId,
              eventType: "StorefrontVisited",
              merchantId: "m-qr",
              storeId: "s-qr",
              source: "qr",
              funnelCritical: true,
              properties: { acquisitionSource: "qr" },
            },
          ],
        }),
        text: async () => "",
      },
      runtime,
    );
    expect(result.status).toBe(202);
    const body = result.body as { data?: { accepted?: number } };
    expect(body.data?.accepted).toBeGreaterThanOrEqual(1);
    const stored = await runtime.clickstreamStore.findByEventId(eventId);
    expect(stored?.source).toBe("qr");
  });

  it("rejects oversized clickstream payloads", async () => {
    const runtime = createMongoRuntime({ MOS_MONGO_MODE: "memory" });
    const result = await handleTelemetryBeacon(
      {
        method: "POST",
        url: "http://localhost/api/v1/telemetry/beacon",
        headers: new Headers({
          "content-type": "application/json",
          "content-length": String(128 * 1024),
        }),
        json: async () => ({ events: [] }),
        text: async () => "",
      },
      runtime,
    );
    expect(result.status).toBe(413);
    const err = result.body as { error?: { message?: string } };
    expect(err.error?.message).toMatch(/حجم|حد مجاز/);
  });

  it("documents TTL table seconds for retention collections", () => {
    expect(MONGO_TTL_TABLE.warehouse.collection).toBe("mos_events");
    expect(MONGO_TTL_TABLE.audit.collection).toBe("mos_audit");
    expect(MONGO_TTL_TABLE.clickstream.collection).toBe("mos_behavior");
    expect(MONGO_TTL_TABLE.sessions.collection).toBe("mos_sessions");
    expect(MONGO_TTL_TABLE.warehouse.expireAfterSecondsDefault).toBeGreaterThan(
      0,
    );
  });
});

describe("ADR-110 Mongo analytics runtime (live Compose)", () => {
  let runtime: MongoRuntime | null = null;
  let live = false;

  it("connects when Compose Mongo is available", async () => {
    live = await pingMongoFromEnv({ MONGODB_URL: LIVE_URL });
    if (!live) {
      console.warn(
        "[ADR-110] Compose Mongo not reachable — skipping live assertions",
      );
      return;
    }
    runtime = createMongoRuntime({
      MONGODB_URL: LIVE_URL,
    });
    await runtime.ready;
    expect(runtime.mode).toBe("mongo");
  });

  it("ensures TTL indexes on retention collections", async () => {
    if (!live || !runtime?.client) return;
    await runtime.ready;
    const dbName =
      new URL(LIVE_URL).pathname.replace(/^\//, "") || "merchantos_analytics";
    const ttl = await listTtlIndexes(runtime.client.db(dbName));
    const collections = new Set(ttl.map((t) => t.collection));
    expect(collections.has("mos_events")).toBe(true);
    expect(collections.has("mos_audit")).toBe(true);
    expect(collections.has("mos_behavior")).toBe(true);
    expect(collections.has("mos_sessions")).toBe(true);
    expect(ttl.every((t) => t.expireAfterSeconds > 0)).toBe(true);
  });

  it("mirrors SaleCompleted into live mos_events", async () => {
    if (!live || !runtime) return;
    await runtime.ready;
    const eventId = `live-sale-${randomUUID()}`;
    await runtime.warehouseHandler(saleOutboxMessage(eventId));
    const doc = await runtime.warehouseStore.findByEventId(eventId);
    expect(doc?.eventType).toBe("SaleCompleted");
  });

  afterAll(async () => {
    setMongoRuntimeForTests(null);
    if (runtime?.client) {
      await runtime.client.close().catch(() => undefined);
    }
  });
});
