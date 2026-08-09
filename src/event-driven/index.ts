/**
 * ADR-036 — Event-Driven Architecture.
 *
 * Domain events + canonical envelope + transactional outbox;
 * at-least-once delivery; idempotent consumers.
 * Decouples cache, realtime, analytics, and notifications from write paths.
 *
 * Normative prose: docs/architecture/04-event-driven-architecture.md,
 * docs/architecture/event-catalog.md (governance → ADR-037).
 * Outbox worker poll → `src/outbox` (ADR-035). EMQX publish → `src/emqx-realtime` (ADR-038).
 */

import { randomUUID } from "node:crypto";

import { OUTBOX_SPINE } from "../modular-monolith/index.js";
import {
  assertPastTenseDomainEventName,
  type DomainEventBase,
} from "../shared/ddd/index.js";

/** ADR-036 Decision — binding event-driven stance. */
export const EVENT_DRIVEN_DECISION = {
  pattern: "domain_events_plus_transactional_outbox" as const,
  delivery: "at_least_once" as const,
  consumersMustBeIdempotent: true,
  fullEventSourcingMvp: false,
  cqrsReady: true,
  extractionReady: true,
  eventualConsistencyAccepted: true,
  catalogDoc: "docs/architecture/event-catalog.md",
  architectureDoc: "docs/architecture/04-event-driven-architecture.md",
} as const;

/**
 * Canonical event envelope fields (04-event-driven-architecture.md).
 * Wire/schema identifiers stay English; Persian only for user-visible consumers.
 */
export const EVENT_ENVELOPE_FIELDS = [
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
] as const;

export type EventEnvelopeField = (typeof EVENT_ENVELOPE_FIELDS)[number];

export type EventEnvelope<TPayload = Record<string, unknown>> = {
  eventId: string;
  /** Past-tense PascalCase, e.g. SaleCompleted (ADR-002). */
  eventType: string;
  /** ISO-8601 UTC. */
  occurredAt: string;
  merchantId: string;
  storeId: string | null;
  actorId: string | null;
  correlationId: string;
  causationId: string | null;
  payloadVersion: number;
  payload: TPayload;
};

/** Envelope defaults for new events. */
export const EVENT_ENVELOPE_DEFAULTS = {
  payloadVersion: 1,
  storeIdNullable: true,
  actorIdNullable: true,
  causationIdNullable: true,
} as const;

/**
 * Transactional outbox — persist events in the same DB TX as the aggregate write.
 * Dual-write without outbox is forbidden (ADR-035 deepens the worker).
 */
export const TRANSACTIONAL_OUTBOX = {
  pattern: "transactional_outbox" as const,
  table: "outbox_events",
  sameTransactionAsAggregate: true,
  dualWriteWithoutOutboxForbidden: true,
  publishedAtNullMeansPending: true,
  pollIndexHint: "(published_at) WHERE published_at IS NULL",
  workerImplementedIn: "src/outbox",
  workerAdr: "ADR-035",
  alignsWithModularMonolithSpine: true,
} as const;

/** Rows consumers use for idempotent dedupe. */
export const PROCESSED_EVENTS = {
  table: "processed_events",
  uniqueOn: "event_id",
  consumerKey: "eventId",
  redisSetNxAlternative: true,
  redisTtlDaysMin: 7,
} as const;

/**
 * Delivery guarantees (04-event-driven).
 * Retries: 1s → 5s → 30s → 2m → 10m (max 5); then dead-letter.
 */
export const DELIVERY_GUARANTEES = {
  mode: "at_least_once" as const,
  exactlyOnceForbiddenAsClaim: true,
  ordering: "per_aggregate_best_effort" as const,
  globalOrderAssumedForbidden: true,
  retryBackoffSeconds: [1, 5, 30, 120, 600] as const,
  maxRetries: 5,
  afterMaxRetries: "dead_letter" as const,
  consumersMustBeIdempotent: true,
} as const;

/**
 * Outbox fan-out consumers. Analytics/warehouse must not sit on checkout critical path.
 * Aligned with modular-monolith OUTBOX_SPINE.feeds.
 */
