/**
 * ADR-035 — Background Jobs and Transactional Outbox.
 *
 * Worker skeleton: enqueue → poll pending → dispatch fan-out → mark published,
 * with idempotent processed set. Scheduled job hooks for pickup unpaid cancel
 * and loyalty expiry (timers from ADR-091 mvp-policies).
 *
 * Shares modular-monolith codebase (ADR-004). Envelope / consumers: ADR-036.
 * EMQX publish → `src/emqx-realtime` (ADR-038); Mongo warehouse →
 * `src/event-warehouse` (ADR-057); Redis invalidation →
 * `src/cache-invalidation` (ADR-054); Notifications →
 * `src/modules/notifications` (ADR-090).
 *
 * Normative prose: docs/architecture/04-event-driven-architecture.md
 */

import { randomUUID } from "node:crypto";

import {
  DELIVERY_GUARANTEES,
  EVENT_LOG_POLICY,
  EVENT_UX_FA,
  OUTBOX_CONSUMERS,
  TRANSACTIONAL_OUTBOX,
  type EventEnvelope,
  type OutboxConsumerName,
} from "../event-driven/index.js";
import { DEPLOYABLE, OUTBOX_SPINE } from "../modular-monolith/index.js";
import {
  LOYALTY_EXPIRY_POLICY,
  PICKUP_TIMER_POLICY,
} from "../mvp-policies/index.js";

/** ADR-035 Decision — binding outbox worker stance. */
export const OUTBOX_WORKER_DECISION = {
  pattern: "transactional_outbox_worker" as const,
  persistence: "postgresql_outbox_events" as const,
  table: TRANSACTIONAL_OUTBOX.table,
  processedTable: "processed_events",
  delivery: "at_least_once" as const,
  consumersMustBeIdempotent: true,
  workersShareCodebase: DEPLOYABLE.workersShareCodebase,
  dualWriteWithoutOutboxForbidden: true,
  piiInWorkerLogsForbidden: EVENT_LOG_POLICY.piiInLogsForbidden,
  emqxPublishDeferredTo: null,
  emqxPublishPackage: "src/emqx-realtime/",
  emqxPublishAdr: "ADR-038",
  warehouseMirrorDeferredTo: null,
  warehouseMirrorPackage: "src/event-warehouse/",
  warehouseMirrorAdr: "ADR-057",
  /** Helper realized in ADR-054; wire handlers via `invalidateOnEvent`. */
  cacheInvalidationDeferredTo: null,
  cacheInvalidationPackage: "src/cache-invalidation/",
  cacheInvalidationAdr: "ADR-054",
  /** Notifications consumer realized in ADR-090. */
  notificationsDeferredTo: null,
  notificationsPackage: "src/modules/notifications/",
  notificationsArchitecturePackage: "src/notifications-architecture/",
  notificationsAdr: "ADR-090",
  architectureDoc: "docs/architecture/04-event-driven-architecture.md",
} as const;

/** Default poll cadence — shop-floor realtime without hammering DB/battery. */
export const OUTBOX_POLL = {
  intervalMs: 1_000,
  batchSize: 50,
  pendingPredicate: "published_at IS NULL",
  indexHint: TRANSACTIONAL_OUTBOX.pollIndexHint,
} as const;

/**
 * Outbox row / message shape (aligns with ADR-036 OUTBOX_EVENT_ROW).
 * `envelope` is the canonical wire payload; column mirrors support PG adapters.
 */
export type OutboxMessage = {
  id: string;
  eventId: string;
  eventType: string;
  merchantId: string;
  storeId: string | null;
  aggregateId: string | null;
  aggregateType: string | null;
  envelope: EventEnvelope;
  payloadVersion: number;
  correlationId: string;
  causationId: string | null;
  occurredAt: Date;
  createdAt: Date;
  publishedAt: Date | null;
  attemptCount: number;
  lastError: string | null;
};

export type EnqueueOutboxInput = {
  envelope: EventEnvelope;
  aggregateId?: string | null;
  aggregateType?: string | null;
  id?: string;
  createdAt?: Date;
};

