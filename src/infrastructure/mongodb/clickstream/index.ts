/**
 * ADR-060 — User Behavior and Clickstream Tracking.
 *
 * Batched client beacons (PageViewed / ElementClicked / optional ScrollDepth)
 * → Mongo `mos_behavior` (ADR-056 locked name; colloquial `mos_clickstream`).
 * Best-effort via ADR-065 (`best_effort_track`). POS critical UX + funnel
 * companions at 100% sample; noisy events optionally sampled. PII scrubbed.
 * In-memory store for tests; HTTP beacon / client SDK → ARD-027.
 * Sessions → `src/modules/analytics/domain/session/` (ADR-061).
 *
 * Normative: docs/architecture/user-behavior-tracking-architecture.md,
 * docs/architecture/analytics-architecture.md, ADR-056 / ADR-065.
 */

import { createHash } from "node:crypto";
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
} from "../contracts/ingest-isolation/index.js";
import { MONGO_ANALYTICS_PLANE } from "../contracts/boundaries/index.js";
import {
  MONGO_COLLECTIONS,
  TENANCY_AND_AUTHZ,
  UNICODE_PAYLOAD_SAFETY,
} from "../contracts/analytics/index.js";

/** ADR-060 Decision — binding clickstream stance. */
export const CLICKSTREAM_DECISION = {
  adr: "ADR-060",
  pattern: "beacon_batched_pageview_elementclick_to_mos_behavior" as const,
  /** ADR-056 locked name — behavior plane (user colloquial: mos_clickstream). */
  collection: MONGO_COLLECTIONS.behavior,
  colloquialCollectionAlias: "mos_clickstream" as const,
  storeScoped: true,
  sampleNoisy: true,
  funnelEventsSampleRate: 1 as const,
  posCriticalSampleRate: 1 as const,
  ttlDaysMin: 90,
  ttlDaysMax: 180,
  retentionAdr: "ADR-064",
  retentionPackage: "src/infrastructure/database/contracts/retention/",
  neverOltpSourceOfTruth: true,
  onCheckoutCriticalPath: false,
  ingestIsolationAdr: "ADR-065",
  ingestClass: "best_effort_track" as const,
  architecturePackage: "src/infrastructure/mongodb/clickstream/",
  mongodbPlanePackage: "src/infrastructure/mongodb/contracts/analytics/",
  isolationPackage: "src/infrastructure/mongodb/contracts/ingest-isolation/",
  architectureDoc: "docs/architecture/user-behavior-tracking-architecture.md",
  analyticsArchitectureDoc: "docs/architecture/analytics-architecture.md",
  relatedArd: "ARD-027",
  /** Session heartbeat / aggregates implemented in ADR-061. */
  sessionsImplementedIn: "src/modules/analytics/domain/session/",
  sessionsAdr: "ADR-061",
  heatmapDeferred: true,
} as const;

/** Clickstream / path event types this package instruments. */
export const CLICKSTREAM_EVENT_TYPES = [
  "PageViewed",
  "ElementClicked",
  "ScrollDepth",
  "StorefrontViewed",
  "ProductDetailViewed",
  "PosScreenViewed",
  "PosElementClicked",
] as const;

export type ClickstreamEventType = (typeof CLICKSTREAM_EVENT_TYPES)[number];

/** POS critical UX — full fidelity (architecture sampling). */
export const POS_CRITICAL_EVENT_TYPES = [
  "PosScreenViewed",
  "PosElementClicked",
] as const;

/** Funnel companions — always 100% (analytics-rules). */
export const FUNNEL_COMPANION_EVENT_TYPES = [
  "StorefrontViewed",
  "ProductDetailViewed",
] as const;

/** Noisy high-volume events — sample by env/config. */
export const NOISY_EVENT_TYPES = ["ScrollDepth"] as const;

export type ClickstreamSampleClass =
  | "pos_critical"
  | "funnel_companion"
  | "noisy"
  | "standard";

export const CLICKSTREAM_SAMPLING = {
  posCriticalSampleRate: CLICKSTREAM_DECISION.posCriticalSampleRate,
  funnelCompanionSampleRate: CLICKSTREAM_DECISION.funnelEventsSampleRate,
  /** Default storefront noisy sample (10%); override via options. */
  noisyDefaultSampleRate: 0.1,
  /** PageViewed / ElementClicked default to full capture unless marked noisy. */
  standardSampleRate: 1,
  posCriticalEventTypes: POS_CRITICAL_EVENT_TYPES,
  funnelCompanionEventTypes: FUNNEL_COMPANION_EVENT_TYPES,
  noisyEventTypes: NOISY_EVENT_TYPES,
} as const;

