/**
 * ADR-057 — Event Warehouse Architecture.
 *
 * Append-only Mongo `mos_events` mirror of domain events. Outbox bridge
 * consumer `mongodb_warehouse` writes envelopes idempotent by `eventId`.
 * In-memory store for tests; official driver / TTL indexes / admin browse
 * API remain later packaging (ARD-024).
 *
 * Normative: docs/architecture/event-warehouse-architecture.md,
 * docs/architecture/mongodb-architecture.md, ADR-035/036/056/065.
 */

import {
  ANALYTICS_CRITICAL_PATH,
  OUTBOX_CONSUMERS,
  type EventEnvelope,
} from "../event-driven/index.js";
import {
  IMPLEMENTED_DOMAIN_EVENT_TYPES,
  MVP_EVENT_TYPES,
} from "../event-naming/index.js";
import {
  DOCUMENT_ENVELOPE,
  DOCUMENT_ENVELOPE_FIELDS,
  MONGO_COLLECTIONS,
  TENANCY_AND_AUTHZ,
  UNICODE_PAYLOAD_SAFETY,
} from "../../../infrastructure/mongodb/contracts/analytics/index.js";
import type { OutboxDispatchHandler, OutboxMessage } from "../../outbox/index.js";

/** ADR-057 Decision — binding warehouse stance. */
export const EVENT_WAREHOUSE_DECISION = {
  adr: "ADR-057",
  pattern: "outbox_bridge_append_only_mos_events" as const,
  collection: MONGO_COLLECTIONS.events,
  stream: "domain" as const,
  idempotencyKey: DOCUMENT_ENVELOPE.idempotencyKey,
  delivery: "at_least_once" as const,
  exactlyOnceForbiddenAsClaim: true,
  appendOnly: true,
  updatesForbidden: true,
  deletesForbiddenExceptTtl: true,
  outboxConsumer: "mongodb_warehouse" as const,
  neverOltpSourceOfTruth: true,
  onCheckoutCriticalPath: false,
  adminBrowseOnly: true,
  ttlMonths: 24,
  retentionAdr: "ADR-064",
  retentionPackage: "src/infrastructure/database/contracts/retention/",
  architecturePackage: "src/events/contracts/event-warehouse/",
  mongodbPlanePackage: "src/infrastructure/mongodb/contracts/analytics/",
  outboxPackage: "src/events/outbox/",
  eventDrivenPackage: "src/events/contracts/event-driven/",
  architectureDoc: "docs/architecture/event-warehouse-architecture.md",
  catalogDoc: "docs/architecture/event-catalog.md",
} as const;

export type WarehouseStream = "domain" | "product" | "audit" | "security";

/**
 * Warehouse document — canonical Mongo envelope + stream discriminator.
 * Payload may carry Persian UTF-8 (ADR-056 UNICODE_PAYLOAD_SAFETY).
 */
export type WarehouseDocument = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  ingestedAt: string;
  merchantId: string;
  storeId: string | null;
  actorId: string | null;
  actorRole: string | null;
  sessionId: string | null;
  anonymousId: string | null;
  correlationId: string;
  causationId: string | null;
  source: string;
  schemaVersion: number;
  stream: WarehouseStream;
  payload: Record<string, unknown>;
  payloadVersion: number;
};

export type EventWarehouseInsertResult =
  | { status: "inserted"; eventId: string }
  | { status: "duplicate"; eventId: string };

export type EventWarehouseStore = {
  /** Idempotent insert by eventId — duplicates are a no-op (append-only). */
  insertIdempotent(doc: WarehouseDocument): Promise<EventWarehouseInsertResult>;
  findByEventId(eventId: string): Promise<WarehouseDocument | null>;
  /**
   * Tenant-scoped list — merchantId required (ADR-056 tenancy).
   * platform_admin cross-tenant browse is a separate gate.
   */
  findByMerchant(input: {
    merchantId: string;
    limit?: number;
    eventType?: string;
  }): Promise<WarehouseDocument[]>;
  count(): Promise<number>;
};

export type WarehouseLagSample = {
  eventId: string;
  eventType: string;
  merchantId: string;
  occurredAt: string;
  ingestedAt: string;
  lagMs: number;
};

