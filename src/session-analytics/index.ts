/**
 * ADR-061 — Session Analytics.
 *
 * Client UUID sessionId + heartbeat + 30-minute idle timeout → Mongo
 * `mos_sessions` session aggregates (duration, device class, paths).
 * Session* lifecycle events (SessionStarted / SessionHeartbeat /
 * SessionEnded). Best-effort via ADR-065 (`best_effort_track`).
 * In-memory store for tests; HTTP session API / client SDK → ARD-027.
 *
 * Normative: docs/architecture/user-behavior-tracking-architecture.md,
 * docs/architecture/analytics-architecture.md, ADR-056 / ADR-060 / ADR-065.
 */

import {
  createAnalyticsIngestBuffer,
  createInMemoryIngestMetrics,
  createIsolatingAnalyticsIngestPort,
  ISOLATED_INGEST_PATHS,
  type AnalyticsIngestBuffer,
  type AnalyticsIngestPort,
  type AnalyticsIngestRecord,
  type AnalyticsIngestSink,
  type EnqueueIngestResult,
  type FlushIngestResult,
  type IngestMetrics,
} from "../analytics-ingest-isolation/index.js";
import { MONGO_ANALYTICS_PLANE } from "../analytics-boundaries/index.js";
import {
  MONGO_COLLECTIONS,
  TENANCY_AND_AUTHZ,
  UNICODE_PAYLOAD_SAFETY,
} from "../mongodb-analytics/index.js";

/** ADR-061 Decision — binding session analytics stance. */
export const SESSION_ANALYTICS_DECISION = {
  adr: "ADR-061",
  pattern: "client_uuid_heartbeat_idle_timeout_to_mos_sessions" as const,
  /** Dedicated session-aggregate collection (analytics plane). */
  collection: "mos_sessions" as const,
  /**
   * Clickstream path events remain ADR-056 locked `mos_behavior`.
   * Session aggregates live in `mos_sessions` (parallel to mos_product_rollups).
   */
  relatedBehaviorCollection: MONGO_COLLECTIONS.behavior,
  sessionIdSource: "client_generated_uuid" as const,
  idleTimeoutMinutes: 30,
  heartbeatExtendsIdleTtl: true,
  deriveDuration: true,
  deviceClassRequired: true,
  neverOltpSourceOfTruth: true,
  onCheckoutCriticalPath: false,
  ingestIsolationAdr: "ADR-065",
  ingestClass: "best_effort_track" as const,
  ttlDaysMin: 90,
  ttlDaysMax: 180,
  retentionAdr: "ADR-064",
  retentionPackage: "src/data-retention/",
  identityStitchDeferred: true,
  architecturePackage: "src/session-analytics/",
  mongodbPlanePackage: "src/mongodb-analytics/",
  isolationPackage: "src/analytics-ingest-isolation/",
  clickstreamPackage: "src/clickstream/",
  architectureDoc: "docs/architecture/user-behavior-tracking-architecture.md",
  analyticsArchitectureDoc: "docs/architecture/analytics-architecture.md",
  relatedArd: "ARD-027",
} as const;

/** Session lifecycle event types (ADR-061 / analytics-architecture). */
export const SESSION_EVENT_TYPES = [
  "SessionStarted",
  "SessionHeartbeat",
  "SessionEnded",
] as const;

export type SessionEventType = (typeof SESSION_EVENT_TYPES)[number];

export type SessionAction = "start" | "heartbeat" | "end";

export type SessionStatus = "active" | "ended" | "timed_out";

/** Device / viewport class for engagement segmentation (Iranian mobile reality). */
export type DeviceClass = "mobile" | "desktop" | "tablet" | "unknown";

export const SESSION_IDLE = {
  timeoutMinutes: SESSION_ANALYTICS_DECISION.idleTimeoutMinutes,
  timeoutMs: SESSION_ANALYTICS_DECISION.idleTimeoutMinutes * 60 * 1000,
  heartbeatExtendsTtl: SESSION_ANALYTICS_DECISION.heartbeatExtendsIdleTtl,
} as const;

export const SESSION_INDEXES = {
  uniqueSessionId: "{ sessionId: 1 } unique",
  merchantStarted: "{ merchantId: 1, startedAt: -1 }",
  statusHeartbeat: "{ status: 1, lastHeartbeatAt: 1 }",
  deviceClassStarted: "{ deviceClass: 1, startedAt: -1 }",
  uniqueEventId: "{ eventId: 1 } unique (lifecycle events)",
} as const;

export const SESSION_API = {
  session: "/api/v1/analytics/session",
  actions: ["start", "heartbeat", "end"] as const,
  acceptedHttp: 202 as const,
} as const;