export const CLICKSTREAM_INDEXES = {
  uniqueEventId: "{ eventId: 1 } unique",
  sessionTime: "{ sessionId: 1, occurredAt: -1 }",
  merchantTime: "{ merchantId: 1, occurredAt: -1 }",
  eventTypeTime: "{ eventType: 1, occurredAt: -1 }",
  storeTime: "{ storeId: 1, occurredAt: -1 }",
} as const;

export const CLICKSTREAM_API = {
  beacon: "/api/v1/analytics/beacon",
  /** Session start/heartbeat/end — ADR-061 (`src/modules/analytics/domain/session`); HTTP wire ARD-027. */
  session: "/api/v1/analytics/session",
  beaconAcceptedHttp: 202 as const,
} as const;

export const CLICKSTREAM_CORS = {
  lockedToAppOrigins: true,
  allowedSurfaceNotes: [
    "merchant_staff_pwa",
    "store_customer_pwa",
    "admin_app",
  ] as const,
  forbidWildcardInProduction: true,
} as const;

export const CLICKSTREAM_BEACON = {
  batchClientBeacons: true,
  flushIntervalSecondsHint: 5,
  flushOnUnload: true,
  maxBatchSize: 50,
} as const;

/**
 * Persian metric names for merchant / PM path dashboards later (ADR-060 Iranian UX).
 * Codes English; display always Persian + Jalali buckets at presentation.
 */
export const CLICKSTREAM_METRIC_LABELS_FA = {
  pageViews: "بازدید صفحه",
  elementClicks: "کلیک روی المان",
  scrollDepthSampled: "عمق اسکرول (نمونه‌گیری‌شده)",
  pathDropOff: "نقطهٔ ترک مسیر",
  storefrontViews: "بازدید ویترین",
  productDetailViews: "بازدید جزئیات کالا",
  posScreenViews: "بازدید صفحهٔ صندوق",
  sampledDropRate: "نرخ حذف به‌خاطر نمونه‌گیری",
} as const;

export type ClickstreamMetricKey = keyof typeof CLICKSTREAM_METRIC_LABELS_FA;

export const CLICKSTREAM_PII_POLICY = {
  forbidOtpCodes: true,
  forbidJwts: true,
  forbidPaymentSecrets: true,
  preferPhoneHash: true,
  phoneHashAlgorithm: "sha256" as const,
  phoneRedactionToken: "[phone_redacted]",
  preservePersianUtf8: UNICODE_PAYLOAD_SAFETY.preserveUtf8PersianInPayloads,
} as const;

const FORBIDDEN_PROPERTY_KEYS = [
  "otp",
  "otpCode",
  "smsCode",
  "jwt",
  "accessToken",
  "refreshToken",
  "idToken",
  "password",
  "cardNumber",
  "cvv",
  "pan",
  "secret",
  "paymentSecret",
] as const;

const IRANIAN_PHONE_PATTERN =
  /(?:\+98|0098|98)?0?9\d{9}|\b09\d{9}\b/g;

/**
 * Iranian First — viewer stubs; no merchant pages this ADR.
 */
export const CLICKSTREAM_UX_FA = {
  locale: "fa-IR" as const,
  dir: "rtl" as const,
  PATHS_TITLE: "تحلیل مسیر کاربران",
  CLICKS_TITLE: "کلیک‌استریم",
  TIME_BUCKETS_HINT:
    "بازهٔ زمانی گزارش‌ها با تقویم شمسی و منطقه زمانی تهران نمایش داده می‌شود.",
  SAMPLE_HINT:
    "رویدادهای پرحجم ممکن است نمونه‌گیری شوند؛ رویدادهای حیاتی صندوق و قیف همیشه ثبت می‌شوند.",
  BEACON_FAIL_OPEN_HINT:
    "قطع بودن کلیک‌استریم نباید جلوی ثبت فروش یا کار با ویترین را بگیرد.",
} as const;

