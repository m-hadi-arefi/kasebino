/**
 * ADR-065 — Analytics Ingest Failure Isolation.
 *
 * After OLTP commit, analytics/audit ingest is fire-and-forget via an
 * in-process buffer/queue. CompleteSale / SaleCompleted must succeed when
 * Mongo is down. Domain event durability still prefers PG outbox
 * (`mongodb_warehouse` → `src/events/contracts/event-warehouse` ADR-057); track/best-effort
 * paths may drop after retries. Metrics expose enqueue / retry / drop / DLQ /
 * mongo-unavailable.
 *
 * Normative: ADR-065 Decision, docs/architecture/mongodb-architecture.md
 * (async failure-isolated ingest), docs/architecture/event-warehouse-architecture.md.
 */

import {
  ANALYTICS_CRITICAL_PATH,
  DELIVERY_GUARANTEES,
  OUTBOX_CONSUMERS,
} from "../../../../events/contracts/event-driven/index.js";

/** ADR-065 Decision — binding failure-isolation stance. */
export const ANALYTICS_INGEST_ISOLATION_DECISION = {
  adr: "ADR-065",
  pattern: "fire_and_forget_buffer_queue" as const,
  afterOltpCommitOnly: true,
  posSuccessIndependentOfMongo: true,
  saleCompletedMustNotFailWhenMongoDown: true,
  completeSaleMustNotAwaitMongo: true,
  syncMongoWriteInCompleteSaleTxForbidden: true,
  preferOutboxForDomainEvents: true,
  outboxConsumer: "mongodb_warehouse" as const,
  trackApiMayAcceptAndBuffer: true,
  trackAcceptedHttpSemantics: 202 as const,
  warehouseDriverDeferredTo: null,
  warehousePackage: "src/events/contracts/event-warehouse/",
  warehouseAdr: "ADR-057",
  architecturePackage: "src/infrastructure/mongodb/contracts/ingest-isolation/",
  mongodbPlanePackage: "src/infrastructure/mongodb/contracts/analytics/",
  eventDrivenPackage: "src/events/contracts/event-driven/",
  outboxPackage: "src/events/outbox/",
  architectureDocs: [
    "docs/architecture/mongodb-architecture.md",
    "docs/architecture/event-warehouse-architecture.md",
  ] as const,
} as const;

/**
 * Paths that must stay isolated from Mongo availability.
 * Sale path is sacred (PA-09 / checkout reliability).
 */
export const ISOLATED_INGEST_PATHS = {
  completeSale: {
    name: "CompleteSale",
    onCriticalPath: false,
    failOpenWhenMongoDown: true,
    enqueueAfterOltpPersist: true,
  },
  saleCompleted: {
    name: "SaleCompleted",
    onCriticalPath: false,
    failOpenWhenMongoDown: true,
    preferOutbox: true,
  },
  trackIngest: {
    name: "AnalyticsTrack",
    onCriticalPath: false,
    failOpenWhenMongoDown: true,
    mayReturnAcceptedAndBuffer: true,
  },
  auditIngest: {
    name: "AuditIngest",
    onCriticalPath: false,
    failOpenWhenMongoDown: true,
    preferOutboxOrBuffer: true,
  },
} as const;

/**
 * Retry / drop policy.
 * Domain mirrors: at-least-once via PG outbox then dead-letter (ADR-035/036).
 * Best-effort track: retry then drop from hot buffer (telemetry delay OK).
 */
export const INGEST_RETRY_POLICY = {
  maxAttempts: DELIVERY_GUARANTEES.maxRetries,
  backoffMs: DELIVERY_GUARANTEES.retryBackoffSeconds.map((s) => s * 1000),
  domainEvents: {
    durability: "postgresql_outbox_at_least_once" as const,
    afterMaxAttempts: "dead_letter" as const,
    neverRollBackCompletedSale: true,
  },
  bestEffortTrack: {
    durability: "in_process_buffer" as const,
    afterMaxAttempts: "dropped" as const,
    acceptLossAfterRetries: true,
  },
  poison: {
    afterMaxAttempts: "dead_letter" as const,
    removeFromHotQueue: true,
  },
} as const;