/**
 * Persian metric names for merchant session KPI dashboards later (ADR-061 Iranian UX).
 * Codes English; display always Persian + Jalali buckets at presentation.
 */
export const SESSION_METRIC_LABELS_FA = {
  sessionsPerDay: "نشست در روز",
  averageDuration: "میانگین مدت نشست",
  activeSessions: "نشست‌های فعال",
  timedOutSessions: "نشست‌های منقضی‌شده",
  mobileShare: "سهم دستگاه موبایل",
  heartbeats: "ضربان نشست",
} as const;

export type SessionMetricKey = keyof typeof SESSION_METRIC_LABELS_FA;

/**
 * Iranian First — time storage UTC; merchant report buckets Asia/Tehran + Jalali.
 */
export const SESSION_TIMEZONE_NOTES = {
  storage: "utc_iso8601" as const,
  merchantFacingBuckets: "jalali_asia_tehran_presentation" as const,
  timezone: "Asia/Tehran" as const,
  calendar: "jalali" as const,
  noteFa:
    "زمان نشست‌ها به‌صورت UTC ذخیره می‌شود؛ گزارش‌های فروشنده با تقویم شمسی و منطقه زمانی تهران نمایش داده می‌شود.",
  noteEn:
    "Session timestamps store as UTC ISO-8601; merchant-facing buckets use Jalali calendar and Asia/Tehran.",
} as const;

/**
 * Iranian First — viewer stubs; no merchant pages this ADR.
 */
export const SESSION_UX_FA = {
  locale: "fa-IR" as const,
  dir: "rtl" as const,
  TITLE: "تحلیل نشست‌ها",
  IDLE_HINT:
    "نشست پس از ۳۰ دقیقه بی‌فعالیتی به‌صورت تقریبی پایان می‌یابد.",
  TIME_BUCKETS_HINT: SESSION_TIMEZONE_NOTES.noteFa,
  MULTI_TAB_HINT:
    "شناسه نشست از سمت کلاینت است؛ چند زبانه با یک شناسه، یک نشست محسوب می‌شوند.",
  FAIL_OPEN_HINT:
    "قطع بودن تحلیل نشست نباید جلوی ثبت فروش یا کار با ویترین را بگیرد.",
} as const;

export const SESSION_UNICODE = {
  preserveUtf8PersianInProperties:
    UNICODE_PAYLOAD_SAFETY.preserveUtf8PersianInPayloads,
  eventCodesMayStayEnglish: UNICODE_PAYLOAD_SAFETY.eventCodesMayStayEnglish,
  humanLabelsPersian: true,
  merchantTimeBucketsJalaliTehran:
    UNICODE_PAYLOAD_SAFETY.merchantTimeBucketsJalaliTehran,
} as const;

export const SESSION_REQUIREMENTS = {
  clientUuidSessionId: true,
  heartbeatExtendsIdleTtl: true,
  idleTimeout30Minutes: true,
  sessionLifecycleEvents: true,
  durationDerived: true,
  deviceClassCaptured: true,
  mosSessionsCollection: true,
  trackIsolatedVia065: true,
  neverBlockOltp: true,
  persianMetricLabels: true,
  iranTimezoneNotes: true,
  offCheckoutCriticalPath: true,
  unicodePersianPropertiesSafe: true,
  ttl90to180Days: true,
  identityStitchDeferred: true,
  noProtocolDriverRequiredThisAdr: true,
  httpSessionApiDeferredToArd027: true,
} as const;

export const SESSION_PLACEMENT = {
  package: "src/session-analytics/",
  collection: SESSION_ANALYTICS_DECISION.collection,
  relatedBehaviorCollection:
    SESSION_ANALYTICS_DECISION.relatedBehaviorCollection,
  detailAdr: "ADR-061",
  trackHelper: "trackSession",
  modulesLater: "src/modules/analytics/",
} as const;

export const SESSION_METRIC_NAMES = {
  started: "session_started_total",
  heartbeats: "session_heartbeat_total",
  ended: "session_ended_total",
  timedOut: "session_timed_out_total",
  rejected: "session_rejected_total",
  queued: "session_queued_total",
  duplicates: "session_duplicate_event_total",
} as const;

/** Canonical mos_sessions aggregate document. */
export type SessionDocument = {
  sessionId: string;
  merchantId: string;
  storeId: string | null;
  actorId: string | null;
  anonymousId: string | null;
  status: SessionStatus;
  startedAt: string;
  lastHeartbeatAt: string;
  endedAt: string | null;
  /** Derived milliseconds; null while still active (unless snapshot). */
  durationMs: number | null;
  entryPath: string | null;
  exitPath: string | null;
  eventCount: number;
  deviceClass: DeviceClass;
  source: string;
  schemaVersion: number;
  correlationId: string;
  properties: Record<string, unknown>;
};