export type WarehouseMetricsSnapshot = {
  mirrored: number;
  duplicates: number;
  failed: number;
  lastLagMs: number | null;
  maxLagMs: number;
  samples: number;
};

export type WarehouseMetrics = {
  recordMirrored(lagMs: number): void;
  recordDuplicate(): void;
  recordFailed(): void;
  snapshot(): WarehouseMetricsSnapshot;
};

/** Metric names for warehouse lag / throughput (ADR-057 Analytics Impact). */
export const WAREHOUSE_METRIC_NAMES = {
  mirrored: "event_warehouse_mirrored_total",
  duplicates: "event_warehouse_duplicate_total",
  failed: "event_warehouse_failed_total",
  lagMs: "event_warehouse_mirror_lag_ms",
  maxLagMs: "event_warehouse_mirror_lag_ms_max",
} as const;

/**
 * Domain eventType → warehouse collection/stream mapping.
 * MVP: all catalog domain events → mos_events / stream domain.
 * Product analytics facts → mos_product via trackEvent (`src/modules/analytics/domain/product/`, ADR-059).
 * Clickstream → mos_behavior via trackClickstream (`src/infrastructure/mongodb/clickstream/`, ADR-060).
 * Sessions → mos_sessions via trackSession (`src/modules/analytics/domain/session/`, ADR-061).
 * Security stream → later (mos_security; not clickstream).
 * Audit evidence → mos_audit via AuditPort (`src/infrastructure/security/contracts/audit-logging/`, ADR-058),
 * not the mos_events warehouse stream.
 */
export const WAREHOUSE_EVENT_MAPPING = {
  collection: MONGO_COLLECTIONS.events,
  stream: EVENT_WAREHOUSE_DECISION.stream,
  catalogDomainEvents: MVP_EVENT_TYPES,
  implementedDomainEvents: IMPLEMENTED_DOMAIN_EVENT_TYPES,
  productStreamAdr: "ADR-059",
  productAnalyticsPackage: "src/modules/analytics/domain/product/",
  productAnalyticsCollection: MONGO_COLLECTIONS.product,
  clickstreamAdr: "ADR-060",
  clickstreamPackage: "src/infrastructure/mongodb/clickstream/",
  clickstreamCollection: MONGO_COLLECTIONS.behavior,
  sessionAnalyticsAdr: "ADR-061",
  sessionAnalyticsPackage: "src/modules/analytics/domain/session/",
  sessionAnalyticsCollection: "mos_sessions",
  auditEvidenceAdr: "ADR-058",
  auditEvidencePackage: "src/infrastructure/security/contracts/audit-logging/",
  auditEvidenceCollection: MONGO_COLLECTIONS.audit,
  securityStreamDeferred: true,
} as const;

export const EVENT_WAREHOUSE_INDEXES = {
  uniqueEventId: "{ eventId: 1 } unique",
  tenantTime: "{ merchantId: 1, occurredAt: -1 }",
  eventTypeTime: "{ eventType: 1, occurredAt: -1 }",
  ttlMonths: EVENT_WAREHOUSE_DECISION.ttlMonths,
  ttlNote:
    "TTL index on ingestedAt ≈ 24 months — canonical src/data-retention (ADR-064)",
  retentionAdr: "ADR-064",
  retentionPackage: "src/infrastructure/database/contracts/retention/",
} as const;

export const EVENT_WAREHOUSE_AUTHZ = {
  browseAudience: "platform_admin" as const,
  merchantScopedMustFilterMerchantId:
    TENANCY_AND_AUTHZ.merchantQueriesMustFilterMerchantId,
  adminBrowseOnly: true,
  reservedBrowsePath: "/api/v1/admin/warehouse/events",
} as const;

/**
 * Iranian First — wire codes English; preserve Persian UTF-8 in payloads;
 * human dashboards remain Persian + Jalali presentation (ADR-014).
 */
export const EVENT_WAREHOUSE_UNICODE = {
  preserveUtf8PersianInPayloads:
    UNICODE_PAYLOAD_SAFETY.preserveUtf8PersianInPayloads,
  eventCodesMayStayEnglish: UNICODE_PAYLOAD_SAFETY.eventCodesMayStayEnglish,
  humanDashboardCopyPersian: UNICODE_PAYLOAD_SAFETY.humanDashboardCopyPersian,
  merchantTimeBucketsJalaliTehran:
    UNICODE_PAYLOAD_SAFETY.merchantTimeBucketsJalaliTehran,
  payloadRoundTripMustNotCorruptFa: true,
} as const;

