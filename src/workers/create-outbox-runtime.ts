/**
 * ADR-109 — outbox worker runtime composition.
 * Wires Drizzle outbox + EMQX publish + cache/notifications/warehouse consumers
 * and pickup/loyalty scheduled job ports.
 */

import type { CacheAsideStorePort } from "../cache-aside/port.js";
import {
  invalidateOnEvent,
  type InvalidateOnEventInput,
} from "../cache-invalidation/index.js";
import {
  createEmqxOutboxHandler,
  InMemoryMqttBroker,
  type EmqxPublishPort,
} from "../emqx-realtime/index.js";
import { createWarehouseOutboxHandler } from "../event-warehouse/index.js";
import {
  resolveMqttRuntimeMode,
  type MqttRuntimeMode,
} from "../infrastructure/emqx/client.js";
import { MqttJsEmqxPublisher } from "../infrastructure/emqx/mqtt-publisher.js";
import { DrizzleDeadLetterStore } from "../infrastructure/persistence/index.js";
import {
  createProductionRepositories,
  type ProductionRepositories,
} from "../infrastructure/composition/index.js";
import { createRedisRuntime } from "../infrastructure/redis/index.js";
import { getMongoRuntime } from "../infrastructure/mongodb/index.js";
import {
  createReceiptRenderOutboxHandler,
  getMinioRuntime,
} from "../infrastructure/minio/index.js";
import {
  createLoyaltyUseCases,
  runLoyaltyPointsExpiryJob,
} from "../modules/loyalty/application/use-cases.js";
import { createNotificationsOutboxHandler } from "../modules/notifications/application/outbox-handler.js";
import { createNotificationsUseCases } from "../modules/notifications/application/use-cases.js";
import { PersistInAppNotificationChannel } from "../modules/notifications/infrastructure/channels/persist-in-app-channel.js";
import { createOrderingUseCases } from "../modules/ordering/application/use-cases.js";
import {
  createAccountingOutboxHandler,
  createAccountingProvider,
} from "../modules/accounting/index.js";
import {
  createOutboxWorker,
  InMemoryDeadLetterStore,
  InMemoryOutboxStore,
  InMemoryProcessedSet,
  runScheduledJob,
  type DeadLetterStore,
  type OutboxConsumerHandlers,
  type OutboxStore,
  type OutboxWorkerMetrics,
  type ProcessedSet,
  type ScheduledJobName,
  type ScheduledJobPorts,
  type ScheduledJobRunResult,
} from "../outbox/index.js";

export type OutboxWorkerRuntimeOptions = {
  env?: NodeJS.ProcessEnv;
  /** Inject broker (tests); otherwise MOS_MQTT_MODE / MQTT_URL. */
  broker?: EmqxPublishPort;
  mqttMode?: MqttRuntimeMode;
  mosEnv?: string;
  repos?: ProductionRepositories;
  /** When set, skip production repos (unit tests). */
  store?: OutboxStore;
  processed?: ProcessedSet;
  cache?: CacheAsideStorePort;
  deadLetter?: DeadLetterStore;
  metrics?: OutboxWorkerMetrics;
  now?: () => Date;
  /** Skip warehouse consumer (default: wired via Mongo runtime ADR-110). */
  enableWarehouse?: boolean;
  /** Inject warehouse handler (tests). */
  warehouseHandler?: OutboxConsumerHandlers["mongodb_warehouse"];
  /** Use in-memory outbox stacks (no DATABASE_URL). */
  inMemory?: boolean;
  scheduledJobPorts?: ScheduledJobPorts;
};

export type OutboxWorkerRuntime = {
  broker: EmqxPublishPort;
  mqttMode: MqttRuntimeMode;
  metrics: OutboxWorkerMetrics;
  collectingMetrics: CollectingOutboxMetrics;
  worker: ReturnType<typeof createOutboxWorker>;
  store: OutboxStore;
  processed: ProcessedSet;
  deadLetter: DeadLetterStore;
  scheduledJobPorts: ScheduledJobPorts;
  dispatchOnce: () => ReturnType<
    ReturnType<typeof createOutboxWorker>["dispatchOnce"]
  >;
  runJob: (jobName: ScheduledJobName) => Promise<ScheduledJobRunResult>;
  runAllScheduledJobs: () => Promise<ScheduledJobRunResult[]>;
  close: () => Promise<void>;
};