/** Append-only Session* lifecycle event row (also landed via ingest). */
export type SessionLifecycleEvent = {
  eventId: string;
  eventType: SessionEventType;
  sessionId: string;
  merchantId: string;
  storeId: string | null;
  occurredAt: string;
  ingestedAt: string;
  action: SessionAction;
  deviceClass: DeviceClass;
  path: string | null;
  source: string;
  correlationId: string;
  schemaVersion: number;
  properties: Record<string, unknown>;
};

export type TrackSessionInput = {
  eventId: string;
  sessionId: string;
  action: SessionAction;
  merchantId: string;
  storeId?: string | null;
  actorId?: string | null;
  anonymousId?: string | null;
  path?: string | null;
  deviceClass?: DeviceClass;
  properties?: Record<string, unknown>;
  occurredAt?: Date | string;
  correlationId?: string;
  source?: string;
  schemaVersion?: number;
};

export type TrackSessionResult =
  | {
      status: "accepted";
      eventId: string;
      sessionId: string;
      disposition: "queued";
      bufferId: string;
      sessionStatus: SessionStatus;
    }
  | { status: "rejected"; eventId: string; sessionId: string; reason: string };

export type SessionInsertResult =
  | { status: "inserted"; sessionId: string }
  | { status: "updated"; sessionId: string }
  | { status: "duplicate_event"; eventId: string };

export type SessionStore = {
  upsertFromLifecycle(
    session: SessionDocument,
    event: SessionLifecycleEvent,
  ): Promise<SessionInsertResult>;
  findBySessionId(sessionId: string): Promise<SessionDocument | null>;
  findByMerchant(input: {
    merchantId: string;
    storeId?: string;
    status?: SessionStatus;
    limit?: number;
  }): Promise<SessionDocument[]>;
  findEventById(eventId: string): Promise<SessionLifecycleEvent | null>;
  count(): Promise<number>;
};

export type SessionMetricsSnapshot = {
  started: number;
  heartbeats: number;
  ended: number;
  timedOut: number;
  rejected: number;
  queued: number;
  duplicates: number;
};

export type SessionMetrics = {
  recordStarted(): void;
  recordHeartbeat(): void;
  recordEnded(): void;
  recordTimedOut(): void;
  recordRejected(): void;
  recordQueued(): void;
  recordDuplicate(): void;
  snapshot(): SessionMetricsSnapshot;
};

function asIso(value: Date | string | undefined, now: () => Date): string {
  if (value === undefined) return now().toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return value.toISOString();
}

export function isSessionEventType(value: string): value is SessionEventType {
  return (SESSION_EVENT_TYPES as readonly string[]).includes(value);
}

export function isDeviceClass(value: unknown): value is DeviceClass {
  return (
    value === "mobile" ||
    value === "desktop" ||
    value === "tablet" ||
    value === "unknown"
  );
}

export function persianLabelForSessionMetric(metric: SessionMetricKey): string {
  return SESSION_METRIC_LABELS_FA[metric];
}