export const OUTBOX_CONSUMERS = {
  cache_invalidation: {
    channel: "in_process_after_commit_or_redis_pub" as const,
    purpose: "delete_redis_keys",
    onCriticalPath: false,
    spineFeed: "cache_invalidation" as const,
    implementation: "src/cache-invalidation/" as const,
    detailAdr: "ADR-054" as const,
  },
  emqx_realtime: {
    channel: "emqx_mqtt" as const,
    purpose: "ui_realtime_and_cross_instance",
    onCriticalPath: false,
    spineFeed: "emqx_realtime" as const,
    implementation: "src/emqx-realtime/" as const,
    detailAdr: "ADR-038" as const,
  },
  mongodb_warehouse: {
    channel: "mongodb_analytics_plane" as const,
    purpose: "event_warehouse_mirror",
    onCriticalPath: false,
    analyticsPlaneOnly: true,
    neverOltpSourceOfTruth: true,
    spineFeed: "mongodb_warehouse" as const,
    implementation: "src/event-warehouse/" as const,
    detailAdr: "ADR-057" as const,
  },
  notifications: {
    channel: "in_app_and_sms_ports" as const,
    purpose: "merchant_customer_alerts",
    onCriticalPath: false,
    userVisibleCopy: "persian",
    rtlDrawers: true,
    spineFeed: "notifications" as const,
    implementation: "src/modules/notifications/" as const,
    architecturePackage: "src/notifications-architecture/" as const,
    detailAdr: "ADR-090" as const,
  },
  minio_receipts: {
    channel: "minio_s3" as const,
    purpose: "sale_receipt_html_render",
    onCriticalPath: false,
    spineFeed: "minio_receipts" as const,
    implementation: "src/infrastructure/minio/" as const,
    detailAdr: "ADR-111" as const,
  },
  accounting_integration: {
    channel: "accounting_provider_port" as const,
    purpose: "erp_accounting_sync",
    onCriticalPath: false,
    spineFeed: "accounting_integration" as const,
    implementation: "src/modules/accounting/" as const,
    detailAdr: "ADR-126" as const,
  },
} as const;

export type OutboxConsumerName = keyof typeof OUTBOX_CONSUMERS;

/** Spine alignment — one outbox, many consumers (ADR-004 / ADR-036). */
export const EVENT_OUTBOX_SPINE = {
  pattern: OUTBOX_SPINE.pattern,
  feeds: OUTBOX_SPINE.feeds,
  analyticsOnCheckoutCriticalPath: OUTBOX_SPINE.analyticsOnCheckoutCriticalPath,
  consumerKeys: Object.keys(OUTBOX_CONSUMERS) as OutboxConsumerName[],
} as const;

/**
 * Checkout / CompleteSale critical path must not await analytics/warehouse.
 * Failure isolation (fire-and-forget / buffer / metrics) → ADR-065.
 */
export const ANALYTICS_CRITICAL_PATH = {
  onCheckoutCriticalPath: false,
  warehouseMirrorViaOutbox: true,
  syncMongoWriteInCompleteSaleForbidden: true,
  isolationAdr: "ADR-065",
  isolationPackage: "src/analytics-ingest-isolation/",
  /** @deprecated Use isolationAdr — kept for one-cycle grep safety. */
  isolationDeferredTo: null,
} as const;

/** Channels: in-process vs broker (04-event-driven). */
export const EVENT_CHANNELS = {
  cacheInvalidation: "in_process_or_redis_pub",
  uiRealtime: "emqx_mqtt",
  crossInstance: "emqx",
  futureServices: "emqx_plus_outbox",
} as const;

/** Security: scrub payloads in worker/app logs (ADR-036). */
export const EVENT_LOG_POLICY = {
  scrubPayloadsInLogs: true,
  allowPhoneInPayloadsForCrm: true,
  minimizeRawPayloadLogging: true,
  piiInLogsForbidden: true,
} as const;

/**
 * Iranian First — user-visible realtime / notification surfaces.
 * Wire schemas stay English; presentation is Persian + RTL.
 */