export const EVENT_WAREHOUSE_UX_FA = {
  locale: "fa-IR" as const,
  dir: "rtl" as const,
  ADMIN_BROWSE_TITLE: "انبار رویدادها",
  ADMIN_BROWSE_HINT:
    "مشاهدهٔ رویدادهای دامنه‌ای برای بررسی؛ فیلتر فروشگاه و تاریخ شمسی در رابط ادمین.",
  LAG_HINT: "تأخیر همگام‌سازی انبار رویدادها طبیعی است و روی فروش اثر ندارد.",
} as const;

export const EVENT_WAREHOUSE_REQUIREMENTS = {
  appendOnlyMosEvents: true,
  idempotentByEventId: true,
  outboxConsumerWired: true,
  tenantFieldsRequired: true,
  lagMetricsExposed: true,
  ttlTwentyFourMonths: true,
  adminBrowseOnly: true,
  offCheckoutCriticalPath: true,
  unicodePersianPayloadsSafe: true,
  noProtocolDriverRequiredThisAdr: true,
} as const;

export const EVENT_WAREHOUSE_PLACEMENT = {
  package: "src/events/contracts/event-warehouse/",
  outboxConsumer: "mongodb_warehouse" as const,
  detailAdr: "ADR-057",
  collection: MONGO_COLLECTIONS.events,
} as const;

function asRecord(payload: unknown): Record<string, unknown> {
  if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return { value: payload as unknown };
}

function lagMsBetween(occurredAt: string, ingestedAt: string): number {
  const occurred = Date.parse(occurredAt);
  const ingested = Date.parse(ingestedAt);
  if (Number.isNaN(occurred) || Number.isNaN(ingested)) return 0;
  return Math.max(0, ingested - occurred);
}

/** Build warehouse document from a domain event envelope. */
export function warehouseDocumentFromEnvelope(
  envelope: EventEnvelope,
  options?: {
    ingestedAt?: Date | string;
    source?: string;
    actorRole?: string | null;
    sessionId?: string | null;
    anonymousId?: string | null;
    stream?: WarehouseStream;
  },
): WarehouseDocument {
  assertMerchantTenantField(envelope.merchantId);
  const ingestedAt =
    typeof options?.ingestedAt === "string"
      ? new Date(options.ingestedAt).toISOString()
      : (options?.ingestedAt ?? new Date()).toISOString();

  return {
    eventId: envelope.eventId,
    eventType: envelope.eventType,
    occurredAt: envelope.occurredAt,
    ingestedAt,
    merchantId: envelope.merchantId,
    storeId: envelope.storeId,
    actorId: envelope.actorId,
    actorRole: options?.actorRole ?? null,
    sessionId: options?.sessionId ?? null,
    anonymousId: options?.anonymousId ?? null,
    correlationId: envelope.correlationId,
    causationId: envelope.causationId,
    source: options?.source ?? "system",
    schemaVersion: DOCUMENT_ENVELOPE.schemaVersionStartsAt,
    stream: options?.stream ?? EVENT_WAREHOUSE_DECISION.stream,
    payload: asRecord(envelope.payload),
    payloadVersion: envelope.payloadVersion,
  };
}

export function createInMemoryWarehouseMetrics(): WarehouseMetrics {
  let mirrored = 0;
  let duplicates = 0;
  let failed = 0;
  let lastLagMs: number | null = null;
  let maxLagMs = 0;
  let samples = 0;

  return {
    recordMirrored(lagMs: number) {
      mirrored += 1;
      samples += 1;
      lastLagMs = lagMs;
      if (lagMs > maxLagMs) maxLagMs = lagMs;
    },
    recordDuplicate() {
      duplicates += 1;
    },
    recordFailed() {
      failed += 1;
    },
    snapshot() {
      return {
        mirrored,
        duplicates,
        failed,
        lastLagMs,
        maxLagMs,
        samples,
      };
    },
  };
}

/**
 * In-memory append-only warehouse (tests / worker skeleton).
 * Unique eventId; re-insert of same id returns duplicate without mutation.
 */
export class InMemoryEventWarehouseStore implements EventWarehouseStore {
  private readonly byEventId = new Map<string, WarehouseDocument>();