export type OutboxStore = {
  enqueue(input: EnqueueOutboxInput): Promise<OutboxMessage>;
  /** Pending messages ordered by createdAt ascending. */
  pollPending(limit: number): Promise<OutboxMessage[]>;
  markPublished(id: string, publishedAt?: Date): Promise<void>;
  markAttemptFailed(id: string, error: string): Promise<void>;
  getById(id: string): Promise<OutboxMessage | null>;
};

export type ProcessedSet = {
  /** Returns true if newly recorded; false if already processed (idempotent skip). */
  tryMarkProcessed(eventId: string, consumer: OutboxConsumerName): Promise<boolean>;
  hasProcessed(eventId: string, consumer: OutboxConsumerName): Promise<boolean>;
};

export type OutboxDispatchHandler = (
  message: OutboxMessage,
) => void | Promise<void>;

export type OutboxConsumerHandlers = Partial<
  Record<OutboxConsumerName, OutboxDispatchHandler>
>;

export type OutboxWorkerOptions = {
  store: OutboxStore;
  processed: ProcessedSet;
  handlers?: OutboxConsumerHandlers;
  /** Consumer names to invoke; defaults to all OUTBOX_CONSUMERS keys. */
  consumers?: readonly OutboxConsumerName[];
  now?: () => Date;
  batchSize?: number;
};

export type DispatchBatchResult = {
  polled: number;
  published: number;
  failed: number;
  skippedIdempotent: number;
};

function processedKey(eventId: string, consumer: OutboxConsumerName): string {
  return `${consumer}:${eventId}`;
}

export function createOutboxMessage(input: EnqueueOutboxInput): OutboxMessage {
  const { envelope } = input;
  const now = input.createdAt ?? new Date();
  return {
    id: input.id?.trim() ? input.id.trim() : randomUUID(),
    eventId: envelope.eventId,
    eventType: envelope.eventType,
    merchantId: envelope.merchantId,
    storeId: envelope.storeId,
    aggregateId: input.aggregateId === undefined ? null : input.aggregateId,
    aggregateType:
      input.aggregateType === undefined ? null : input.aggregateType,
    envelope,
    payloadVersion: envelope.payloadVersion,
    correlationId: envelope.correlationId,
    causationId: envelope.causationId,
    occurredAt: new Date(envelope.occurredAt),
    createdAt: now,
    publishedAt: null,
    attemptCount: 0,
    lastError: null,
  };
}

/** In-memory outbox for tests and worker skeleton (PG adapter → ARD-001). */
export class InMemoryOutboxStore implements OutboxStore {
  private readonly byId = new Map<string, OutboxMessage>();

  async enqueue(input: EnqueueOutboxInput): Promise<OutboxMessage> {
    const message = createOutboxMessage(input);
    this.byId.set(message.id, { ...message });
    return { ...message };
  }

  async pollPending(limit: number): Promise<OutboxMessage[]> {
    return [...this.byId.values()]
      .filter((m) => m.publishedAt === null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit)
      .map((m) => ({ ...m, envelope: { ...m.envelope } }));
  }

  async markPublished(id: string, publishedAt: Date = new Date()): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error(`Outbox message "${id}" not found (ADR-035).`);
    }
    this.byId.set(id, {
      ...existing,
      publishedAt,
      lastError: null,
    });
  }

  async markAttemptFailed(id: string, error: string): Promise<void> {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error(`Outbox message "${id}" not found (ADR-035).`);
    }
    this.byId.set(id, {
      ...existing,
      attemptCount: existing.attemptCount + 1,
      lastError: error,
    });
  }

  async getById(id: string): Promise<OutboxMessage | null> {
    const existing = this.byId.get(id);
    return existing ? { ...existing, envelope: { ...existing.envelope } } : null;
  }
}

/** Idempotent processed set keyed by consumer + eventId (ADR-036 PROCESSED_EVENTS). */
export class InMemoryProcessedSet implements ProcessedSet {
  private readonly keys = new Set<string>();