export const EVENT_UX_FA = {
  SALE_COMPLETED_TOAST: "فروش با موفقیت ثبت شد.",
  INVENTORY_LOW_TOAST: "موجودی کالا کم شده است.",
  INVENTORY_DEPLETED_TOAST: "موجودی کالا تمام شده است.",
  PICKUP_ORDER_PAID_TOAST: "سفارش حضوری پرداخت شد و آماده آماده‌سازی است.",
  MEMBERSHIP_CREATED_TOAST: "عضویت مشتری ثبت شد.",
  REALTIME_RECONNECTING: "در حال اتصال مجدد…",
  REALTIME_OFFLINE: "اتصال لحظه‌ای قطع است. داده‌ها به‌زودی به‌روز می‌شوند.",
  NOTIFICATION_DRAWER_TITLE: "اعلان‌ها",
  dir: "rtl" as const,
  locale: "fa-IR" as const,
} as const;

/** Schema evolution: increment payloadVersion; tolerate unknown fields.
 * Naming + light registry → ADR-037 (`src/event-naming`). */
export const EVENT_SCHEMA_EVOLUTION = {
  incrementPayloadVersion: true,
  consumersTolerateUnknownFields: true,
  registryImplementedIn: "src/event-naming",
  registryAdr: "ADR-037",
} as const;

export type CreateEventEnvelopeInput<TPayload> = {
  eventType: string;
  merchantId: string;
  payload: TPayload;
  eventId?: string;
  occurredAt?: Date | string;
  storeId?: string | null;
  actorId?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  payloadVersion?: number;
};

function toIso8601(value: Date | string | undefined): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return new Date(value).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Build a canonical envelope. eventType must be past-tense PascalCase (ADR-002).
 */
export function createEventEnvelope<TPayload>(
  input: CreateEventEnvelopeInput<TPayload>,
): EventEnvelope<TPayload> {
  assertPastTenseDomainEventName(input.eventType);
  const correlationId = input.correlationId?.trim()
    ? input.correlationId.trim()
    : randomUUID();

  return {
    eventId: input.eventId?.trim() ? input.eventId.trim() : randomUUID(),
    eventType: input.eventType,
    occurredAt: toIso8601(input.occurredAt),
    merchantId: input.merchantId,
    storeId: input.storeId === undefined ? null : input.storeId,
    actorId: input.actorId === undefined ? null : input.actorId,
    correlationId,
    causationId: input.causationId === undefined ? null : input.causationId,
    payloadVersion:
      input.payloadVersion ?? EVENT_ENVELOPE_DEFAULTS.payloadVersion,
    payload: input.payload,
  };
}

/** Lift a domain event into a wire envelope (application/outbox layer). */
export function envelopeFromDomainEvent<TPayload>(input: {
  domainEvent: DomainEventBase & { payload: TPayload };
  merchantId: string;
  storeId?: string | null;
  actorId?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  eventId?: string;
  payloadVersion?: number;
}): EventEnvelope<TPayload> {
  return createEventEnvelope({
    eventType: input.domainEvent.eventName,
    merchantId: input.merchantId,
    payload: input.domainEvent.payload,
    occurredAt: input.domainEvent.occurredAt,
    ...(input.storeId !== undefined ? { storeId: input.storeId } : {}),
    ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
    ...(input.correlationId !== undefined
      ? { correlationId: input.correlationId }
      : {}),
    ...(input.causationId !== undefined
      ? { causationId: input.causationId }
      : {}),
    ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
    ...(input.payloadVersion !== undefined
      ? { payloadVersion: input.payloadVersion }
      : {}),
  });
}

/** Outbox row shape concept (Drizzle adapter → ADR-035). */
export const OUTBOX_EVENT_ROW = {
  table: TRANSACTIONAL_OUTBOX.table,
  columns: [
    "id",
    "event_id",
    "event_type",
    "merchant_id",
    "store_id",
    "aggregate_id",
    "aggregate_type",
    "payload_json",
    "payload_version",
    "correlation_id",
    "causation_id",
    "occurred_at",
    "created_at",
    "published_at",
    "attempt_count",
    "last_error",
  ] as const,
  pendingPredicate: "published_at IS NULL",
} as const;

