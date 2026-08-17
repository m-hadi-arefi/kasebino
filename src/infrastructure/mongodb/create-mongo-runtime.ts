/**
 * ADR-110 — compose Mongo analytics runtime from MONGODB_URL.
 *
 * Live path: Compose `MONGODB_URL` (host: mongodb://…@localhost:27017/…).
 * Mock path: MOS_MONGO_MODE=memory → in-memory stores (unit tests / offline CI).
 *
 * Mongo is analytics/audit plane ONLY — never OLTP SoT.
 */

import {
  createAdminAuditPortStub,
  type AdminAuditStub,
} from "../../modules/admin/infrastructure/audit/audit-port-stub.js";
import {
  createAnalyticsIngestBuffer,
  createInMemoryIngestMetrics,
  createIsolatingAnalyticsIngestPort,
  type AnalyticsIngestBuffer,
} from "./contracts/ingest-isolation/index.js";
import {
  createAuditPort,
  createInMemoryAuditMetrics,
  InMemoryAuditStore,
  type AuditPort,
  type AuditStore,
} from "../security/contracts/audit-logging/index.js";
import {
  createClickstreamSink,
  createInMemoryClickstreamMetrics,
  createTrackClickstreamPort,
  InMemoryClickstreamStore,
  type ClickstreamStore,
  type TrackClickstreamPort,
} from "./clickstream/index.js";
import {
  createInMemoryWarehouseMetrics,
  createWarehouseOutboxHandler,
  InMemoryEventWarehouseStore,
  type EventWarehouseStore,
  type WarehouseMetrics,
} from "../../events/contracts/event-warehouse/index.js";
import {
  createInMemoryProductAnalyticsMetrics,
  createProductAnalyticsSink,
  createTrackEventPort,
  InMemoryProductAnalyticsStore,
  type ProductAnalyticsStore,
  type TrackEventPort,
} from "../../modules/analytics/domain/product/index.js";
import {
  createInMemorySessionMetrics,
  createSessionSink,
  createTrackSessionPort,
  InMemorySessionStore,
  type SessionStore,
  type TrackSessionPort,
} from "../../modules/analytics/domain/session/index.js";
import { CONNECTION } from "./contracts/analytics/index.js";
import type { OutboxDispatchHandler } from "../../events/outbox/index.js";

import {
  createMongoClientConnecting,
  createMongodbConfigFromEnv,
  type MerchantOsMongoClient,
} from "./client.js";
import { ensureAnalyticsIndexes } from "./ensure-indexes.js";
import { MongodbAuditStore } from "./mongodb-audit-store.js";
import { MongodbClickstreamStore } from "./mongodb-clickstream-store.js";
import { MongodbEventWarehouseStore } from "./mongodb-event-warehouse-store.js";
import { MongodbProductAnalyticsStore } from "./mongodb-product-analytics-store.js";
import { MongodbSessionStore } from "./mongodb-session-store.js";

export type MongoRuntimeMode = "mongo" | "memory";

export type MongoRuntime = {
  mode: MongoRuntimeMode;
  warehouseStore: EventWarehouseStore;
  auditStore: AuditStore;
  auditPort: AuditPort;
  clickstreamStore: ClickstreamStore;
  productStore: ProductAnalyticsStore;
  sessionStore: SessionStore;
  trackClickstream: TrackClickstreamPort;
  trackProduct: TrackEventPort;
  trackSession: TrackSessionPort;
  /** Flush buffered clickstream / product / session ingest (tests + beacons). */
  flushBeacons: () => Promise<void>;
  warehouseHandler: OutboxDispatchHandler;
  warehouseMetrics: WarehouseMetrics;
  /** Present when mode === "mongo". */
  client?: MerchantOsMongoClient;
  /** Resolves when Mongo CONNECT + indexes completed (or immediately for memory). */
  ready: Promise<void>;
};

function wantsMemoryMode(env: NodeJS.ProcessEnv): boolean {
  const mode = env.MOS_MONGO_MODE?.trim().toLowerCase();
  return mode === "memory" || mode === "mock";
}

function wireTrackers(input: {
  clickstreamStore: ClickstreamStore;
  productStore: ProductAnalyticsStore;
  sessionStore: SessionStore;
}): {
  trackClickstream: TrackClickstreamPort;
  trackProduct: TrackEventPort;
  trackSession: TrackSessionPort;
  buffers: AnalyticsIngestBuffer[];
} {
  const clickMetrics = createInMemoryClickstreamMetrics();
  const productMetrics = createInMemoryProductAnalyticsMetrics();
  const sessionMetrics = createInMemorySessionMetrics();
  const clickIngestMetrics = createInMemoryIngestMetrics();
  const productIngestMetrics = createInMemoryIngestMetrics();
  const sessionIngestMetrics = createInMemoryIngestMetrics();

  const clickBuffer = createAnalyticsIngestBuffer({
    sink: createClickstreamSink(input.clickstreamStore, clickMetrics),
    metrics: clickIngestMetrics,
  });
  const productBuffer = createAnalyticsIngestBuffer({
    sink: createProductAnalyticsSink(input.productStore, productMetrics),
    metrics: productIngestMetrics,
  });
  const sessionBuffer = createAnalyticsIngestBuffer({
    sink: createSessionSink(input.sessionStore, sessionMetrics),
    metrics: sessionIngestMetrics,
  });

  return {
    trackClickstream: createTrackClickstreamPort({
      ingest: createIsolatingAnalyticsIngestPort(
        clickBuffer,
        clickIngestMetrics,
      ),
      metrics: clickMetrics,
    }),
    trackProduct: createTrackEventPort({
      ingest: createIsolatingAnalyticsIngestPort(
        productBuffer,
        productIngestMetrics,
      ),
      metrics: productMetrics,
    }),
    trackSession: createTrackSessionPort({
      ingest: createIsolatingAnalyticsIngestPort(
        sessionBuffer,
        sessionIngestMetrics,
      ),
      store: input.sessionStore,
      metrics: sessionMetrics,
    }),
    buffers: [clickBuffer, productBuffer, sessionBuffer],
  };
}