export type IngestClass = "domain_mirror" | "best_effort_track" | "audit";

export type IngestDisposition =
  | "delivered"
  | "queued"
  | "retried"
  | "dead_letter"
  | "dropped";

/** Metric names for ingest failure modes (ADR-065 Operational Requirements). */
export const INGEST_METRIC_NAMES = {
  enqueued: "analytics_ingest_enqueued_total",
  accepted: "analytics_ingest_accepted_total",
  delivered: "analytics_ingest_delivered_total",
  retried: "analytics_ingest_retried_total",
  dropped: "analytics_ingest_dropped_total",
  deadLetter: "analytics_ingest_dead_letter_total",
  mongoUnavailable: "analytics_ingest_mongo_unavailable_total",
  bufferDepth: "analytics_ingest_buffer_depth",
  salePathProtected: "analytics_ingest_sale_path_protected_total",
} as const;

export type IngestMetricName =
  (typeof INGEST_METRIC_NAMES)[keyof typeof INGEST_METRIC_NAMES];

/**
 * Iranian First — ops-facing stubs for future DLQ / ingest health surfaces.
 * No merchant/customer UX this ADR; cashiers must never see Mongo failures.
 */
export const INGEST_ISOLATION_UX_FA = {
  locale: "fa-IR",
  dir: "rtl",
  cashiersNeverBlockedByTelemetry:
    "خطای تحلیل یا قطع بودن پایگاه دادهٔ تحلیل نباید جلوی ثبت فروش را بگیرد.",
  opsBufferLagHint:
    "تأخیر در ثبت رویدادهای تحلیلی عادی است؛ فروش ثبت‌شده معتبر می‌ماند.",
  opsDeadLetterHint:
    "پیام‌های مسموم پس از اتمام تلاش‌ها به صف بن‌بست منتقل می‌شوند.",
} as const;

export const ANALYTICS_INGEST_ISOLATION_REQUIREMENTS = {
  fireAndForgetEnqueue: true,
  neverFailSaleCompletedWhenMongoDown: true,
  neverFailCompleteSaleWhenMongoDown: true,
  dropOrDeadLetterAfterMaxRetries: true,
  emitIngestFailureMetrics: true,
  syncMongoOnCheckoutForbidden: true,
  unicodePersianOpsCopyStubbed: true,
} as const;

/** Canonical ingest document for the buffer (warehouse envelope ADR-057). */
export type AnalyticsIngestRecord = {
  eventId: string;
  eventType: string;
  merchantId: string;
  storeId: string | null;
  occurredAt: string;
  ingestClass: IngestClass;
  payload: Record<string, unknown>;
  correlationId?: string;
  causationId?: string | null;
};

export type BufferedIngestItem = {
  id: string;
  record: AnalyticsIngestRecord;
  attemptCount: number;
  enqueuedAt: Date;
  nextAttemptAt: Date;
  lastError: string | null;
};

export type DeadLetterItem = BufferedIngestItem & {
  deadLetteredAt: Date;
  disposition: "dead_letter" | "dropped";
};

/** Sink that may throw when Mongo is down — isolation layer catches this. */
export type AnalyticsIngestSink = {
  write(record: AnalyticsIngestRecord): void | Promise<void>;
};

export type IngestMetricsSnapshot = {
  enqueued: number;
  accepted: number;
  delivered: number;
  retried: number;
  dropped: number;
  deadLetter: number;
  mongoUnavailable: number;
  salePathProtected: number;
  bufferDepth: number;
};

export type IngestMetrics = {
  increment(
    name: Exclude<IngestMetricName, "analytics_ingest_buffer_depth">,
  ): void;
  setBufferDepth(depth: number): void;
  snapshot(): IngestMetricsSnapshot;
};