export function assertTransactionalOutboxSameTx(sameTransaction: boolean): void {
  if (!sameTransaction) {
    throw new Error(
      "Domain events must be written to outbox_events in the same TX as the aggregate (ADR-036).",
    );
  }
}

export function assertAtLeastOnceDelivery(mode: string): void {
  if (mode !== DELIVERY_GUARANTEES.mode && mode !== "at-least-once") {
    throw new Error(
      `Event delivery must be at-least-once (ADR-036); got "${mode}".`,
    );
  }
}

export function assertConsumersIdempotent(idempotent: boolean): void {
  if (!idempotent) {
    throw new Error(
      "Event consumers must be idempotent on eventId (ADR-036).",
    );
  }
}

export function assertAnalyticsOffCheckoutCriticalPath(
  onCriticalPath: boolean,
): void {
  if (onCriticalPath) {
    throw new Error(
      "Analytics/warehouse must not run on the checkout critical path (ADR-036 / ADR-004).",
    );
  }
}

export function assertOutboxSpineAligned(): void {
  const spineFeeds = new Set<string>(OUTBOX_SPINE.feeds);
  for (const name of Object.keys(OUTBOX_CONSUMERS) as OutboxConsumerName[]) {
    const feed = OUTBOX_CONSUMERS[name].spineFeed;
    if (!spineFeeds.has(feed)) {
      throw new Error(
        `Outbox consumer "${name}" spineFeed "${feed}" missing from OUTBOX_SPINE.feeds (ADR-036).`,
      );
    }
  }
  if (OUTBOX_SPINE.analyticsOnCheckoutCriticalPath !== false) {
    throw new Error(
      "OUTBOX_SPINE.analyticsOnCheckoutCriticalPath must be false (ADR-036).",
    );
  }
  if (OUTBOX_SPINE.pattern !== TRANSACTIONAL_OUTBOX.pattern) {
    throw new Error(
      "OUTBOX_SPINE.pattern must be transactional_outbox (ADR-036).",
    );
  }
}

export function assertEnvelopeComplete(
  envelope: Partial<EventEnvelope>,
): asserts envelope is EventEnvelope {
  for (const field of [
    "eventId",
    "eventType",
    "occurredAt",
    "merchantId",
    "correlationId",
    "payloadVersion",
    "payload",
  ] as const) {
    if (envelope[field] === undefined || envelope[field] === null) {
      throw new Error(
        `Event envelope missing required field "${field}" (ADR-036).`,
      );
    }
  }
  assertPastTenseDomainEventName(envelope.eventType as string);
}

export function scrubEnvelopeForLogs(
  envelope: EventEnvelope,
): Omit<EventEnvelope, "payload"> & { payload: "[scrubbed]" } {
  return {
    eventId: envelope.eventId,
    eventType: envelope.eventType,
    occurredAt: envelope.occurredAt,
    merchantId: envelope.merchantId,
    storeId: envelope.storeId,
    actorId: envelope.actorId,
    correlationId: envelope.correlationId,
    causationId: envelope.causationId,
    payloadVersion: envelope.payloadVersion,
    payload: "[scrubbed]",
  };
}

export const EVENT_DRIVEN = {
  decision: EVENT_DRIVEN_DECISION,
  envelopeFields: EVENT_ENVELOPE_FIELDS,
  envelopeDefaults: EVENT_ENVELOPE_DEFAULTS,
  outbox: TRANSACTIONAL_OUTBOX,
  processedEvents: PROCESSED_EVENTS,
  delivery: DELIVERY_GUARANTEES,
  consumers: OUTBOX_CONSUMERS,
  spine: EVENT_OUTBOX_SPINE,
  analyticsCriticalPath: ANALYTICS_CRITICAL_PATH,
  channels: EVENT_CHANNELS,
  logPolicy: EVENT_LOG_POLICY,
  uxFa: EVENT_UX_FA,
  schemaEvolution: EVENT_SCHEMA_EVOLUTION,
  outboxRow: OUTBOX_EVENT_ROW,
} as const;