export const CLICKSTREAM_UNICODE = {
  preserveUtf8PersianInProperties:
    UNICODE_PAYLOAD_SAFETY.preserveUtf8PersianInPayloads,
  eventCodesMayStayEnglish: UNICODE_PAYLOAD_SAFETY.eventCodesMayStayEnglish,
  humanLabelsPersian: true,
  merchantTimeBucketsJalaliTehran:
    UNICODE_PAYLOAD_SAFETY.merchantTimeBucketsJalaliTehran,
} as const;

export const CLICKSTREAM_REQUIREMENTS = {
  beaconBatchedPageViewElementClick: true,
  storeScoped: true,
  sampleNoisyKeepFunnelAndPos100: true,
  trackIsolatedVia065: true,
  mosBehaviorCollection: true,
  neverBlockOltp: true,
  noSecretsInProperties: true,
  phoneHashedOrScrubbed: true,
  persianMetricLabels: true,
  offCheckoutCriticalPath: true,
  unicodePersianPropertiesSafe: true,
  corsLockedToAppOrigins: true,
  ttl90to180Days: true,
  noProtocolDriverRequiredThisAdr: true,
  httpBeaconDeferredToArd027: true,
  sessionsImplementedAdr061: true,
} as const;

export const CLICKSTREAM_PLACEMENT = {
  package: "src/infrastructure/mongodb/clickstream/",
  collection: MONGO_COLLECTIONS.behavior,
  colloquialCollectionAlias: CLICKSTREAM_DECISION.colloquialCollectionAlias,
  detailAdr: "ADR-060",
  trackHelper: "trackClickstream",
  beaconHelper: "ingestBeaconBatch",
  modulesLater: "src/modules/analytics/",
} as const;

export const CLICKSTREAM_METRIC_NAMES = {
  tracked: "clickstream_tracked_total",
  duplicates: "clickstream_duplicate_total",
  scrubbed: "clickstream_properties_scrubbed_total",
  rejected: "clickstream_rejected_total",
  queued: "clickstream_queued_total",
  sampledOut: "clickstream_sampled_out_total",
} as const;

export type ViewportClass = "mobile" | "desktop" | "tablet" | "unknown";

/** Canonical mos_behavior clickstream document. */
export type ClickstreamDocument = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  ingestedAt: string;
  merchantId: string;
  storeId: string | null;
  actorId: string | null;
  sessionId: string | null;
  anonymousId: string | null;
  correlationId: string;
  schemaVersion: number;
  source: string;
  path: string | null;
  referrer: string | null;
  viewportClass: ViewportClass;
  sampleClass: ClickstreamSampleClass;
  properties: Record<string, unknown>;
};

export type TrackClickstreamInput = {
  eventId: string;
  eventType: string;
  merchantId: string;
  storeId?: string | null;
  actorId?: string | null;
  sessionId?: string | null;
  anonymousId?: string | null;
  path?: string | null;
  referrer?: string | null;
  viewportClass?: ViewportClass;
  /** Mark storefront funnel / conversion companions for 100% sample. */
  funnelCritical?: boolean;
  properties?: Record<string, unknown>;
  occurredAt?: Date | string;
  correlationId?: string;
  source?: string;
  schemaVersion?: number;
};

export type TrackClickstreamResult =
  | {
      status: "accepted";
      eventId: string;
      disposition: "queued";
      bufferId: string;
    }
  | { status: "sampled_out"; eventId: string }
  | { status: "rejected"; eventId: string; reason: string };

export type BeaconBatchItem = TrackClickstreamInput;

export type BeaconBatchResult = {
  accepted: number;
  sampledOut: number;
  rejected: number;
  results: TrackClickstreamResult[];
};

export type ClickstreamInsertResult =
  | { status: "inserted"; eventId: string }
  | { status: "duplicate"; eventId: string };

export type ClickstreamStore = {
  insertIdempotent(doc: ClickstreamDocument): Promise<ClickstreamInsertResult>;
  findByEventId(eventId: string): Promise<ClickstreamDocument | null>;
  findByMerchant(input: {
    merchantId: string;
    storeId?: string;
    eventType?: string;
    sessionId?: string;
    limit?: number;
  }): Promise<ClickstreamDocument[]>;
  count(): Promise<number>;
};

export type ClickstreamMetricsSnapshot = {
  tracked: number;
  duplicates: number;
  scrubbed: number;
  rejected: number;
  queued: number;
  sampledOut: number;
};