export function createInMemoryIngestMetrics(): IngestMetrics {
  const counters = {
    enqueued: 0,
    accepted: 0,
    delivered: 0,
    retried: 0,
    dropped: 0,
    deadLetter: 0,
    mongoUnavailable: 0,
    salePathProtected: 0,
  };
  let bufferDepth = 0;

  return {
    increment(name) {
      switch (name) {
        case INGEST_METRIC_NAMES.enqueued:
          counters.enqueued += 1;
          break;
        case INGEST_METRIC_NAMES.accepted:
          counters.accepted += 1;
          break;
        case INGEST_METRIC_NAMES.delivered:
          counters.delivered += 1;
          break;
        case INGEST_METRIC_NAMES.retried:
          counters.retried += 1;
          break;
        case INGEST_METRIC_NAMES.dropped:
          counters.dropped += 1;
          break;
        case INGEST_METRIC_NAMES.deadLetter:
          counters.deadLetter += 1;
          break;
        case INGEST_METRIC_NAMES.mongoUnavailable:
          counters.mongoUnavailable += 1;
          break;
        case INGEST_METRIC_NAMES.salePathProtected:
          counters.salePathProtected += 1;
          break;
        default: {
          const _exhaustive: never = name;
          void _exhaustive;
        }
      }
    },
    setBufferDepth(depth) {
      bufferDepth = depth;
    },
    snapshot() {
      return { ...counters, bufferDepth };
    },
  };
}

export type EnqueueIngestResult = {
  accepted: true;
  disposition: "queued";
  bufferId: string;
};

export type FlushIngestResult = {
  attempted: number;
  delivered: number;
  retried: number;
  deadLetter: number;
  dropped: number;
};

export type AnalyticsIngestBuffer = {
  enqueue(record: AnalyticsIngestRecord): EnqueueIngestResult;
  /** Deliver due items; never throws to caller for sink errors. */
  flush(now?: Date): Promise<FlushIngestResult>;
  depth(): number;
  listPending(): BufferedIngestItem[];
  listDeadLetters(): DeadLetterItem[];
};

function backoffMsForAttempt(attemptCount: number): number {
  const idx = Math.min(
    Math.max(attemptCount - 1, 0),
    INGEST_RETRY_POLICY.backoffMs.length - 1,
  );
  return INGEST_RETRY_POLICY.backoffMs[idx] ?? 600_000;
}

function afterMaxDisposition(
  ingestClass: IngestClass,
): "dead_letter" | "dropped" {
  if (ingestClass === "best_effort_track") {
    return INGEST_RETRY_POLICY.bestEffortTrack.afterMaxAttempts;
  }
  return INGEST_RETRY_POLICY.poison.afterMaxAttempts;
}

let bufferSeq = 0;

function nextBufferId(): string {
  bufferSeq += 1;
  return `ingest-buf-${bufferSeq}`;
}

/**
 * In-memory fire-and-forget ingest buffer.
 * Enqueue never throws. Sink failures schedule retries then DLQ/drop.
 */
