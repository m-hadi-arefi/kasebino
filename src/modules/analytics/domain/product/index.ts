/**
 * ADR-059 — Product Analytics Architecture.
 *
 * Feature usage + activation funnel events → Mongo `mos_product` via
 * `trackEvent`. Feature key registry + Persian metric names (merchant UX later).
 * Ingest is fire-and-forget through ADR-065 (`best_effort_track`). Money truth
 * stays PostgreSQL (dual-read). In-memory store for tests; HTTP track / admin
 * feature adoption UI remain ARD-023 packaging.
 *
 * Normative: docs/architecture/product-analytics-architecture.md,
 * docs/architecture/analytics-architecture.md, ADR-056 / ADR-065.
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
} from "../../../../infrastructure/mongodb/contracts/ingest-isolation/index.js";
import {
  DUAL_READ_DISCIPLINE,
  MONGO_ANALYTICS_PLANE,
} from "../../../../infrastructure/mongodb/contracts/boundaries/index.js";
import {
  MONGO_COLLECTIONS,
  TENANCY_AND_AUTHZ,
  UNICODE_PAYLOAD_SAFETY,
} from "../../../../infrastructure/mongodb/contracts/analytics/index.js";
import { createHash } from "node:crypto";

/** ADR-059 Decision — binding product analytics stance. */
export const PRODUCT_ANALYTICS_DECISION = {
  adr: "ADR-059",
  pattern: "feature_used_and_funnels_to_mos_product" as const,
  /** ADR-056 locked name — product analytics plane (user colloquial: mos_product_analytics). */
  collection: MONGO_COLLECTIONS.product,
  rollupsCollection: "mos_product_rollups" as const,
  featureKeyRegistry: true,
  dualReadMoneyFromPg: true,
  moneyTruthStore: DUAL_READ_DISCIPLINE.moneyAndAccountingTruth,
  neverOltpSourceOfTruth: true,
  onCheckoutCriticalPath: false,
  ingestIsolationAdr: "ADR-065",
  ingestClass: "best_effort_track" as const,
  architecturePackage: "src/modules/analytics/domain/product/",
  mongodbPlanePackage: "src/infrastructure/mongodb/contracts/analytics/",
  isolationPackage: "src/infrastructure/mongodb/contracts/ingest-isolation/",
  architectureDoc: "docs/architecture/product-analytics-architecture.md",
  analyticsArchitectureDoc: "docs/architecture/analytics-architecture.md",
  relatedArd: "ARD-023",
} as const;

/**
 * Stable feature keys (analytics-rules: prefer stable `featureKey` strings).
 * English codes; Persian labels in PRODUCT_FEATURE_LABELS_FA.
 */