export class CollectingOutboxMetrics implements OutboxWorkerMetrics {
  lagSamples: number[] = [];
  published = 0;
  failed = 0;
  deadLetter = 0;
  jobs: Array<{ jobName: string; affected: number }> = [];

  recordLagMs(lagMs: number): void {
    this.lagSamples.push(lagMs);
  }
  recordPublished(count = 1): void {
    this.published += count;
  }
  recordFailed(count = 1): void {
    this.failed += count;
  }
  recordDeadLetter(count = 1): void {
    this.deadLetter += count;
  }
  recordJobRun(jobName: string, affected: number): void {
    this.jobs.push({ jobName, affected });
  }
}

function payloadField(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" ? value : undefined;
}

function invalidationInputFromMessage(
  message: {
    eventType: string;
    merchantId: string;
    storeId: string | null;
    aggregateId: string | null;
    envelope: { payload: Record<string, unknown> };
  },
  env: string,
): InvalidateOnEventInput {
  const payload = message.envelope.payload;
  const merchantId = message.merchantId;
  const productId =
    payloadField(payload, "productId") ?? message.aggregateId ?? undefined;
  const barcode = payloadField(payload, "barcode");
  const storeId =
    payloadField(payload, "storeId") ?? message.storeId ?? undefined;

  if (
    message.eventType === "ProductUpdated" ||
    message.eventType === "ProductCreated" ||
    message.eventType === "ProductDeleted"
  ) {
    return {
      env,
      eventType: message.eventType,
      payload: {
        merchantId,
        productId: productId ?? "",
        ...(barcode !== undefined ? { barcode } : {}),
      },
    };
  }
  if (message.eventType === "InventoryChanged" && storeId && productId) {
    return {
      env,
      eventType: "InventoryChanged",
      payload: { merchantId, storeId, productId },
    };
  }
  if (message.eventType === "SaleCompleted" && storeId) {
    return {
      env,
      eventType: "SaleCompleted",
      payload: { merchantId, storeId },
    };
  }
  if (message.eventType === "StoreUpdated" && storeId) {
    return {
      env,
      eventType: "StoreUpdated",
      payload: { merchantId, storeId },
    };
  }
  return {
    env,
    eventType: message.eventType,
    payload: { merchantId },
  };
}