  async insertIdempotent(
    doc: WarehouseDocument,
  ): Promise<EventWarehouseInsertResult> {
    assertWarehouseDocumentShape(doc);
    assertAppendOnlyStream(doc.stream);
    const existing = this.byEventId.get(doc.eventId);
    if (existing) {
      return { status: "duplicate", eventId: doc.eventId };
    }
    // Deep-ish clone so callers cannot mutate stored payloads.
    const stored: WarehouseDocument = {
      ...doc,
      payload: structuredClone(doc.payload),
    };
    this.byEventId.set(doc.eventId, stored);
    return { status: "inserted", eventId: doc.eventId };
  }

  async findByEventId(eventId: string): Promise<WarehouseDocument | null> {
    const existing = this.byEventId.get(eventId);
    return existing
      ? { ...existing, payload: structuredClone(existing.payload) }
      : null;
  }

  async findByMerchant(input: {
    merchantId: string;
    limit?: number;
    eventType?: string;
  }): Promise<WarehouseDocument[]> {
    assertMerchantTenantField(input.merchantId);
    const limit = input.limit ?? 100;
    return [...this.byEventId.values()]
      .filter((d) => d.merchantId === input.merchantId)
      .filter((d) =>
        input.eventType ? d.eventType === input.eventType : true,
      )
      .sort(
        (a, b) =>
          Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
      )
      .slice(0, limit)
      .map((d) => ({ ...d, payload: structuredClone(d.payload) }));
  }

  async count(): Promise<number> {
    return this.byEventId.size;
  }
}

export type WarehouseOutboxHandlerOptions = {
  store: EventWarehouseStore;
  metrics?: WarehouseMetrics;
  now?: () => Date;
  source?: string;
};

/**
 * Outbox `mongodb_warehouse` consumer — mirror envelope after commit.
 * Failures throw so the outbox worker retries (at-least-once).
 * Duplicates are success (idempotent).
 */
export function createWarehouseOutboxHandler(
  options: WarehouseOutboxHandlerOptions,
): OutboxDispatchHandler {
  const now = options.now ?? (() => new Date());
  const metrics = options.metrics;

  return async (message: OutboxMessage) => {
    try {
      const doc = warehouseDocumentFromEnvelope(message.envelope, {
        ingestedAt: now(),
        source: options.source ?? "outbox",
      });
      const result = await options.store.insertIdempotent(doc);
      if (result.status === "duplicate") {
        metrics?.recordDuplicate();
        return;
      }
      const lag = lagMsBetween(doc.occurredAt, doc.ingestedAt);
      metrics?.recordMirrored(lag);
    } catch (err) {
      metrics?.recordFailed();
      throw err;
    }
  };
}

/** Sample lag for observability / tests. */
export function computeWarehouseLag(
  doc: Pick<WarehouseDocument, "eventId" | "eventType" | "merchantId" | "occurredAt" | "ingestedAt">,
): WarehouseLagSample {
  return {
    eventId: doc.eventId,
    eventType: doc.eventType,
    merchantId: doc.merchantId,
    occurredAt: doc.occurredAt,
    ingestedAt: doc.ingestedAt,
    lagMs: lagMsBetween(doc.occurredAt, doc.ingestedAt),
  };
}

export function assertMerchantTenantField(
  merchantId: string | null | undefined,
): void {
  if (merchantId === null || merchantId === undefined || merchantId === "") {
    throw new Error(
      "Warehouse domain documents must include merchantId (ADR-057 / ADR-056).",
    );
  }
}

export function assertAppendOnlyStream(stream: string): void {
  if (stream !== "domain" && stream !== "product" && stream !== "audit" && stream !== "security") {
    throw new Error(`Unknown warehouse stream "${stream}" (ADR-057).`);
  }
}