export const FEATURE_KEYS = [
  "pos.open",
  "pos.scan_search",
  "pos.customer_capture",
  "pos.checkout",
  "qr.generate",
  "qr.storefront_visit",
  "qr.membership_join",
  "pickup.order_placed",
  "pickup.ready",
  "pickup.completed",
  "loyalty.earn",
  "loyalty.redeem",
  "loyalty.wallet_view",
  "app.opened",
  "dashboard.widget_viewed",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const PRODUCT_FEATURE_LABELS_FA: Record<FeatureKey, string> = {
  "pos.open": "باز کردن صندوق",
  "pos.scan_search": "اسکن یا جستجوی کالا",
  "pos.customer_capture": "ثبت شماره مشتری در صندوق",
  "pos.checkout": "تکمیل فروش در صندوق",
  "qr.generate": "تولید QR فروشگاه",
  "qr.storefront_visit": "ورود به ویترین از QR",
  "qr.membership_join": "عضویت پس از QR",
  "pickup.order_placed": "ثبت سفارش پیکاپ",
  "pickup.ready": "آماده تحویل پیکاپ",
  "pickup.completed": "تکمیل تحویل پیکاپ",
  "loyalty.earn": "کسب امتیاز وفاداری",
  "loyalty.redeem": "خرج امتیاز وفاداری",
  "loyalty.wallet_view": "مشاهده کیف امتیاز",
  "app.opened": "باز شدن برنامه",
  "dashboard.widget_viewed": "مشاهده ویجت داشبورد",
};

export type FunnelStep = {
  key: string;
  eventType: string;
  featureKey: FeatureKey;
  labelFa: string;
};

export type ProductFunnel = {
  id: string;
  labelFa: string;
  sampleRate: 1;
  steps: readonly FunnelStep[];
};

/**
 * Minimum activation funnels for this ADR (user + analytics-architecture).
 * 100% sampled (analytics-rules: funnel-critical events).
 */
export const PRODUCT_FUNNELS = {
  pos_phone_capture: {
    id: "pos_phone_capture",
    labelFa: "قیف ثبت شماره در صندوق",
    sampleRate: 1 as const,
    steps: [
      {
        key: "pos_opened",
        eventType: "PosSessionStarted",
        featureKey: "pos.open",
        labelFa: "باز شدن صندوق",
      },
      {
        key: "scan_or_search",
        eventType: "BarcodeScanAttempted",
        featureKey: "pos.scan_search",
        labelFa: "اسکن یا جستجو",
      },
      {
        key: "capture_shown",
        eventType: "CustomerCaptureShown",
        featureKey: "pos.customer_capture",
        labelFa: "نمایش ثبت شماره",
      },
      {
        key: "capture_completed",
        eventType: "CustomerCaptureCompleted",
        featureKey: "pos.customer_capture",
        labelFa: "ثبت شماره مشتری",
      },
      {
        key: "checkout_completed",
        eventType: "PosCheckoutCompleted",
        featureKey: "pos.checkout",
        labelFa: "تکمیل فروش",
      },
    ],
  },
  qr_acquisition: {
    id: "qr_acquisition",
    labelFa: "قیف جذب از QR",
    sampleRate: 1 as const,
    steps: [
      {
        key: "qr_generated",
        eventType: "StoreQrGenerated",
        featureKey: "qr.generate",
        labelFa: "تولید QR",
      },
      {
        key: "storefront_visited",
        eventType: "StorefrontVisited",
        featureKey: "qr.storefront_visit",
        labelFa: "بازدید ویترین از QR",
      },
      {
        key: "membership_created",
        eventType: "MembershipCreated",
        featureKey: "qr.membership_join",
        labelFa: "عضویت پس از QR",
      },
    ],
  },
  pickup: {
    id: "pickup",
    labelFa: "قیف پیکاپ فروشگاهی",
    sampleRate: 1 as const,
    steps: [
      {
        key: "order_created",
        eventType: "OrderCreated",
        featureKey: "pickup.order_placed",
        labelFa: "ثبت سفارش پیکاپ",
      },
      {
        key: "ready_for_pickup",
        eventType: "OrderReadyForPickup",
        featureKey: "pickup.ready",
        labelFa: "آماده تحویل",
      },
      {
        key: "order_completed",
        eventType: "OrderCompleted",
        featureKey: "pickup.completed",
        labelFa: "تحویل تکمیل شد",
      },
    ],
  },
  loyalty: {
    id: "loyalty",
    labelFa: "قیف وفاداری",
    sampleRate: 1 as const,
    steps: [
      {
        key: "sale_completed",
        eventType: "SaleCompleted",
        featureKey: "loyalty.earn",
        labelFa: "فروش منجر به امتیاز",
      },
      {
        key: "points_earned",
        eventType: "PointsEarned",
        featureKey: "loyalty.earn",
        labelFa: "کسب امتیاز",
      },
      {
        key: "redeem_clicked",
        eventType: "LoyaltyRedeemClicked",
        featureKey: "loyalty.redeem",
        labelFa: "کلیک خرج امتیاز",
      },
      {
        key: "points_redeemed",
        eventType: "PointsRedeemed",
        featureKey: "loyalty.redeem",
        labelFa: "خرج امتیاز",
      },
    ],
  },
} as const satisfies Record<string, ProductFunnel>;

export type ProductFunnelId = keyof typeof PRODUCT_FUNNELS;

/** Catalog product/behavior event types this package instruments. */
export const PRODUCT_EVENT_TYPES = [
  "FeatureUsed",
  "AppOpened",
  "PosSessionStarted",
  "PosCheckoutCompleted",
  "BarcodeScanAttempted",
  "BarcodeScanSucceeded",
  "BarcodeScanFailed",
  "CustomerCaptureShown",
  "CustomerCaptureCompleted",
  "StoreQrGenerated",
  "StorefrontVisited",
  "MembershipCreated",
  "OrderCreated",
  "OrderReadyForPickup",
  "OrderCompleted",
  "SaleCompleted",
  "PointsEarned",
  "LoyaltyRedeemClicked",
  "PointsRedeemed",
  "DashboardWidgetViewed",
] as const;

export type ProductEventType = (typeof PRODUCT_EVENT_TYPES)[number];

/**
 * Persian metric names for merchant / PM dashboards later (ADR-059 Iranian UX).
 * Codes English; display always Persian + Jalali buckets at presentation.
 */
export const PRODUCT_METRIC_LABELS_FA = {
  featureAdoptionRate: "نرخ پذیرش قابلیت",
  uniqueMerchantsUsingFeature: "تعداد پذیرندهٔ فعال در قابلیت",
  featureEventCount: "تعداد رویداد قابلیت",
  funnelConversion: "نرخ تبدیل قیف",
  posCaptureRate: "نرخ ثبت شماره در صندوق",
  qrJoinRate: "نرخ عضویت از QR",
  pickupCompletionRate: "نرخ تکمیل پیکاپ",
  loyaltyRedeemRate: "نرخ خرج امتیاز وفاداری",
  checkoutDurationMs: "مدت تسویه صندوق (میلی‌ثانیه)",
} as const;

export type ProductMetricKey = keyof typeof PRODUCT_METRIC_LABELS_FA;

export const PRODUCT_INDEXES = {
  uniqueEventId: "{ eventId: 1 } unique",
  featureKeyTime: "{ featureKey: 1, occurredAt: -1 }",
  merchantTime: "{ merchantId: 1, occurredAt: -1 }",
  eventTypeTime: "{ eventType: 1, occurredAt: -1 }",
  funnelStepTime: "{ funnelId: 1, stepKey: 1, occurredAt: -1 }",
} as const;

export const PRODUCT_ANALYTICS_API = {
  track: "/api/v1/analytics/track",
  adminFeatures: "/api/v1/admin/product-analytics/features",
  trackAcceptedHttp: 202 as const,
} as const;

export const PRODUCT_ANALYTICS_CACHE = {
  adminFeatureAdoptionTtlSecondsMin: 60,
  adminFeatureAdoptionTtlSecondsMax: 300,
  note: "Redis cache-aside for admin widgets later (ARD-023)",
} as const;

export const PRODUCT_PII_POLICY = {
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
export const PRODUCT_ANALYTICS_UX_FA = {
  locale: "fa-IR" as const,
  dir: "rtl" as const,
  ADMIN_FEATURES_TITLE: "تحلیل پذیرش قابلیت‌ها",
  FUNNELS_TITLE: "قیف‌های فعال‌سازی",
  TIME_BUCKETS_HINT:
    "بازهٔ زمانی گزارش‌ها با تقویم شمسی و منطقه زمانی تهران نمایش داده می‌شود.",
  MONEY_DUAL_READ_HINT:
    "مبالغ مالی از پایگاه عملیاتی خوانده می‌شود؛ این صفحه فقط رفتار محصول را نشان می‌دهد.",
  TRACK_FAIL_OPEN_HINT:
    "قطع بودن تحلیل نباید جلوی ثبت فروش یا ثبت رویداد را بگیرد.",
} as const;

export const PRODUCT_ANALYTICS_UNICODE = {
  preserveUtf8PersianInProperties:
    UNICODE_PAYLOAD_SAFETY.preserveUtf8PersianInPayloads,
  eventCodesMayStayEnglish: UNICODE_PAYLOAD_SAFETY.eventCodesMayStayEnglish,
  humanLabelsPersian: true,
  merchantTimeBucketsJalaliTehran:
    UNICODE_PAYLOAD_SAFETY.merchantTimeBucketsJalaliTehran,
} as const;

export const PRODUCT_ANALYTICS_REQUIREMENTS = {
  featureKeyRegistry: true,
  funnelsPosQrPickupLoyalty: true,
  trackEventIsolatedVia065: true,
  mosProductCollection: true,
  dualReadMoneyFromPg: true,
  neverBlockOltp: true,
  noSecretsInProperties: true,
  phoneHashedOrScrubbed: true,
  persianMetricLabels: true,
  offCheckoutCriticalPath: true,
  unicodePersianPropertiesSafe: true,
  noProtocolDriverRequiredThisAdr: true,
  httpTrackDeferredToArd023: true,
} as const;

export const PRODUCT_ANALYTICS_PLACEMENT = {
  package: "src/modules/analytics/domain/product/",
  collection: MONGO_COLLECTIONS.product,
  rollupsCollection: PRODUCT_ANALYTICS_DECISION.rollupsCollection,
  detailAdr: "ADR-059",
  trackHelper: "trackEvent",
  modulesLater: "src/modules/analytics/",
} as const;

export const PRODUCT_METRIC_NAMES = {
  tracked: "product_analytics_tracked_total",
  duplicates: "product_analytics_duplicate_total",
  scrubbed: "product_analytics_properties_scrubbed_total",
  rejected: "product_analytics_rejected_total",
  queued: "product_analytics_queued_total",
} as const;

/** Canonical mos_product document (product analytics facts). */
export type ProductAnalyticsDocument = {
  eventId: string;
  eventType: string;
  featureKey: string | null;
  funnelId: string | null;
  stepKey: string | null;
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
  properties: Record<string, unknown>;
};

export type TrackEventInput = {
  eventId: string;
  eventType: string;
  merchantId: string;
  storeId?: string | null;
  actorId?: string | null;
  sessionId?: string | null;
  anonymousId?: string | null;
  featureKey?: string | null;
  funnelId?: string | null;
  stepKey?: string | null;
  properties?: Record<string, unknown>;
  occurredAt?: Date | string;
  correlationId?: string;
  source?: string;
  schemaVersion?: number;
};

export type TrackEventResult =
  | { status: "accepted"; eventId: string; disposition: "queued"; bufferId: string }
  | { status: "rejected"; eventId: string; reason: string };

export type ProductAnalyticsInsertResult =
  | { status: "inserted"; eventId: string }
  | { status: "duplicate"; eventId: string };

export type ProductAnalyticsStore = {
  insertIdempotent(
    doc: ProductAnalyticsDocument,
  ): Promise<ProductAnalyticsInsertResult>;
  findByEventId(eventId: string): Promise<ProductAnalyticsDocument | null>;
  findByMerchant(input: {
    merchantId: string;
    featureKey?: string;
    funnelId?: string;
    limit?: number;
  }): Promise<ProductAnalyticsDocument[]>;
  count(): Promise<number>;
};

export type ProductAnalyticsMetricsSnapshot = {
  tracked: number;
  duplicates: number;
  scrubbed: number;
  rejected: number;
  queued: number;
};

export type ProductAnalyticsMetrics = {
  recordTracked(): void;
  recordDuplicate(): void;
  recordScrubbed(count?: number): void;
  recordRejected(): void;
  recordQueued(): void;
  snapshot(): ProductAnalyticsMetricsSnapshot;
};

function asIso(value: Date | string | undefined, now: () => Date): string {
  if (value === undefined) return now().toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return value.toISOString();
}

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}

export function persianLabelForFeature(featureKey: string): string {
  if (isFeatureKey(featureKey)) {
    return PRODUCT_FEATURE_LABELS_FA[featureKey];
  }
  return featureKey;
}

export function persianLabelForMetric(metric: ProductMetricKey): string {
  return PRODUCT_METRIC_LABELS_FA[metric];
}

export function hashIranianPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, "");
  return createHash(PRODUCT_PII_POLICY.phoneHashAlgorithm)
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