function buildRuntimeFromStores(input: {
  mode: MongoRuntimeMode;
  warehouseStore: EventWarehouseStore;
  auditStore: AuditStore;
  auditPort: AuditPort;
  clickstreamStore: ClickstreamStore;
  productStore: ProductAnalyticsStore;
  sessionStore: SessionStore;
  ready: Promise<void>;
  client?: MerchantOsMongoClient;
}): MongoRuntime {
  const trackers = wireTrackers({
    clickstreamStore: input.clickstreamStore,
    productStore: input.productStore,
    sessionStore: input.sessionStore,
  });
  const warehouseMetrics = createInMemoryWarehouseMetrics();

  return {
    mode: input.mode,
    warehouseStore: input.warehouseStore,
    auditStore: input.auditStore,
    auditPort: input.auditPort,
    clickstreamStore: input.clickstreamStore,
    productStore: input.productStore,
    sessionStore: input.sessionStore,
    trackClickstream: trackers.trackClickstream,
    trackProduct: trackers.trackProduct,
    trackSession: trackers.trackSession,
    flushBeacons: async () => {
      for (const buffer of trackers.buffers) {
        await buffer.flush();
      }
    },
    warehouseHandler: createWarehouseOutboxHandler({
      store: input.warehouseStore,
      metrics: warehouseMetrics,
    }),
    warehouseMetrics,
    ...(input.client ? { client: input.client } : {}),
    ready: input.ready,
  };
}

function buildMemoryRuntime(): MongoRuntime {
  const warehouseStore = new InMemoryEventWarehouseStore();
  const auditStore = new InMemoryAuditStore();
  const auditPort = createAuditPort({
    store: auditStore,
    metrics: createInMemoryAuditMetrics(),
  });
  return buildRuntimeFromStores({
    mode: "memory",
    warehouseStore,
    auditStore,
    auditPort,
    clickstreamStore: new InMemoryClickstreamStore(),
    productStore: new InMemoryProductAnalyticsStore(),
    sessionStore: new InMemorySessionStore(),
    ready: Promise.resolve(),
  });
}

/**
 * Build analytics Mongo runtime.
 * - MOS_MONGO_MODE=memory|mock → in-memory (documented mock path)
 * - else requires MONGODB_URL → live Mongo adapters (Compose)
 */
export function createMongoRuntime(
  env: NodeJS.ProcessEnv = process.env,
): MongoRuntime {
  if (wantsMemoryMode(env) || !env[CONNECTION.envVar]?.trim()) {
    return buildMemoryRuntime();
  }

  const config = createMongodbConfigFromEnv(env);
  const { client, db, ready: connectReady } = createMongoClientConnecting(
    config.url,
  );

  const ready = connectReady.then(async () => {
    await ensureAnalyticsIndexes(db);
  });

  const auditStore = new MongodbAuditStore(db, ready);
  const auditBundle: AdminAuditStub = createAdminAuditPortStub(auditStore);

  return buildRuntimeFromStores({
    mode: "mongo",
    warehouseStore: new MongodbEventWarehouseStore(db, ready),
    auditStore,
    auditPort: auditBundle.port,
    clickstreamStore: new MongodbClickstreamStore(db, ready),
    productStore: new MongodbProductAnalyticsStore(db, ready),
    sessionStore: new MongodbSessionStore(db, ready),
    ready,
    client,
  });
}

/** Resolve mode without connecting. */
export function resolveMongoRuntimeMode(
  env: NodeJS.ProcessEnv = process.env,
): MongoRuntimeMode {
  if (wantsMemoryMode(env) || !env[CONNECTION.envVar]?.trim()) {
    return "memory";
  }
  return "mongo";
}

/** Process-local singleton for App Router / worker (tests may reset). */
let singleton: MongoRuntime | null = null;

export function getMongoRuntime(
  env: NodeJS.ProcessEnv = process.env,
): MongoRuntime {
  if (!singleton) {
    singleton = createMongoRuntime(env);
  }
  return singleton;
}

export function setMongoRuntimeForTests(runtime: MongoRuntime | null): void {
  singleton = runtime;
}