  async tryMarkProcessed(
    eventId: string,
    consumer: OutboxConsumerName,
  ): Promise<boolean> {
    const key = processedKey(eventId, consumer);
    if (this.keys.has(key)) return false;
    this.keys.add(key);
    return true;
  }

  async hasProcessed(
    eventId: string,
    consumer: OutboxConsumerName,
  ): Promise<boolean> {
    return this.keys.has(processedKey(eventId, consumer));
  }
}

const DEFAULT_CONSUMERS = Object.keys(OUTBOX_CONSUMERS) as OutboxConsumerName[];

/**
 * One poll/dispatch cycle: load pending → run each consumer once (idempotent) →
 * mark published when all consumers succeed.
 */
export function createOutboxWorker(options: OutboxWorkerOptions) {
  const consumers = options.consumers ?? DEFAULT_CONSUMERS;
  const handlers = options.handlers ?? {};
  const batchSize = options.batchSize ?? OUTBOX_POLL.batchSize;
  const now = options.now ?? (() => new Date());

  async function dispatchMessage(
    message: OutboxMessage,
  ): Promise<{ skippedIdempotent: number }> {
    let skippedIdempotent = 0;
    for (const consumer of consumers) {
      const already = await options.processed.hasProcessed(
        message.eventId,
        consumer,
      );
      if (already) {
        skippedIdempotent += 1;
        continue;
      }
      const handler = handlers[consumer];
      if (handler) {
        await handler(message);
      }
      // Mark only after success so failures remain retryable (at-least-once).
      await options.processed.tryMarkProcessed(message.eventId, consumer);
    }
    return { skippedIdempotent };
  }

  async function dispatchOnce(): Promise<DispatchBatchResult> {
    const pending = await options.store.pollPending(batchSize);
    let published = 0;
    let failed = 0;
    let skippedIdempotent = 0;

    for (const message of pending) {
      try {
        const result = await dispatchMessage(message);
        skippedIdempotent += result.skippedIdempotent;
        await options.store.markPublished(message.id, now());
        published += 1;
      } catch (err) {
        failed += 1;
        const text = err instanceof Error ? err.message : String(err);
        await options.store.markAttemptFailed(message.id, text);
        if (message.attemptCount + 1 >= DELIVERY_GUARANTEES.maxRetries) {
          // Dead-letter persistence → ARD-001 / future DLQ table.
        }
      }
    }

    return {
      polled: pending.length,
      published,
      failed,
      skippedIdempotent,
    };
  }

  return {
    dispatchOnce,
    dispatchMessage,
    consumers,
    poll: OUTBOX_POLL,
  };
}

/**
 * Scheduled job hooks — workers share this codebase (ADR-004).
 * Domain execution ports wired when pickup / loyalty modules call these.
 */
export const SCHEDULED_JOB_HOOKS = {
  pickupUnpaidCancel: {
    jobName: "pickup_unpaid_cancel" as const,
    timerPolicy: PICKUP_TIMER_POLICY,
    unpaidTimeoutMinutes: PICKUP_TIMER_POLICY.unpaidPendingPaymentTimeoutMinutes,
    resultStatus: PICKUP_TIMER_POLICY.unpaidTimeoutResultStatus,
    /** Stub: invoke pickup cancel use case when ADR-011 lands. */
    status: "stub" as const,
  },
  pickupReadyHoldCancel: {
    jobName: "pickup_ready_hold_cancel" as const,
    holdHours: PICKUP_TIMER_POLICY.readyForPickupHoldHours,
    refundRequiresStaff: PICKUP_TIMER_POLICY.refundRequiresExplicitStaffAction,
    status: "stub" as const,
  },
  loyaltyPointsExpiry: {
    jobName: "loyalty_points_expiry" as const,
    expiryPolicy: LOYALTY_EXPIRY_POLICY,
    defaultMonthsAfterLastEarn:
      LOYALTY_EXPIRY_POLICY.defaultMonthsAfterLastEarn,
    eventName: LOYALTY_EXPIRY_POLICY.expiryEventName,
    /** Stub: call modules/loyalty expireStaleWallets (use case ready). */
    status: "stub" as const,
  },
} as const;