export function scrubProductProperties(
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

  // Common phone field — prefer hash (product-analytics-architecture privacy).
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

export function buildProductAnalyticsDocument(
  input: TrackEventInput,
  options?: { now?: () => Date },
): ProductAnalyticsDocument {
  const now = options?.now ?? (() => new Date());
  if (!input.eventId?.trim()) {
    throw new Error("Product analytics document requires eventId (ADR-059).");
  }
  if (!input.eventType?.trim()) {
    throw new Error("Product analytics document requires eventType (ADR-059).");
  }
  if (!input.merchantId?.trim()) {
    throw new Error(
      "Product analytics document requires merchantId (ADR-059 / ADR-056).",
    );
  }
  if (input.eventType === "FeatureUsed" && !input.featureKey?.trim()) {
    throw new Error("FeatureUsed requires featureKey (ADR-059).");
  }

  const scrubbed = scrubProductProperties(input.properties);
  return {
    eventId: input.eventId,
    eventType: input.eventType,
    featureKey: input.featureKey ?? null,
    funnelId: input.funnelId ?? null,
    stepKey: input.stepKey ?? null,
    occurredAt: asIso(input.occurredAt, now),
    ingestedAt: now().toISOString(),
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    actorId: input.actorId ?? null,
    sessionId: input.sessionId ?? null,
    anonymousId: input.anonymousId ?? null,
    correlationId: input.correlationId ?? input.eventId,
    schemaVersion: input.schemaVersion ?? 1,
    source: input.source ?? "product_analytics",
    properties: {
      ...scrubbed.properties,
      phonesScrubbed: scrubbed.scrubCount,
      ...(input.featureKey
        ? { featureLabelFa: persianLabelForFeature(input.featureKey) }
        : {}),
    },
  };
}

export function toIngestRecord(
  doc: ProductAnalyticsDocument,
): AnalyticsIngestRecord {
  return {
    eventId: doc.eventId,
    eventType: doc.eventType,
    merchantId: doc.merchantId,
    storeId: doc.storeId,
    occurredAt: doc.occurredAt,
    ingestClass: PRODUCT_ANALYTICS_DECISION.ingestClass,
    correlationId: doc.correlationId,
    payload: {
      featureKey: doc.featureKey,
      funnelId: doc.funnelId,
      stepKey: doc.stepKey,
      actorId: doc.actorId,
      sessionId: doc.sessionId,
      anonymousId: doc.anonymousId,
      source: doc.source,
      schemaVersion: doc.schemaVersion,
      properties: doc.properties,
      collection: PRODUCT_ANALYTICS_DECISION.collection,
    },
  };
}

export function createInMemoryProductAnalyticsMetrics(): ProductAnalyticsMetrics {
  let tracked = 0;
  let duplicates = 0;
  let scrubbed = 0;
  let rejected = 0;
  let queued = 0;
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
    snapshot() {
      return { tracked, duplicates, scrubbed, rejected, queued };
    },
  };
}