export type ClickstreamMetrics = {
  recordTracked(): void;
  recordDuplicate(): void;
  recordScrubbed(count?: number): void;
  recordRejected(): void;
  recordQueued(): void;
  recordSampledOut(): void;
  snapshot(): ClickstreamMetricsSnapshot;
};

function asIso(value: Date | string | undefined, now: () => Date): string {
  if (value === undefined) return now().toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return value.toISOString();
}

export function isClickstreamEventType(
  value: string,
): value is ClickstreamEventType {
  return (CLICKSTREAM_EVENT_TYPES as readonly string[]).includes(value);
}

export function persianLabelForMetric(metric: ClickstreamMetricKey): string {
  return CLICKSTREAM_METRIC_LABELS_FA[metric];
}

export function classifyClickstreamEvent(input: {
  eventType: string;
  source?: string | null;
  funnelCritical?: boolean;
}): ClickstreamSampleClass {
  if (
    input.funnelCritical ||
    (FUNNEL_COMPANION_EVENT_TYPES as readonly string[]).includes(
      input.eventType,
    )
  ) {
    return "funnel_companion";
  }
  if (
    (POS_CRITICAL_EVENT_TYPES as readonly string[]).includes(input.eventType)
  ) {
    return "pos_critical";
  }
  const source = input.source ?? "";
  if (
    source === "merchant_pos" ||
    source === "pos" ||
    source.startsWith("pos.")
  ) {
    return "pos_critical";
  }
  if ((NOISY_EVENT_TYPES as readonly string[]).includes(input.eventType)) {
    return "noisy";
  }
  return "standard";
}

export function sampleRateForClass(
  sampleClass: ClickstreamSampleClass,
  options?: { noisySampleRate?: number },
): number {
  switch (sampleClass) {
    case "pos_critical":
      return CLICKSTREAM_SAMPLING.posCriticalSampleRate;
    case "funnel_companion":
      return CLICKSTREAM_SAMPLING.funnelCompanionSampleRate;
    case "noisy":
      return options?.noisySampleRate ?? CLICKSTREAM_SAMPLING.noisyDefaultSampleRate;
    case "standard":
      return CLICKSTREAM_SAMPLING.standardSampleRate;
    default: {
      const _exhaustive: never = sampleClass;
      return _exhaustive;
    }
  }
}

/**
 * Deterministic sample gate. `random` in [0, 1); keep when random < rate.
 * Rate 1 always keeps; rate 0 always drops.
 */
export function shouldKeepSample(
  sampleClass: ClickstreamSampleClass,
  options?: { noisySampleRate?: number; random?: () => number },
): boolean {
  const rate = sampleRateForClass(
    sampleClass,
    options?.noisySampleRate !== undefined
      ? { noisySampleRate: options.noisySampleRate }
      : undefined,
  );
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  const draw = (options?.random ?? Math.random)();
  return draw < rate;
}

export function hashIranianPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, "");
  return createHash(CLICKSTREAM_PII_POLICY.phoneHashAlgorithm)
    .update(`mos:phone:${normalized}`)
    .digest("hex");
}

export function scrubPhonesInText(text: string): {
  text: string;
  scrubCount: number;
} {
  let scrubCount = 0;
  const scrubbed = text.replace(IRANIAN_PHONE_PATTERN, (match) => {
    scrubCount += 1;
    return `phone_hash:${hashIranianPhone(match)}`;
  });
  return { text: scrubbed, scrubCount };
}

export function scrubClickstreamProperties(
  properties: Record<string, unknown> | undefined,
): { properties: Record<string, unknown>; scrubCount: number } {
  const input = properties ? structuredClone(properties) : {};
  let scrubCount = 0;

  for (const key of FORBIDDEN_PROPERTY_KEYS) {
    if (key in input) {
      delete input[key];
      scrubCount += 1;
    }
  }

  for (const phoneKey of ["phone", "mobile", "phoneNumber", "customerPhone"]) {
    const raw = input[phoneKey];
    if (typeof raw === "string" && raw.trim()) {
      input[phoneKey] = `phone_hash:${hashIranianPhone(raw)}`;
      scrubCount += 1;
    }
  }

  function walk(value: unknown): unknown {
    if (typeof value === "string") {
      const { text, scrubCount: n } = scrubPhonesInText(value);
      scrubCount += n;
      return text;
    }
    if (Array.isArray(value)) {
      return value.map(walk);
    }
    if (value !== null && typeof value === "object") {
      const next: Record<string, unknown> = {};
      for (const [k, child] of Object.entries(value)) {
        if ((FORBIDDEN_PROPERTY_KEYS as readonly string[]).includes(k)) {
          scrubCount += 1;
          continue;
        }
        next[k] = walk(child);
      }
      return next;
    }
    return value;
  }

  const walked = walk(input) as Record<string, unknown>;
  return { properties: walked, scrubCount };
}