export function assertWarehouseDocumentShape(doc: WarehouseDocument): void {
  assertMerchantTenantField(doc.merchantId);
  if (!doc.eventId?.trim()) {
    throw new Error("Warehouse document requires eventId (ADR-057).");
  }
  if (!doc.eventType?.trim()) {
    throw new Error("Warehouse document requires eventType (ADR-057).");
  }
  if (doc.stream !== EVENT_WAREHOUSE_DECISION.stream && doc.stream !== "product" && doc.stream !== "audit" && doc.stream !== "security") {
    throw new Error(`Invalid warehouse stream "${doc.stream}" (ADR-057).`);
  }
  for (const field of [
    "eventId",
    "eventType",
    "occurredAt",
    "ingestedAt",
    "merchantId",
    "correlationId",
    "payload",
  ] as const) {
    if (doc[field] === undefined) {
      throw new Error(
        `Warehouse document missing required field "${field}" (ADR-057).`,
      );
    }
  }
}

export function assertWarehouseOffCriticalPath(onCriticalPath: boolean): void {
  if (onCriticalPath) {
    throw new Error(
      "Event warehouse must stay off checkout critical path (ADR-057).",
    );
  }
  if (EVENT_WAREHOUSE_DECISION.onCheckoutCriticalPath !== false) {
    throw new Error(
      "EVENT_WAREHOUSE_DECISION.onCheckoutCriticalPath must be false (ADR-057).",
    );
  }
  if (OUTBOX_CONSUMERS.mongodb_warehouse.onCriticalPath !== false) {
    throw new Error(
      "mongodb_warehouse outbox consumer must stay off critical path (ADR-057).",
    );
  }
  if (ANALYTICS_CRITICAL_PATH.onCheckoutCriticalPath !== false) {
    throw new Error(
      "Analytics/warehouse must stay off checkout critical path (ADR-057 / ADR-036).",
    );
  }
}

export function assertIdempotentByEventId(key: string): void {
  if (key !== EVENT_WAREHOUSE_DECISION.idempotencyKey) {
    throw new Error(
      `Warehouse idempotency key must be "${EVENT_WAREHOUSE_DECISION.idempotencyKey}" (ADR-057); got "${key}".`,
    );
  }
}

export function assertCollectionIsMosEvents(name: string): void {
  if (name !== MONGO_COLLECTIONS.events) {
    throw new Error(
      `Domain event warehouse collection must be "${MONGO_COLLECTIONS.events}" (ADR-057); got "${name}".`,
    );
  }
}

export function assertWarehouseImplementedHere(packagePath: string): void {
  if (packagePath !== EVENT_WAREHOUSE_PLACEMENT.package) {
    throw new Error(
      `Event warehouse package is ${EVENT_WAREHOUSE_PLACEMENT.package}; got "${packagePath}".`,
    );
  }
}

export function assertPersianPayloadPreserved(
  original: string,
  stored: string,
): void {
  if (original !== stored) {
    throw new Error(
      "Warehouse must preserve UTF-8 Persian payload strings without corruption (ADR-057).",
    );
  }
  if (!EVENT_WAREHOUSE_UNICODE.preserveUtf8PersianInPayloads) {
    throw new Error(
      "EVENT_WAREHOUSE_UNICODE.preserveUtf8PersianInPayloads must be true (ADR-057).",
    );
  }
}

export function assertEnvelopeFieldsCovered(): void {
  for (const field of DOCUMENT_ENVELOPE_FIELDS) {
    if (
      field !== "payload" &&
      !(
        field === "eventId" ||
        field === "eventType" ||
        field === "occurredAt" ||
        field === "ingestedAt" ||
        field === "merchantId" ||
        field === "storeId" ||
        field === "actorId" ||
        field === "actorRole" ||
        field === "sessionId" ||
        field === "anonymousId" ||
        field === "correlationId" ||
        field === "causationId" ||
        field === "source" ||
        field === "schemaVersion"
      )
    ) {
      throw new Error(
        `Unexpected DOCUMENT_ENVELOPE field "${field}" not mapped into warehouse (ADR-057).`,
      );
    }
  }
}

export const EVENT_WAREHOUSE = {
  decision: EVENT_WAREHOUSE_DECISION,
  mapping: WAREHOUSE_EVENT_MAPPING,
  indexes: EVENT_WAREHOUSE_INDEXES,
  authz: EVENT_WAREHOUSE_AUTHZ,
  unicode: EVENT_WAREHOUSE_UNICODE,
  uxFa: EVENT_WAREHOUSE_UX_FA,
  requirements: EVENT_WAREHOUSE_REQUIREMENTS,
  placement: EVENT_WAREHOUSE_PLACEMENT,
  metricNames: WAREHOUSE_METRIC_NAMES,
} as const;