export function createAnalyticsIngestBuffer(options: {
  sink: AnalyticsIngestSink;
  metrics?: IngestMetrics;
  now?: () => Date;
  maxAttempts?: number;
}): AnalyticsIngestBuffer {
  const sink = options.sink;
  const metrics = options.metrics ?? createInMemoryIngestMetrics();
  const nowFn = options.now ?? (() => new Date());
  const maxAttempts = options.maxAttempts ?? INGEST_RETRY_POLICY.maxAttempts;
  const pending = new Map<string, BufferedIngestItem>();
  const deadLetters: DeadLetterItem[] = [];

  function syncDepth(): void {
    metrics.setBufferDepth(pending.size);
  }

  return {
    enqueue(record) {
      const at = nowFn();
      const id = nextBufferId();
      pending.set(id, {
        id,
        record: { ...record, payload: { ...record.payload } },
        attemptCount: 0,
        enqueuedAt: at,
        nextAttemptAt: at,
        lastError: null,
      });
      metrics.increment(INGEST_METRIC_NAMES.enqueued);
      metrics.increment(INGEST_METRIC_NAMES.accepted);
      syncDepth();
      return {
        accepted: true as const,
        disposition: "queued" as const,
        bufferId: id,
      };
    },

    async flush(now = nowFn()) {
      const result: FlushIngestResult = {
        attempted: 0,
        delivered: 0,
        retried: 0,
        deadLetter: 0,
        dropped: 0,
      };

      const due = [...pending.values()]
        .filter((item) => item.nextAttemptAt.getTime() <= now.getTime())
        .sort((a, b) => a.enqueuedAt.getTime() - b.enqueuedAt.getTime());

      for (const item of due) {
        result.attempted += 1;
        try {
          await sink.write(item.record);
          pending.delete(item.id);
          metrics.increment(INGEST_METRIC_NAMES.delivered);
          result.delivered += 1;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "analytics_ingest_sink_failed";
          metrics.increment(INGEST_METRIC_NAMES.mongoUnavailable);

          const nextAttempt = item.attemptCount + 1;
          if (nextAttempt >= maxAttempts) {
            pending.delete(item.id);
            const disposition = afterMaxDisposition(item.record.ingestClass);
            deadLetters.push({
              ...item,
              attemptCount: nextAttempt,
              lastError: message,
              deadLetteredAt: now,
              disposition,
            });
            if (disposition === "dropped") {
              metrics.increment(INGEST_METRIC_NAMES.dropped);
              result.dropped += 1;
            } else {
              metrics.increment(INGEST_METRIC_NAMES.deadLetter);
              result.deadLetter += 1;
            }
          } else {
            pending.set(item.id, {
              ...item,
              attemptCount: nextAttempt,
              lastError: message,
              nextAttemptAt: new Date(
                now.getTime() + backoffMsForAttempt(nextAttempt),
              ),
            });
            metrics.increment(INGEST_METRIC_NAMES.retried);
            result.retried += 1;
          }
        }
      }

      syncDepth();
      return result;
    },

    depth() {
      return pending.size;
    },

    listPending() {
      return [...pending.values()].map((item) => ({
        ...item,
        record: { ...item.record, payload: { ...item.record.payload } },
      }));
    },

    listDeadLetters() {
      return deadLetters.map((item) => ({
        ...item,
        record: { ...item.record, payload: { ...item.record.payload } },
      }));
    },
  };
}

/**
 * Fire-and-forget AnalyticsIngestPort — enqueue never throws;
 * caller (CompleteSale / track) always succeeds regarding Mongo.
 */
export type AnalyticsIngestPort = {
  /**
   * Accept an analytics/audit record after OLTP success.
   * Must never throw (isolation guarantee).
   */
  accept(record: AnalyticsIngestRecord): EnqueueIngestResult;
};

export function createIsolatingAnalyticsIngestPort(
  buffer: AnalyticsIngestBuffer,
  metrics?: IngestMetrics,
): AnalyticsIngestPort {
  const m = metrics;
  return {
    accept(record) {
      try {
        return buffer.enqueue(record);
      } catch {
        // Isolation belt: even a broken buffer must not fail POS/track callers.
        m?.increment(INGEST_METRIC_NAMES.salePathProtected);
        return {
          accepted: true,
          disposition: "queued",
          bufferId: "isolation-swallow",
        };
      }
    },
  };
}

/** Optional CompleteSale dependency — enqueue SaleCompleted after OLTP persist. */
export type AnalyticsAfterSalePort = {
  /**
   * Fire-and-forget after sale persist. Must never reject / throw.
   */
  enqueueSaleCompleted(input: {
    eventId: string;
    saleId: string;
    merchantId: string;
    storeId: string;
    occurredAt: Date | string;
    payload: Record<string, unknown>;
    correlationId?: string;
  }): Promise<void>;
};