export function buildClickstreamDocument(
  input: TrackClickstreamInput,
  options?: { now?: () => Date },
): ClickstreamDocument {
  const now = options?.now ?? (() => new Date());
  if (!input.eventId?.trim()) {
    throw new Error("Clickstream document requires eventId (ADR-060).");
  }
  if (!input.eventType?.trim()) {
    throw new Error("Clickstream document requires eventType (ADR-060).");
  }
  if (!input.merchantId?.trim()) {
    throw new Error(
      "Clickstream document requires merchantId (ADR-060 / ADR-056).",
    );
  }

  const source = input.source ?? "clickstream";
  const sampleClass = classifyClickstreamEvent({
    eventType: input.eventType,
    source,
    ...(input.funnelCritical !== undefined
      ? { funnelCritical: input.funnelCritical }
      : {}),
  });
  const scrubbed = scrubClickstreamProperties(input.properties);

  return {
    eventId: input.eventId,
    eventType: input.eventType,
    occurredAt: asIso(input.occurredAt, now),
    ingestedAt: now().toISOString(),
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    actorId: input.actorId ?? null,
    sessionId: input.sessionId ?? null,
    anonymousId: input.anonymousId ?? null,
    correlationId: input.correlationId ?? input.eventId,
    schemaVersion: input.schemaVersion ?? 1,
    source,
    path: input.path ?? null,
    referrer: input.referrer ?? null,
    viewportClass: input.viewportClass ?? "unknown",
    sampleClass,
    properties: {
      ...scrubbed.properties,
      phonesScrubbed: scrubbed.scrubCount,
    },
  };
}

export function toIngestRecord(doc: ClickstreamDocument): AnalyticsIngestRecord {
  return {
    eventId: doc.eventId,
    eventType: doc.eventType,
    merchantId: doc.merchantId,
    storeId: doc.storeId,
    occurredAt: doc.occurredAt,
    ingestClass: CLICKSTREAM_DECISION.ingestClass,
    correlationId: doc.correlationId,
    payload: {
      actorId: doc.actorId,
      sessionId: doc.sessionId,
      anonymousId: doc.anonymousId,
      source: doc.source,
      schemaVersion: doc.schemaVersion,
      path: doc.path,
      referrer: doc.referrer,
      viewportClass: doc.viewportClass,
      sampleClass: doc.sampleClass,
      properties: doc.properties,
      collection: CLICKSTREAM_DECISION.collection,
    },
  };
}

export function createInMemoryClickstreamMetrics(): ClickstreamMetrics {
  let tracked = 0;
  let duplicates = 0;
  let scrubbed = 0;
  let rejected = 0;
  let queued = 0;
  let sampledOut = 0;
  return {
    recordTracked() {
      tracked += 1;
    },
    recordDuplicate() {
      duplicates += 1;
    },
    recordScrubbed(count = 1) {
      scrubbed += count;
    },
    recordRejected() {
      rejected += 1;
    },
    recordQueued() {
      queued += 1;
    },
    recordSampledOut() {
      sampledOut += 1;
    },
    snapshot() {
      return { tracked, duplicates, scrubbed, rejected, queued, sampledOut };
    },
  };
}

/**
 * In-memory append-only mos_behavior store (tests / worker skeleton).
 */
export class InMemoryClickstreamStore implements ClickstreamStore {
  private readonly byEventId = new Map<string, ClickstreamDocument>();

  async insertIdempotent(
    doc: ClickstreamDocument,
  ): Promise<ClickstreamInsertResult> {
    assertClickstreamDocumentShape(doc);
    const existing = this.byEventId.get(doc.eventId);
    if (existing) {
      return { status: "duplicate", eventId: doc.eventId };
    }
    this.byEventId.set(doc.eventId, cloneClickstreamDoc(doc));
    return { status: "inserted", eventId: doc.eventId };
  }