export function eventTypeForAction(action: SessionAction): SessionEventType {
  switch (action) {
    case "start":
      return "SessionStarted";
    case "heartbeat":
      return "SessionHeartbeat";
    case "end":
      return "SessionEnded";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function classifyDeviceClass(input: {
  deviceClass?: DeviceClass | null;
  userAgent?: string | null;
  viewportWidth?: number | null;
}): DeviceClass {
  if (input.deviceClass && isDeviceClass(input.deviceClass)) {
    return input.deviceClass;
  }
  const ua = (input.userAgent ?? "").toLowerCase();
  if (
    /ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/.test(ua)
  ) {
    return "tablet";
  }
  if (
    /mobi|iphone|ipod|android.*mobile|windows phone|blackberry/.test(ua)
  ) {
    return "mobile";
  }
  if (typeof input.viewportWidth === "number") {
    if (input.viewportWidth < 768) return "mobile";
    if (input.viewportWidth < 1024) return "tablet";
    if (input.viewportWidth >= 1024) return "desktop";
  }
  if (ua.includes("mozilla") || ua.includes("windows") || ua.includes("macintosh")) {
    return "desktop";
  }
  return "unknown";
}

/** Duration ms from start to end (or last activity if end missing). */
export function deriveSessionDurationMs(input: {
  startedAt: string;
  endedAt?: string | null;
  lastHeartbeatAt?: string | null;
}): number {
  const start = Date.parse(input.startedAt);
  const end = Date.parse(
    input.endedAt ?? input.lastHeartbeatAt ?? input.startedAt,
  );
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, end - start);
}

export function isIdleTimedOut(
  lastActivityAt: string,
  now: Date | string,
  timeoutMs: number = SESSION_IDLE.timeoutMs,
): boolean {
  const last = Date.parse(lastActivityAt);
  const current =
    typeof now === "string" ? Date.parse(now) : now.getTime();
  if (Number.isNaN(last) || Number.isNaN(current)) return false;
  return current - last >= timeoutMs;
}

export function buildLifecycleEvent(
  input: TrackSessionInput,
  options?: { now?: () => Date },
): SessionLifecycleEvent {
  const now = options?.now ?? (() => new Date());
  if (!input.eventId?.trim()) {
    throw new Error("Session lifecycle event requires eventId (ADR-061).");
  }
  if (!input.sessionId?.trim()) {
    throw new Error(
      "Session lifecycle event requires client sessionId UUID (ADR-061).",
    );
  }
  if (!input.merchantId?.trim()) {
    throw new Error(
      "Session lifecycle event requires merchantId (ADR-061 / ADR-056).",
    );
  }

  const deviceClass = classifyDeviceClass({
    deviceClass: input.deviceClass ?? null,
    userAgent:
      typeof input.properties?.userAgent === "string"
        ? input.properties.userAgent
        : null,
    viewportWidth:
      typeof input.properties?.viewportWidth === "number"
        ? input.properties.viewportWidth
        : null,
  });

  return {
    eventId: input.eventId,
    eventType: eventTypeForAction(input.action),
    sessionId: input.sessionId,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    occurredAt: asIso(input.occurredAt, now),
    ingestedAt: now().toISOString(),
    action: input.action,
    deviceClass,
    path: input.path ?? null,
    source: input.source ?? "session_analytics",
    correlationId: input.correlationId ?? input.eventId,
    schemaVersion: input.schemaVersion ?? 1,
    properties: structuredClone(input.properties ?? {}),
  };
}

/**
 * Apply a lifecycle action to an existing (or absent) session aggregate.
 * Enforces approx idle boundaries (ADR-061 tradeoff: approx).
 */
export function applySessionAction(input: {
  existing: SessionDocument | null;
  event: SessionLifecycleEvent;
  actorId?: string | null;
  anonymousId?: string | null;
}): { session: SessionDocument; timedOut: boolean } {
  const { existing, event } = input;
  const occurredAt = event.occurredAt;

  if (event.action === "start") {
    if (existing && existing.status === "active") {
      // Multi-tab / duplicate start: refresh heartbeat, keep original start.
      const next: SessionDocument = {
        ...existing,
        lastHeartbeatAt: occurredAt,
        eventCount: existing.eventCount + 1,
        deviceClass:
          existing.deviceClass === "unknown"
            ? event.deviceClass
            : existing.deviceClass,
        actorId: input.actorId ?? existing.actorId,
        anonymousId: input.anonymousId ?? existing.anonymousId,
        properties: { ...existing.properties, ...event.properties },
      };
      return { session: next, timedOut: false };
    }
    const session: SessionDocument = {
      sessionId: event.sessionId,
      merchantId: event.merchantId,
      storeId: event.storeId,
      actorId: input.actorId ?? null,
      anonymousId: input.anonymousId ?? null,
      status: "active",
      startedAt: occurredAt,
      lastHeartbeatAt: occurredAt,
      endedAt: null,
      durationMs: null,
      entryPath: event.path,
      exitPath: null,
      eventCount: 1,
      deviceClass: event.deviceClass,
      source: event.source,
      schemaVersion: event.schemaVersion,
      correlationId: event.correlationId,
      properties: structuredClone(event.properties),
    };
    return { session, timedOut: false };
  }

  if (!existing) {
    // Heartbeat/end without start — materialize ephemeral session (approx).
    const materializeOpts = {
      existing: null as SessionDocument | null,
      event: {
        ...event,
        action: "start" as const,
        eventType: "SessionStarted" as const,
      },
      ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
      ...(input.anonymousId !== undefined
        ? { anonymousId: input.anonymousId }
        : {}),
    };
    const materialized = applySessionAction(materializeOpts).session;
    return applySessionAction({
      existing: materialized,
      event,
      ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
      ...(input.anonymousId !== undefined
        ? { anonymousId: input.anonymousId }
        : {}),
    });
  }

  if (
    existing.status === "active" &&
    isIdleTimedOut(existing.lastHeartbeatAt, occurredAt)
  ) {
    const timedOut: SessionDocument = {
      ...existing,
      status: "timed_out",
      endedAt: new Date(
        Date.parse(existing.lastHeartbeatAt) + SESSION_IDLE.timeoutMs,
      ).toISOString(),
      durationMs: deriveSessionDurationMs({
        startedAt: existing.startedAt,
        endedAt: new Date(
          Date.parse(existing.lastHeartbeatAt) + SESSION_IDLE.timeoutMs,
        ).toISOString(),
        lastHeartbeatAt: existing.lastHeartbeatAt,
      }),
      exitPath: existing.exitPath ?? existing.entryPath,
      eventCount: existing.eventCount + 1,
    };
    return { session: timedOut, timedOut: true };
  }

  if (existing.status !== "active") {
    // Already closed — ignore further mutations but bump eventCount for trail.
    return {
      session: { ...existing, eventCount: existing.eventCount + 1 },
      timedOut: false,
    };
  }

  if (event.action === "heartbeat") {
    const next: SessionDocument = {
      ...existing,
      lastHeartbeatAt: occurredAt,
      eventCount: existing.eventCount + 1,
      deviceClass:
        existing.deviceClass === "unknown"
          ? event.deviceClass
          : existing.deviceClass,
      actorId: input.actorId ?? existing.actorId,
      anonymousId: input.anonymousId ?? existing.anonymousId,
      properties: { ...existing.properties, ...event.properties },
    };
    return { session: next, timedOut: false };
  }

  // end
  const ended: SessionDocument = {
    ...existing,
    status: "ended",
    lastHeartbeatAt: occurredAt,
    endedAt: occurredAt,
    durationMs: deriveSessionDurationMs({
      startedAt: existing.startedAt,
      endedAt: occurredAt,
      lastHeartbeatAt: occurredAt,
    }),
    exitPath: event.path ?? existing.exitPath ?? existing.entryPath,
    eventCount: existing.eventCount + 1,
    deviceClass:
      existing.deviceClass === "unknown"
        ? event.deviceClass
        : existing.deviceClass,
    actorId: input.actorId ?? existing.actorId,
    anonymousId: input.anonymousId ?? existing.anonymousId,
    properties: { ...existing.properties, ...event.properties },
  };
  return { session: ended, timedOut: false };
}

export function toIngestRecord(
  session: SessionDocument,
  event: SessionLifecycleEvent,
): AnalyticsIngestRecord {
  return {
    eventId: event.eventId,
    eventType: event.eventType,
    merchantId: session.merchantId,
    storeId: session.storeId,
    occurredAt: event.occurredAt,
    ingestClass: SESSION_ANALYTICS_DECISION.ingestClass,
    correlationId: event.correlationId,
    payload: {
      collection: SESSION_ANALYTICS_DECISION.collection,
      action: event.action,
      sessionId: session.sessionId,
      status: session.status,
      startedAt: session.startedAt,
      lastHeartbeatAt: session.lastHeartbeatAt,
      endedAt: session.endedAt,
      durationMs: session.durationMs,
      entryPath: session.entryPath,
      exitPath: session.exitPath,
      eventCount: session.eventCount,
      deviceClass: session.deviceClass,
      actorId: session.actorId,
      anonymousId: session.anonymousId,
      source: session.source,
      schemaVersion: session.schemaVersion,
      path: event.path,
      properties: event.properties,
      timezoneNotes: SESSION_TIMEZONE_NOTES.merchantFacingBuckets,
    },
  };
}

export function createInMemorySessionMetrics(): SessionMetrics {
  let started = 0;
  let heartbeats = 0;
  let ended = 0;
  let timedOut = 0;
  let rejected = 0;
  let queued = 0;
  let duplicates = 0;
  return {
    recordStarted() {
      started += 1;
    },
    recordHeartbeat() {
      heartbeats += 1;
    },
    recordEnded() {
      ended += 1;
    },
    recordTimedOut() {
      timedOut += 1;
    },
    recordRejected() {
      rejected += 1;
    },
    recordQueued() {
      queued += 1;
    },
    recordDuplicate() {
      duplicates += 1;
    },
    snapshot() {
      return {
        started,
        heartbeats,
        ended,
        timedOut,
        rejected,
        queued,
        duplicates,
      };
    },
  };
}

/**
 * In-memory mos_sessions store (tests / worker skeleton).
 */
export class InMemorySessionStore implements SessionStore {
  private readonly bySessionId = new Map<string, SessionDocument>();
  private readonly byEventId = new Map<string, SessionLifecycleEvent>();

  async upsertFromLifecycle(
    session: SessionDocument,
    event: SessionLifecycleEvent,
  ): Promise<SessionInsertResult> {
    assertSessionDocumentShape(session);
    const existingEvent = this.byEventId.get(event.eventId);
    if (existingEvent) {
      return { status: "duplicate_event", eventId: event.eventId };
    }
    const had = this.bySessionId.has(session.sessionId);
    this.bySessionId.set(session.sessionId, cloneSession(session));
    this.byEventId.set(event.eventId, cloneEvent(event));
    return had
      ? { status: "updated", sessionId: session.sessionId }
      : { status: "inserted", sessionId: session.sessionId };
  }

  async findBySessionId(sessionId: string): Promise<SessionDocument | null> {
    const existing = this.bySessionId.get(sessionId);
    return existing ? cloneSession(existing) : null;
  }

  async findByMerchant(input: {
    merchantId: string;
    storeId?: string;
    status?: SessionStatus;
    limit?: number;
  }): Promise<SessionDocument[]> {
    if (!input.merchantId?.trim()) {
      throw new Error(
        "Merchant-scoped session query requires merchantId (ADR-061 / ADR-056).",
      );
    }
    const limit = input.limit ?? 100;
    return [...this.bySessionId.values()]
      .filter((d) => {
        if (d.merchantId !== input.merchantId) return false;
        if (input.storeId && d.storeId !== input.storeId) return false;
        if (input.status && d.status !== input.status) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .slice(0, limit)
      .map(cloneSession);
  }

  async findEventById(eventId: string): Promise<SessionLifecycleEvent | null> {
    const existing = this.byEventId.get(eventId);
    return existing ? cloneEvent(existing) : null;
  }

  async count(): Promise<number> {
    return this.bySessionId.size;
  }
}

function cloneSession(doc: SessionDocument): SessionDocument {
  return {
    ...doc,
    properties: structuredClone(doc.properties),
  };
}

function cloneEvent(event: SessionLifecycleEvent): SessionLifecycleEvent {
  return {
    ...event,
    properties: structuredClone(event.properties),
  };
}

/** Sink that upserts mos_sessions docs (used with ADR-065 buffer). */
export function createSessionSink(
  store: SessionStore,
  metrics?: SessionMetrics,
): AnalyticsIngestSink {
  return {
    async write(record) {
      const payload = record.payload;
      const sessionId =
        typeof payload.sessionId === "string" ? payload.sessionId : "";
      if (!sessionId) {
        metrics?.recordRejected();
        return;
      }

      const action = payload.action as SessionAction;
      const eventType = isSessionEventType(record.eventType)
        ? record.eventType
        : eventTypeForAction(action === "start" || action === "heartbeat" || action === "end" ? action : "start");

      const event: SessionLifecycleEvent = {
        eventId: record.eventId,
        eventType,
        sessionId,
        merchantId: record.merchantId,
        storeId: record.storeId,
        occurredAt: record.occurredAt,
        ingestedAt: new Date().toISOString(),
        action:
          action === "start" || action === "heartbeat" || action === "end"
            ? action
            : "start",
        deviceClass: isDeviceClass(payload.deviceClass)
          ? payload.deviceClass
          : "unknown",
        path: typeof payload.path === "string" ? payload.path : null,
        source:
          typeof payload.source === "string"
            ? payload.source
            : "session_analytics",
        correlationId: record.correlationId ?? record.eventId,
        schemaVersion:
          typeof payload.schemaVersion === "number" ? payload.schemaVersion : 1,
        properties:
          payload.properties &&
          typeof payload.properties === "object" &&
          !Array.isArray(payload.properties)
            ? (payload.properties as Record<string, unknown>)
            : {},
      };

      const existing = await store.findBySessionId(sessionId);
      const applied = applySessionAction({
        existing,
        event,
        actorId:
          typeof payload.actorId === "string" ? payload.actorId : null,
        anonymousId:
          typeof payload.anonymousId === "string"
            ? payload.anonymousId
            : null,
      });

      // Prefer pre-computed aggregate from track path when present & consistent.
      const session: SessionDocument =
        typeof payload.status === "string" &&
        typeof payload.startedAt === "string" &&
        payload.sessionId === sessionId
          ? {
              sessionId,
              merchantId: record.merchantId,
              storeId: record.storeId,
              actorId:
                typeof payload.actorId === "string" ? payload.actorId : null,
              anonymousId:
                typeof payload.anonymousId === "string"
                  ? payload.anonymousId
                  : null,
              status: payload.status as SessionStatus,
              startedAt: payload.startedAt as string,
              lastHeartbeatAt:
                typeof payload.lastHeartbeatAt === "string"
                  ? payload.lastHeartbeatAt
                  : applied.session.lastHeartbeatAt,
              endedAt:
                typeof payload.endedAt === "string" || payload.endedAt === null
                  ? (payload.endedAt as string | null)
                  : applied.session.endedAt,
              durationMs:
                typeof payload.durationMs === "number" ||
                payload.durationMs === null
                  ? (payload.durationMs as number | null)
                  : applied.session.durationMs,
              entryPath:
                typeof payload.entryPath === "string" ||
                payload.entryPath === null
                  ? (payload.entryPath as string | null)
                  : applied.session.entryPath,
              exitPath:
                typeof payload.exitPath === "string" || payload.exitPath === null
                  ? (payload.exitPath as string | null)
                  : applied.session.exitPath,
              eventCount:
                typeof payload.eventCount === "number"
                  ? payload.eventCount
                  : applied.session.eventCount,
              deviceClass: isDeviceClass(payload.deviceClass)
                ? payload.deviceClass
                : applied.session.deviceClass,
              source:
                typeof payload.source === "string"
                  ? payload.source
                  : applied.session.source,
              schemaVersion:
                typeof payload.schemaVersion === "number"
                  ? payload.schemaVersion
                  : 1,
              correlationId: record.correlationId ?? record.eventId,
              properties: event.properties,
            }
          : applied.session;

      const result = await store.upsertFromLifecycle(session, event);
      if (result.status === "duplicate_event") {
        metrics?.recordDuplicate();
        return;
      }
      if (applied.timedOut || session.status === "timed_out") {
        metrics?.recordTimedOut();
      } else if (event.action === "start") {
        metrics?.recordStarted();
      } else if (event.action === "heartbeat") {
        metrics?.recordHeartbeat();
      } else if (event.action === "end") {
        metrics?.recordEnded();
      }
    },
  };
}

export type TrackSessionPort = {
  /**
   * Accept a session lifecycle action after / outside OLTP.
   * Isolation: never throws for sink/Mongo failures (ADR-065).
   */
  trackSession(input: TrackSessionInput): TrackSessionResult;
};

export type CreateTrackSessionPortOptions = {
  ingest: AnalyticsIngestPort;
  store?: SessionStore;
  metrics?: SessionMetrics;
  now?: () => Date;
};

/**
 * Create trackSession helper — apply idle rules, enqueue via ADR-065.
 */
export function createTrackSessionPort(
  options: CreateTrackSessionPortOptions,
): TrackSessionPort {
  const now = options.now ?? (() => new Date());
  const metrics = options.metrics;
  /** Optional read-through for idle decisions before queue (tests/stack). */
  const localProjection = new Map<string, SessionDocument>();

  return {
    trackSession(input) {
      try {
        const event = buildLifecycleEvent(input, { now });
        const existing =
          options.store
            ? // sync projection preferred when available is async — use local cache
              localProjection.get(input.sessionId) ?? null
            : localProjection.get(input.sessionId) ?? null;

        const applied = applySessionAction({
          existing,
          event,
          actorId: input.actorId ?? null,
          anonymousId: input.anonymousId ?? null,
        });
        localProjection.set(input.sessionId, applied.session);

        const result: EnqueueIngestResult = options.ingest.accept(
          toIngestRecord(applied.session, event),
        );
        metrics?.recordQueued();
        return {
          status: "accepted",
          eventId: event.eventId,
          sessionId: input.sessionId,
          disposition: "queued",
          bufferId: result.bufferId,
          sessionStatus: applied.session.status,
        };
      } catch (err) {
        metrics?.recordRejected();
        const reason =
          err instanceof Error ? err.message : "session_track_failed";
        return {
          status: "rejected",
          eventId: input.eventId,
          sessionId: input.sessionId,
          reason,
        };
      }
    },
  };
}

/**
 * Convenience: memory store + ADR-065 buffer + isolating trackSession.
 * flush() delivers into mos_sessions in-memory store.
 */
export function createSessionAnalyticsStack(options?: {
  metrics?: SessionMetrics;
  ingestMetrics?: IngestMetrics;
  now?: () => Date;
}): {
  store: InMemorySessionStore;
  buffer: AnalyticsIngestBuffer;
  track: TrackSessionPort;
  flush: () => Promise<FlushIngestResult>;
} {
  const store = new InMemorySessionStore();
  const sessionMetrics =
    options?.metrics ?? createInMemorySessionMetrics();
  const ingestMetrics =
    options?.ingestMetrics ?? createInMemoryIngestMetrics();
  const sink = createSessionSink(store, sessionMetrics);
  const buffer = createAnalyticsIngestBuffer({
    sink,
    metrics: ingestMetrics,
    ...(options?.now !== undefined ? { now: options.now } : {}),
  });
  const ingest = createIsolatingAnalyticsIngestPort(buffer, ingestMetrics);
  const track = createTrackSessionPort({
    ingest,
    store,
    metrics: sessionMetrics,
    ...(options?.now !== undefined ? { now: options.now } : {}),
  });
  return {
    store,
    buffer,
    track,
    flush: () => buffer.flush(),
  };
}

export function assertSessionDocumentShape(doc: SessionDocument): void {
  if (!doc.sessionId?.trim()) {
    throw new Error("Session document requires sessionId (ADR-061).");
  }
  if (!doc.merchantId?.trim()) {
    throw new Error(
      "Session document requires merchantId (ADR-061 / ADR-056).",
    );
  }
  if (!isDeviceClass(doc.deviceClass)) {
    throw new Error("Session document requires deviceClass (ADR-061).");
  }
}

export function assertCollectionIsMosSessions(name: string): void {
  if (name !== SESSION_ANALYTICS_DECISION.collection) {
    throw new Error(
      `Session collection must be "${SESSION_ANALYTICS_DECISION.collection}" (ADR-061); got "${name}".`,
    );
  }
}

export function assertSessionAnalyticsImplementedHere(
  packagePath: string,
): void {
  if (packagePath !== SESSION_PLACEMENT.package) {
    throw new Error(
      `Session analytics package is ${SESSION_PLACEMENT.package}; got "${packagePath}".`,
    );
  }
}

export function assertTrackNeverBlocksOltp(onCriticalPath: boolean): void {
  if (onCriticalPath) {
    throw new Error(
      "Session track must stay off checkout critical path (ADR-061).",
    );
  }
  if (SESSION_ANALYTICS_DECISION.onCheckoutCriticalPath !== false) {
    throw new Error(
      "SESSION_ANALYTICS_DECISION.onCheckoutCriticalPath must be false (ADR-061).",
    );
  }
  if (ISOLATED_INGEST_PATHS.trackIngest.onCriticalPath !== false) {
    throw new Error(
      "trackIngest path must stay off critical path (ADR-061 / ADR-065).",
    );
  }
  if (ISOLATED_INGEST_PATHS.trackIngest.failOpenWhenMongoDown !== true) {
    throw new Error(
      "trackIngest must fail-open when Mongo is down (ADR-061 / ADR-065).",
    );
  }
}

export function assertIdleTimeout30Minutes(): void {
  if (SESSION_IDLE.timeoutMinutes !== 30) {
    throw new Error(
      "Session idle timeout must be 30 minutes (ADR-061).",
    );
  }
  if (SESSION_IDLE.heartbeatExtendsTtl !== true) {
    throw new Error(
      "Session heartbeat must extend idle TTL (ADR-061).",
    );
  }
}

export function assertIranTimezoneNotes(): void {
  if (SESSION_TIMEZONE_NOTES.timezone !== "Asia/Tehran") {
    throw new Error(
      "Session timezone notes must use Asia/Tehran (ADR-061).",
    );
  }
  if (SESSION_TIMEZONE_NOTES.calendar !== "jalali") {
    throw new Error(
      "Session timezone notes must declare Jalali merchant buckets (ADR-061).",
    );
  }
  if (SESSION_TIMEZONE_NOTES.storage !== "utc_iso8601") {
    throw new Error(
      "Session timestamps must store as UTC ISO-8601 (ADR-061).",
    );
  }
  if (!SESSION_UNICODE.merchantTimeBucketsJalaliTehran) {
    throw new Error(
      "SESSION_UNICODE.merchantTimeBucketsJalaliTehran must be true (ADR-061).",
    );
  }
}

export function assertKnownMongoSessionCapability(): void {
  if (!MONGO_ANALYTICS_PLANE.capabilities.includes("session_analytics")) {
    throw new Error(
      "MONGO_ANALYTICS_PLANE must include session_analytics (ADR-061 / ADR-014).",
    );
  }
  if (TENANCY_AND_AUTHZ.merchantQueriesMustFilterMerchantId !== true) {
    throw new Error(
      "Merchant session queries must filter merchantId (ADR-061 / ADR-056).",
    );
  }
}

export function assertPersianLabelPreserved(
  original: string,
  stored: string,
): void {
  if (original !== stored) {
    throw new Error(
      "Session analytics must preserve UTF-8 Persian labels (ADR-061).",
    );
  }
}

export const SESSION_ANALYTICS = {
  decision: SESSION_ANALYTICS_DECISION,
  eventTypes: SESSION_EVENT_TYPES,
  idle: SESSION_IDLE,
  indexes: SESSION_INDEXES,
  api: SESSION_API,
  metricLabelsFa: SESSION_METRIC_LABELS_FA,
  timezoneNotes: SESSION_TIMEZONE_NOTES,
  unicode: SESSION_UNICODE,
  uxFa: SESSION_UX_FA,
  requirements: SESSION_REQUIREMENTS,
  placement: SESSION_PLACEMENT,
  metricNames: SESSION_METRIC_NAMES,
} as const;