export type ScheduledJobName =
  (typeof SCHEDULED_JOB_HOOKS)[keyof typeof SCHEDULED_JOB_HOOKS]["jobName"];

export type ScheduledJobRunResult = {
  jobName: ScheduledJobName;
  ranAt: string;
  /** Domain port not wired yet — returns acknowledged stub. */
  status: "stub_acknowledged";
  policySnapshot: Record<string, unknown>;
};

/** Run a registered scheduled job stub (domain port wiring later). */
export function runScheduledJobStub(
  jobName: ScheduledJobName,
  now: () => Date = () => new Date(),
): ScheduledJobRunResult {
  if (jobName === "pickup_unpaid_cancel") {
    const hook = SCHEDULED_JOB_HOOKS.pickupUnpaidCancel;
    return {
      jobName,
      ranAt: now().toISOString(),
      status: "stub_acknowledged",
      policySnapshot: {
        unpaidTimeoutMinutes: hook.unpaidTimeoutMinutes,
        resultStatus: hook.resultStatus,
      },
    };
  }
  if (jobName === "pickup_ready_hold_cancel") {
    const hook = SCHEDULED_JOB_HOOKS.pickupReadyHoldCancel;
    return {
      jobName,
      ranAt: now().toISOString(),
      status: "stub_acknowledged",
      policySnapshot: {
        holdHours: hook.holdHours,
        refundRequiresStaff: hook.refundRequiresStaff,
      },
    };
  }
  const hook = SCHEDULED_JOB_HOOKS.loyaltyPointsExpiry;
  return {
    jobName,
    ranAt: now().toISOString(),
    status: "stub_acknowledged",
    policySnapshot: {
      defaultMonthsAfterLastEarn: hook.defaultMonthsAfterLastEarn,
      eventName: hook.eventName,
    },
  };
}

/**
 * Iranian First — worker-adjacent user-visible copy stays Persian (ADR-036).
 * No merchant UI in this ADR; contracts prevent EN-only notification regress.
 */
export const OUTBOX_WORKER_UX_FA = {
  ...EVENT_UX_FA,
  JOB_PICKUP_UNPAID_CANCELLED:
    "سفارش پرداخت‌نشده به‌خاطر اتمام مهلت لغو شد.",
  JOB_LOYALTY_POINTS_EXPIRED: "امتیازهای منقضی‌شده از کیف امتیاز کسر شد.",
  dir: "rtl" as const,
  locale: "fa-IR" as const,
} as const;

export function assertWorkersShareCodebase(): void {
  if (!OUTBOX_WORKER_DECISION.workersShareCodebase) {
    throw new Error(
      "Outbox workers must share the modular monolith codebase (ADR-035 / ADR-004).",
    );
  }
}

export function assertOutboxFeedsMatchSpine(): void {
  const spine = new Set<string>(OUTBOX_SPINE.feeds);
  for (const name of Object.keys(OUTBOX_CONSUMERS) as OutboxConsumerName[]) {
    const feed = OUTBOX_CONSUMERS[name].spineFeed;
    if (!spine.has(feed)) {
      throw new Error(
        `Outbox consumer "${name}" missing from OUTBOX_SPINE.feeds (ADR-035).`,
      );
    }
  }
}

export function assertNoPiiInWorkerLogPayload(scrubbed: {
  payload: unknown;
}): void {
  if (scrubbed.payload !== "[scrubbed]") {
    throw new Error("Worker logs must scrub event payloads (ADR-035).");
  }
}

export const OUTBOX_WORKER = {
  decision: OUTBOX_WORKER_DECISION,
  poll: OUTBOX_POLL,
  scheduledJobs: SCHEDULED_JOB_HOOKS,
  uxFa: OUTBOX_WORKER_UX_FA,
  delivery: DELIVERY_GUARANTEES,
  spine: OUTBOX_SPINE,
} as const;