  async findByEventId(eventId: string): Promise<ClickstreamDocument | null> {
    const existing = this.byEventId.get(eventId);
    return existing ? cloneClickstreamDoc(existing) : null;
  }

  async findByMerchant(input: {
    merchantId: string;
    storeId?: string;
    eventType?: string;
    sessionId?: string;
    limit?: number;
  }): Promise<ClickstreamDocument[]> {
    if (!input.merchantId?.trim()) {
      throw new Error(
        "Merchant-scoped clickstream query requires merchantId (ADR-060 / ADR-056).",
      );
    }
    const limit = input.limit ?? 100;
    return [...this.byEventId.values()]
      .filter((d) => {
        if (d.merchantId !== input.merchantId) return false;
        if (input.storeId && d.storeId !== input.storeId) return false;
        if (input.eventType && d.eventType !== input.eventType) return false;
        if (input.sessionId && d.sessionId !== input.sessionId) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .slice(0, limit)
      .map(cloneClickstreamDoc);
  }

  async count(): Promise<number> {
    return this.byEventId.size;
  }
}

function cloneClickstreamDoc(doc: ClickstreamDocument): ClickstreamDocument {
  return {
    ...doc,
    properties: structuredClone(doc.properties),
  };
}

/** Sink that idempotently writes clickstream docs (used with ADR-065 buffer). */
export function createClickstreamSink(
  store: ClickstreamStore,
  metrics?: ClickstreamMetrics,
): AnalyticsIngestSink {
  return {
    async write(record) {
      const payload = record.payload;
      const doc: ClickstreamDocument = {
        eventId: record.eventId,
        eventType: record.eventType,
        occurredAt: record.occurredAt,
        ingestedAt: new Date().toISOString(),
        merchantId: record.merchantId,
        storeId: record.storeId,
        actorId: typeof payload.actorId === "string" ? payload.actorId : null,
        sessionId:
          typeof payload.sessionId === "string" ? payload.sessionId : null,
        anonymousId:
          typeof payload.anonymousId === "string" ? payload.anonymousId : null,
        correlationId: record.correlationId ?? record.eventId,
        schemaVersion:
          typeof payload.schemaVersion === "number" ? payload.schemaVersion : 1,
        source:
          typeof payload.source === "string" ? payload.source : "clickstream",
        path: typeof payload.path === "string" ? payload.path : null,
        referrer:
          typeof payload.referrer === "string" ? payload.referrer : null,
        viewportClass: isViewportClass(payload.viewportClass)
          ? payload.viewportClass
          : "unknown",
        sampleClass: isSampleClass(payload.sampleClass)
          ? payload.sampleClass
          : "standard",
        properties:
          payload.properties &&
          typeof payload.properties === "object" &&
          !Array.isArray(payload.properties)
            ? (payload.properties as Record<string, unknown>)
            : {},
      };
      const result = await store.insertIdempotent(doc);
      if (result.status === "duplicate") {
        metrics?.recordDuplicate();
      } else {
        metrics?.recordTracked();
      }
    },
  };
}

function isViewportClass(value: unknown): value is ViewportClass {
  return (
    value === "mobile" ||
    value === "desktop" ||
    value === "tablet" ||
    value === "unknown"
  );
}

function isSampleClass(value: unknown): value is ClickstreamSampleClass {
  return (
    value === "pos_critical" ||
    value === "funnel_companion" ||
    value === "noisy" ||
    value === "standard"
  );
}

export type TrackClickstreamPort = {
  /**
   * Accept a clickstream event after / outside OLTP.
   * Isolation: never throws for sink/Mongo failures (ADR-065).
   */
  trackClickstream(input: TrackClickstreamInput): TrackClickstreamResult;
  /** Batch beacon ingest (client N events → queue then flush). */
  ingestBeaconBatch(items: readonly BeaconBatchItem[]): BeaconBatchResult;
};

export type CreateTrackClickstreamPortOptions = {
  ingest: AnalyticsIngestPort;
  metrics?: ClickstreamMetrics;
  now?: () => Date;
  noisySampleRate?: number;
  random?: () => number;
};

/**
 * Create trackClickstream helper — sample, scrub, enqueue via ADR-065.
 */
export function createTrackClickstreamPort(
  options: CreateTrackClickstreamPortOptions,
): TrackClickstreamPort {
  const now = options.now ?? (() => new Date());
  const metrics = options.metrics;

  function trackOne(input: TrackClickstreamInput): TrackClickstreamResult {
    try {
      const sampleClass = classifyClickstreamEvent({
        eventType: input.eventType,
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.funnelCritical !== undefined
          ? { funnelCritical: input.funnelCritical }
          : {}),
      });
      const keep = shouldKeepSample(sampleClass, {
        ...(options.noisySampleRate !== undefined
          ? { noisySampleRate: options.noisySampleRate }
          : {}),
        ...(options.random !== undefined ? { random: options.random } : {}),
      });
      if (!keep) {
        metrics?.recordSampledOut();
        return { status: "sampled_out", eventId: input.eventId };
      }

      const doc = buildClickstreamDocument(input, { now });
      const phones = Number(doc.properties.phonesScrubbed ?? 0);
      if (phones > 0) {
        metrics?.recordScrubbed(phones);
      }
      const result: EnqueueIngestResult = options.ingest.accept(
        toIngestRecord(doc),
      );
      metrics?.recordQueued();
      return {
        status: "accepted",
        eventId: doc.eventId,
        disposition: "queued",
        bufferId: result.bufferId,
      };
    } catch (err) {
      metrics?.recordRejected();
      const reason =
        err instanceof Error ? err.message : "clickstream_track_failed";
      return {
        status: "rejected",
        eventId: input.eventId,
        reason,
      };
    }
  }

  return {
    trackClickstream: trackOne,
    ingestBeaconBatch(items) {
      const capped = items.slice(0, CLICKSTREAM_BEACON.maxBatchSize);
      const results = capped.map(trackOne);
      return {
        accepted: results.filter((r) => r.status === "accepted").length,
        sampledOut: results.filter((r) => r.status === "sampled_out").length,
        rejected: results.filter((r) => r.status === "rejected").length,
        results,
      };
    },
  };
}

/**
 * Convenience: memory store + ADR-065 buffer + isolating trackClickstream.
 * flush() delivers into mos_behavior in-memory store.
 */
export function createClickstreamStack(options?: {
  metrics?: ClickstreamMetrics;
  ingestMetrics?: IngestMetrics;
  now?: () => Date;
  noisySampleRate?: number;
  random?: () => number;
}): {
  store: InMemoryClickstreamStore;
  buffer: AnalyticsIngestBuffer;
  track: TrackClickstreamPort;
  flush: () => Promise<FlushIngestResult>;
} {
  const store = new InMemoryClickstreamStore();
  const clickMetrics =
    options?.metrics ?? createInMemoryClickstreamMetrics();
  const ingestMetrics =
    options?.ingestMetrics ?? createInMemoryIngestMetrics();
  const sink = createClickstreamSink(store, clickMetrics);
  const buffer = createAnalyticsIngestBuffer({
    sink,
    metrics: ingestMetrics,
    ...(options?.now !== undefined ? { now: options.now } : {}),
  });
  const ingest = createIsolatingAnalyticsIngestPort(buffer, ingestMetrics);
  const track = createTrackClickstreamPort({
    ingest,
    metrics: clickMetrics,
    ...(options?.now !== undefined ? { now: options.now } : {}),
    ...(options?.noisySampleRate !== undefined
      ? { noisySampleRate: options.noisySampleRate }
      : {}),
    ...(options?.random !== undefined ? { random: options.random } : {}),
  });
  return {
    store,
    buffer,
    track,
    flush: () => buffer.flush(),
  };
}

export function assertClickstreamDocumentShape(doc: ClickstreamDocument): void {
  if (!doc.eventId?.trim()) {
    throw new Error("Clickstream document requires eventId (ADR-060).");
  }
  if (!doc.eventType?.trim()) {
    throw new Error("Clickstream document requires eventType (ADR-060).");
  }
  if (!doc.merchantId?.trim()) {
    throw new Error(
      "Clickstream document requires merchantId (ADR-060 / ADR-056).",
    );
  }
}

export function assertCollectionIsMosBehavior(name: string): void {
  if (name !== MONGO_COLLECTIONS.behavior) {
    throw new Error(
      `Clickstream collection must be "${MONGO_COLLECTIONS.behavior}" (ADR-060 / ADR-056); got "${name}".`,
    );
  }
}

export function assertClickstreamImplementedHere(packagePath: string): void {
  if (packagePath !== CLICKSTREAM_PLACEMENT.package) {
    throw new Error(
      `Clickstream package is ${CLICKSTREAM_PLACEMENT.package}; got "${packagePath}".`,
    );
  }
}

export function assertTrackNeverBlocksOltp(onCriticalPath: boolean): void {
  if (onCriticalPath) {
    throw new Error(
      "Clickstream track must stay off checkout critical path (ADR-060).",
    );
  }
  if (CLICKSTREAM_DECISION.onCheckoutCriticalPath !== false) {
    throw new Error(
      "CLICKSTREAM_DECISION.onCheckoutCriticalPath must be false (ADR-060).",
    );
  }
  if (ISOLATED_INGEST_PATHS.trackIngest.onCriticalPath !== false) {
    throw new Error(
      "trackIngest path must stay off critical path (ADR-060 / ADR-065).",
    );
  }
  if (ISOLATED_INGEST_PATHS.trackIngest.failOpenWhenMongoDown !== true) {
    throw new Error(
      "trackIngest must fail-open when Mongo is down (ADR-060 / ADR-065).",
    );
  }
}

export function assertPosAndFunnelFullFidelity(): void {
  if (CLICKSTREAM_SAMPLING.posCriticalSampleRate !== 1) {
    throw new Error(
      "POS critical clickstream events must be 100% sampled (ADR-060).",
    );
  }
  if (CLICKSTREAM_SAMPLING.funnelCompanionSampleRate !== 1) {
    throw new Error(
      "Funnel companion clickstream events must be 100% sampled (ADR-060).",
    );
  }
}

export function assertNoSecretsInProperties(
  properties: Record<string, unknown>,
): void {
  for (const key of FORBIDDEN_PROPERTY_KEYS) {
    if (key in properties) {
      throw new Error(
        `Clickstream properties must not include secret key "${key}" (ADR-060).`,
      );
    }
  }
  const blob = JSON.stringify(properties);
  if (/\botp[=:\s]\d{4,8}\b/i.test(blob)) {
    throw new Error("Clickstream must not retain OTP codes (ADR-060).");
  }
}

export function assertPersianPropertyPreserved(
  original: string,
  stored: string,
): void {
  if (original !== stored) {
    throw new Error(
      "Clickstream must preserve UTF-8 Persian property strings (ADR-060).",
    );
  }
  if (!CLICKSTREAM_UNICODE.preserveUtf8PersianInProperties) {
    throw new Error(
      "CLICKSTREAM_UNICODE.preserveUtf8PersianInProperties must be true (ADR-060).",
    );
  }
}

export function assertKnownMongoBehaviorCapability(): void {
  if (!MONGO_ANALYTICS_PLANE.capabilities.includes("clickstream")) {
    throw new Error(
      "MONGO_ANALYTICS_PLANE must include clickstream (ADR-060 / ADR-014).",
    );
  }
  if (!MONGO_ANALYTICS_PLANE.capabilities.includes("user_behavior")) {
    throw new Error(
      "MONGO_ANALYTICS_PLANE must include user_behavior (ADR-060 / ADR-014).",
    );
  }
  if (TENANCY_AND_AUTHZ.merchantQueriesMustFilterMerchantId !== true) {
    throw new Error(
      "Merchant clickstream queries must filter merchantId (ADR-060 / ADR-056).",
    );
  }
}

export const CLICKSTREAM = {
  decision: CLICKSTREAM_DECISION,
  eventTypes: CLICKSTREAM_EVENT_TYPES,
  sampling: CLICKSTREAM_SAMPLING,
  indexes: CLICKSTREAM_INDEXES,
  api: CLICKSTREAM_API,
  cors: CLICKSTREAM_CORS,
  beacon: CLICKSTREAM_BEACON,
  metricLabelsFa: CLICKSTREAM_METRIC_LABELS_FA,
  pii: CLICKSTREAM_PII_POLICY,
  unicode: CLICKSTREAM_UNICODE,
  uxFa: CLICKSTREAM_UX_FA,
  requirements: CLICKSTREAM_REQUIREMENTS,
  placement: CLICKSTREAM_PLACEMENT,
  metricNames: CLICKSTREAM_METRIC_NAMES,
} as const;