export function createOutboxWorkerRuntime(
  options: OutboxWorkerRuntimeOptions = {},
): OutboxWorkerRuntime {
  const env = options.env ?? process.env;
  const mosEnv = options.mosEnv ?? (env.MOS_ENV?.trim() || "local");
  const mqttMode = options.mqttMode ?? resolveMqttRuntimeMode(env);
  const collectingMetrics = new CollectingOutboxMetrics();
  const metrics: OutboxWorkerMetrics = options.metrics ?? collectingMetrics;

  const inMemory = options.inMemory === true || Boolean(options.store);

  let store: OutboxStore;
  let processed: ProcessedSet;
  let deadLetter: DeadLetterStore;
  let repos: ProductionRepositories | null = null;

  if (inMemory) {
    store = options.store ?? new InMemoryOutboxStore();
    processed = options.processed ?? new InMemoryProcessedSet();
    deadLetter = options.deadLetter ?? new InMemoryDeadLetterStore();
  } else {
    repos = options.repos ?? createProductionRepositories(env);
    store = repos.outbox;
    processed = repos.processedEvents;
    deadLetter = options.deadLetter ?? new DrizzleDeadLetterStore(repos.db);
  }

  const redis = createRedisRuntime(env);
  const cache = options.cache ?? redis.cacheStore;

  let broker: EmqxPublishPort;
  let mqttPublisher: MqttJsEmqxPublisher | null = null;
  if (options.broker) {
    broker = options.broker;
  } else if (mqttMode === "memory") {
    broker = new InMemoryMqttBroker();
  } else {
    mqttPublisher = MqttJsEmqxPublisher.fromEnv(env, {
      clientId: `mos-outbox-worker-${process.pid}`,
    });
    broker = mqttPublisher;
  }

  const handlers: OutboxConsumerHandlers = {
    emqx_realtime: createEmqxOutboxHandler({ broker, env: mosEnv }),
    cache_invalidation: async (message) => {
      await invalidateOnEvent(
        cache,
        invalidationInputFromMessage(message, mosEnv),
      );
    },
  };

  if (repos) {
    const notifications = createNotificationsUseCases({
      notifications: repos.notifications,
      inAppChannel: new PersistInAppNotificationChannel(repos.notifications),
    });
    handlers.notifications = createNotificationsOutboxHandler({
      useCases: notifications,
    });
    const minio = getMinioRuntime(env);
    handlers.minio_receipts = createReceiptRenderOutboxHandler({
      sales: repos.sales,
      stores: repos.stores,
      objectStorage: minio.storage,
    });
    const accountingProvider = createAccountingProvider(env);
    handlers.accounting_integration = createAccountingOutboxHandler({
      provider: accountingProvider,
      mappings: repos.externalEntityMappings,
      syncRecords: repos.erpnextSyncRecords,
    });
  }

  if (options.enableWarehouse !== false) {
    const mongo = getMongoRuntime(env);
    handlers.mongodb_warehouse =
      options.warehouseHandler ??
      createWarehouseOutboxHandler({
        store: mongo.warehouseStore,
        metrics: mongo.warehouseMetrics,
      });
  }

  const worker = createOutboxWorker({
    store,
    processed,
    handlers,
    deadLetter,
    metrics,
    ...(options.now ? { now: options.now } : {}),
  });

  let scheduledJobPorts: ScheduledJobPorts;
  if (options.scheduledJobPorts) {
    scheduledJobPorts = {
      ...options.scheduledJobPorts,
      metrics,
      ...(options.now ? { now: options.now } : {}),
    };
  } else if (repos) {
    const loyalty = createLoyaltyUseCases({
      wallets: repos.wallets,
      rules: repos.pointRules,
      ledger: repos.pointsLedger,
    });
    const ordering = createOrderingUseCases({
      orders: repos.orders,
    });
    scheduledJobPorts = {
      ordering: {
        cancelUnpaidExpiredOrders: (opts) =>
          ordering.cancelUnpaidExpiredOrders(opts),
        expireReadyForPickupHolds: (opts) =>
          ordering.expireReadyForPickupHolds(opts),
      },
      runLoyaltyExpiry: async (input) => {
        const result = await runLoyaltyPointsExpiryJob({
          loyalty,
          outbox: store,
          ...(input.now ? { now: input.now } : {}),
          ...(input.limit !== undefined ? { limit: input.limit } : {}),
        });
        return { expiredCount: result.expiredCount };
      },
      metrics,
      ...(options.now ? { now: options.now } : {}),
    };
  } else {
    scheduledJobPorts = {
      metrics,
      ...(options.now ? { now: options.now } : {}),
    };
  }

  return {
    broker,
    mqttMode,
    metrics,
    collectingMetrics,
    worker,
    store,
    processed,
    deadLetter,
    scheduledJobPorts,
    dispatchOnce: () => worker.dispatchOnce(),
    runJob: (jobName) => runScheduledJob(jobName, scheduledJobPorts),
    runAllScheduledJobs: async () => {
      const names: ScheduledJobName[] = [
        "pickup_unpaid_cancel",
        "pickup_ready_hold_cancel",
        "loyalty_points_expiry",
      ];
      const results: ScheduledJobRunResult[] = [];
      for (const name of names) {
        results.push(await runScheduledJob(name, scheduledJobPorts));
      }
      return results;
    },
    close: async () => {
      if (mqttPublisher) await mqttPublisher.close();
    },
  };
}