/**
 * In-memory append-only mos_product store (tests / worker skeleton).
 */
export class InMemoryProductAnalyticsStore implements ProductAnalyticsStore {
  private readonly byEventId = new Map<string, ProductAnalyticsDocument>();

  async insertIdempotent(
    doc: ProductAnalyticsDocument,
  ): Promise<ProductAnalyticsInsertResult> {
    assertProductDocumentShape(doc);
    const existing = this.byEventId.get(doc.eventId);
    if (existing) {
      return { status: "duplicate", eventId: doc.eventId };
    }
    this.byEventId.set(doc.eventId, cloneProductDoc(doc));
    return { status: "inserted", eventId: doc.eventId };
  }

  async findByEventId(
    eventId: string,
  ): Promise<ProductAnalyticsDocument | null> {
    const existing = this.byEventId.get(eventId);
    return existing ? cloneProductDoc(existing) : null;
  }

  async findByMerchant(input: {
    merchantId: string;
    featureKey?: string;
    funnelId?: string;
    limit?: number;
  }): Promise<ProductAnalyticsDocument[]> {
    if (!input.merchantId?.trim()) {
      throw new Error(
        "Merchant-scoped product analytics query requires merchantId (ADR-059 / ADR-056).",
      );
    }
    const limit = input.limit ?? 100;
    return [...this.byEventId.values()]
      .filter((d) => {
        if (d.merchantId !== input.merchantId) return false;
        if (input.featureKey && d.featureKey !== input.featureKey) return false;
        if (input.funnelId && d.funnelId !== input.funnelId) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .slice(0, limit)
      .map(cloneProductDoc);
  }

  async count(): Promise<number> {
    return this.byEventId.size;
  }
}

function cloneProductDoc(
  doc: ProductAnalyticsDocument,
): ProductAnalyticsDocument {
  return {
    ...doc,
    properties: structuredClone(doc.properties),
  };
}

/** Sink that idempotently writes product docs (used with ADR-065 buffer). */
export function createProductAnalyticsSink(
  store: ProductAnalyticsStore,
  metrics?: ProductAnalyticsMetrics,
): AnalyticsIngestSink {
  return {
    async write(record) {
      const payload = record.payload;
      const doc: ProductAnalyticsDocument = {
        eventId: record.eventId,
        eventType: record.eventType,
        featureKey:
          typeof payload.featureKey === "string" ? payload.featureKey : null,
        funnelId:
          typeof payload.funnelId === "string" ? payload.funnelId : null,
        stepKey: typeof payload.stepKey === "string" ? payload.stepKey : null,
        occurredAt: record.occurredAt,
        ingestedAt: new Date().toISOString(),
        merchantId: record.merchantId,
        storeId: record.storeId,
        actorId: typeof payload.actorId === "string" ? payload.actorId : null,
        sessionId:
          typeof payload.sessionId === "string" ? payload.sessionId : null,
        anonymousId:
          typeof payload.anonymousId === "string"
            ? payload.anonymousId
            : null,
        correlationId: record.correlationId ?? record.eventId,
        schemaVersion:
          typeof payload.schemaVersion === "number" ? payload.schemaVersion : 1,
        source:
          typeof payload.source === "string"
            ? payload.source
            : "product_analytics",
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

export type TrackEventPort = {
  /**
   * Accept a product analytics event after / outside OLTP.
   * Isolation: never throws for sink/Mongo failures (ADR-065).
   */
  trackEvent(input: TrackEventInput): TrackEventResult;
};

export type CreateTrackEventPortOptions = {
  ingest: AnalyticsIngestPort;
  metrics?: ProductAnalyticsMetrics;
  now?: () => Date;
};

/**
 * Create trackEvent helper — scrub props, enqueue via ADR-065 isolating port.
 */
export function createTrackEventPort(
  options: CreateTrackEventPortOptions,
): TrackEventPort {
  const now = options.now ?? (() => new Date());
  const metrics = options.metrics;

  return {
    trackEvent(input) {
      try {
        const doc = buildProductAnalyticsDocument(input, { now });
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
          err instanceof Error ? err.message : "product_analytics_track_failed";
        // Isolation belt: callers (POS / storefront) always get a result, never throw.
        return {
          status: "rejected",
          eventId: input.eventId,
          reason,
        };
      }
    },
  };
}

/**
 * Convenience: memory store + ADR-065 buffer + isolating trackEvent.
 * flush() delivers into mos_product in-memory store.
 */
export function createProductAnalyticsStack(options?: {
  metrics?: ProductAnalyticsMetrics;
  ingestMetrics?: IngestMetrics;
  now?: () => Date;
}): {
  store: InMemoryProductAnalyticsStore;
  buffer: AnalyticsIngestBuffer;
  track: TrackEventPort;
  flush: () => Promise<FlushIngestResult>;
} {
  const store = new InMemoryProductAnalyticsStore();
  const productMetrics =
    options?.metrics ?? createInMemoryProductAnalyticsMetrics();
  const ingestMetrics =
    options?.ingestMetrics ?? createInMemoryIngestMetrics();
  const sink = createProductAnalyticsSink(store, productMetrics);
  const buffer = createAnalyticsIngestBuffer({
    sink,
    metrics: ingestMetrics,
    ...(options?.now !== undefined ? { now: options.now } : {}),
  });
  const ingest = createIsolatingAnalyticsIngestPort(buffer, ingestMetrics);
  const track = createTrackEventPort({
    ingest,
    metrics: productMetrics,
    ...(options?.now !== undefined ? { now: options.now } : {}),
  });
  return {
    store,
    buffer,
    track,
    flush: () => buffer.flush(),
  };
}

export function assertProductDocumentShape(doc: ProductAnalyticsDocument): void {
  if (!doc.eventId?.trim()) {
    throw new Error("Product analytics document requires eventId (ADR-059).");
  }
  if (!doc.eventType?.trim()) {
    throw new Error("Product analytics document requires eventType (ADR-059).");
  }
  if (!doc.merchantId?.trim()) {
    throw new Error(
      "Product analytics document requires merchantId (ADR-059 / ADR-056).",
    );
  }
  if (doc.eventType === "FeatureUsed" && !doc.featureKey?.trim()) {
    throw new Error("FeatureUsed requires featureKey (ADR-059).");
  }
}

export function assertCollectionIsMosProduct(name: string): void {
  if (name !== MONGO_COLLECTIONS.product) {
    throw new Error(
      `Product analytics collection must be "${MONGO_COLLECTIONS.product}" (ADR-059 / ADR-056); got "${name}".`,
    );
  }
}

export function assertProductAnalyticsImplementedHere(packagePath: string): void {
  if (packagePath !== PRODUCT_ANALYTICS_PLACEMENT.package) {
    throw new Error(
      `Product analytics package is ${PRODUCT_ANALYTICS_PLACEMENT.package}; got "${packagePath}".`,
    );
  }
}

export function assertTrackNeverBlocksOltp(onCriticalPath: boolean): void {
  if (onCriticalPath) {
    throw new Error(
      "Product analytics track must stay off checkout critical path (ADR-059).",
    );
  }
  if (PRODUCT_ANALYTICS_DECISION.onCheckoutCriticalPath !== false) {
    throw new Error(
      "PRODUCT_ANALYTICS_DECISION.onCheckoutCriticalPath must be false (ADR-059).",
    );
  }
  if (ISOLATED_INGEST_PATHS.trackIngest.onCriticalPath !== false) {
    throw new Error(
      "trackIngest path must stay off critical path (ADR-059 / ADR-065).",
    );
  }
  if (ISOLATED_INGEST_PATHS.trackIngest.failOpenWhenMongoDown !== true) {
    throw new Error(
      "trackIngest must fail-open when Mongo is down (ADR-059 / ADR-065).",
    );
  }
}

export function assertDualReadMoneyFromPg(): void {
  if (!PRODUCT_ANALYTICS_DECISION.dualReadMoneyFromPg) {
    throw new Error(
      "Product analytics must dual-read money from PostgreSQL (ADR-059).",
    );
  }
  if (DUAL_READ_DISCIPLINE.moneyAndAccountingTruth !== "postgresql_projections") {
    throw new Error(
      "Money truth must remain postgresql_projections (ADR-059 / ADR-014).",
    );
  }
  if (!DUAL_READ_DISCIPLINE.productAnalyticsExplainsNorthStar) {
    throw new Error(
      "Product analytics explains North Star; does not replace OLTP (ADR-059).",
    );
  }
}

export function assertFunnelCoverage(ids: readonly ProductFunnelId[]): void {
  const required: ProductFunnelId[] = [
    "pos_phone_capture",
    "qr_acquisition",
    "pickup",
    "loyalty",
  ];
  for (const id of required) {
    if (!ids.includes(id)) {
      throw new Error(`Missing required product funnel "${id}" (ADR-059).`);
    }
    const funnel = PRODUCT_FUNNELS[id];
    if (funnel.sampleRate !== 1) {
      throw new Error(
        `Funnel "${id}" must be 100% sampled (ADR-059 / analytics-rules).`,
      );
    }
    if (funnel.steps.length < 2) {
      throw new Error(`Funnel "${id}" needs at least two steps (ADR-059).`);
    }
  }
}

export function assertNoSecretsInProperties(
  properties: Record<string, unknown>,
): void {
  for (const key of FORBIDDEN_PROPERTY_KEYS) {
    if (key in properties) {
      throw new Error(
        `Product analytics properties must not include secret key "${key}" (ADR-059).`,
      );
    }
  }
  const blob = JSON.stringify(properties);
  if (/\botp[=:\s]\d{4,8}\b/i.test(blob)) {
    throw new Error("Product analytics must not retain OTP codes (ADR-059).");
  }
}

export function assertPersianPropertyPreserved(
  original: string,
  stored: string,
): void {
  if (original !== stored) {
    throw new Error(
      "Product analytics must preserve UTF-8 Persian property strings (ADR-059).",
    );
  }
  if (!PRODUCT_ANALYTICS_UNICODE.preserveUtf8PersianInProperties) {
    throw new Error(
      "PRODUCT_ANALYTICS_UNICODE.preserveUtf8PersianInProperties must be true (ADR-059).",
    );
  }
}

export function assertKnownMongoProductCapability(): void {
  if (!MONGO_ANALYTICS_PLANE.capabilities.includes("product_analytics")) {
    throw new Error(
      "MONGO_ANALYTICS_PLANE must include product_analytics (ADR-059 / ADR-014).",
    );
  }
  if (TENANCY_AND_AUTHZ.merchantQueriesMustFilterMerchantId !== true) {
    throw new Error(
      "Merchant product analytics queries must filter merchantId (ADR-059 / ADR-056).",
    );
  }
}

export const PRODUCT_ANALYTICS = {
  decision: PRODUCT_ANALYTICS_DECISION,
  featureKeys: FEATURE_KEYS,
  featureLabelsFa: PRODUCT_FEATURE_LABELS_FA,
  funnels: PRODUCT_FUNNELS,
  eventTypes: PRODUCT_EVENT_TYPES,
  metricLabelsFa: PRODUCT_METRIC_LABELS_FA,
  indexes: PRODUCT_INDEXES,
  api: PRODUCT_ANALYTICS_API,
  cache: PRODUCT_ANALYTICS_CACHE,
  pii: PRODUCT_PII_POLICY,
  unicode: PRODUCT_ANALYTICS_UNICODE,
  uxFa: PRODUCT_ANALYTICS_UX_FA,
  requirements: PRODUCT_ANALYTICS_REQUIREMENTS,
  placement: PRODUCT_ANALYTICS_PLACEMENT,
  metricNames: PRODUCT_METRIC_NAMES,
} as const;