export function createAnalyticsAfterSalePort(
  ingest: AnalyticsIngestPort,
  metrics?: IngestMetrics,
): AnalyticsAfterSalePort {
  return {
    async enqueueSaleCompleted(input) {
      try {
        const occurredAt =
          typeof input.occurredAt === "string"
            ? input.occurredAt
            : input.occurredAt.toISOString();
        const record: AnalyticsIngestRecord = {
          eventId: input.eventId,
          eventType: "SaleCompleted",
          merchantId: input.merchantId,
          storeId: input.storeId,
          occurredAt,
          ingestClass: "domain_mirror",
          payload: {
            ...input.payload,
            saleId: input.saleId,
          },
        };
        if (input.correlationId !== undefined) {
          record.correlationId = input.correlationId;
        }
        ingest.accept(record);
        metrics?.increment(INGEST_METRIC_NAMES.salePathProtected);
      } catch {
        metrics?.increment(INGEST_METRIC_NAMES.salePathProtected);
        // never rethrow — SaleCompleted OLTP result is sacred
      }
    },
  };
}

/** Failing sink used in tests / local chaos when Mongo unavailable. */
export function createUnavailableMongoSink(
  reason = "mongodb_unavailable",
): AnalyticsIngestSink {
  return {
    async write() {
      throw new Error(reason);
    },
  };
}

export function assertSalePathIndependentOfMongo(
  posMustSucceedWhenMongoDown: boolean,
): void {
  if (!posMustSucceedWhenMongoDown) {
    throw new Error(
      "CompleteSale / SaleCompleted must succeed when Mongo is down (ADR-065).",
    );
  }
  if (!ANALYTICS_INGEST_ISOLATION_DECISION.posSuccessIndependentOfMongo) {
    throw new Error(
      "ANALYTICS_INGEST_ISOLATION_DECISION.posSuccessIndependentOfMongo must be true (ADR-065).",
    );
  }
  if (ANALYTICS_CRITICAL_PATH.syncMongoWriteInCompleteSaleForbidden !== true) {
    throw new Error(
      "syncMongoWriteInCompleteSaleForbidden must be true (ADR-065 / ADR-036).",
    );
  }
}

export function assertAnalyticsIngestOffCriticalPath(
  onCriticalPath: boolean,
): void {
  if (onCriticalPath) {
    throw new Error(
      "Analytics ingest must not run on the checkout critical path (ADR-065).",
    );
  }
  if (OUTBOX_CONSUMERS.mongodb_warehouse.onCriticalPath !== false) {
    throw new Error(
      "mongodb_warehouse outbox consumer must stay off critical path (ADR-065).",
    );
  }
}

export function assertIngestRetryPolicyAligned(): void {
  if (INGEST_RETRY_POLICY.maxAttempts !== DELIVERY_GUARANTEES.maxRetries) {
    throw new Error(
      "Ingest maxAttempts must align with DELIVERY_GUARANTEES.maxRetries (ADR-065).",
    );
  }
  if (INGEST_RETRY_POLICY.domainEvents.neverRollBackCompletedSale !== true) {
    throw new Error(
      "Domain ingest retries must never roll back a completed sale (ADR-065).",
    );
  }
}

export function assertIsolationImplementedHere(packagePath: string): void {
  if (packagePath !== ANALYTICS_INGEST_ISOLATION_DECISION.architecturePackage) {
    throw new Error(
      `Analytics ingest failure isolation lives at ${ANALYTICS_INGEST_ISOLATION_DECISION.architecturePackage}; got "${packagePath}".`,
    );
  }
}

export const ANALYTICS_INGEST_ISOLATION = {
  decision: ANALYTICS_INGEST_ISOLATION_DECISION,
  paths: ISOLATED_INGEST_PATHS,
  retryPolicy: INGEST_RETRY_POLICY,
  metricNames: INGEST_METRIC_NAMES,
  uxFa: INGEST_ISOLATION_UX_FA,
  requirements: ANALYTICS_INGEST_ISOLATION_REQUIREMENTS,
} as const;
