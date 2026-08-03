/**
 * ADR-014 — Analytics Domain Boundaries (OLTP vs Mongo).
 *
 * Merchant operational dashboards (AN-*) read PostgreSQL projections.
 * Product / audit / warehouse / clickstream / session / management telemetries
 * live on MongoDB. Money truth stays PG; Mongo is never OLTP SoT.
 * Analytics/warehouse must stay off the checkout critical path.
 *
 * Normative: ADR-014, docs/architecture/analytics-architecture.md.
 * Mongo plane detail → ADR-056; warehouse → ADR-057 (`src/event-warehouse`);
 * merchant widgets → ADR-063 (`src/merchant-oltp-analytics` + `src/modules/analytics`);
 * management dashboards → ADR-062 (`src/mgmt-dashboard-analytics`).
 */

import { ANALYTICS_CRITICAL_PATH, OUTBOX_CONSUMERS } from "../event-driven/index.js";
import { DATA_PLANES, LOCALE_DEFAULTS, PRODUCT_ARCHITECTURE } from "../product-architecture/index.js";
import { COMPOSE_DATA_PLANES } from "../docker-compose-parity/index.js";
import { getContextById } from "../bounded-contexts/index.js";

/** ADR-014 Decision — binding dual-plane analytics stance. */
export const ANALYTICS_BOUNDARIES_DECISION = {
  adr: "ADR-014",
  pattern: "dual_plane_oltp_pg_vs_mongo_telemetry" as const,
  merchantDashboardsStore: "postgresql_projections" as const,
  productPlatformStore: "mongodb" as const,
  moneyTruthStore: "postgresql" as const,
  mongoNeverOltpSourceOfTruth: true,
  dualReadDiscipline: true,
  analyticsOnCheckoutCriticalPath: false,
  platformAnalyticsAudience: "admin_only" as const,
  architecturePackage: "src/analytics-boundaries/",
  analyticsArchitectureDoc: "docs/architecture/analytics-architecture.md",
  /** ADR-056 — `src/mongodb-analytics` + thin `src/infrastructure/mongodb` stub. */
  mongoPlaneImplementedIn: "src/mongodb-analytics/",
  mongoPlaneAdr: "ADR-056",
  warehouseImplementedIn: "src/event-warehouse/",
  warehouseAdr: "ADR-057",
  productAnalyticsImplementedIn: "src/product-analytics/",
  productAnalyticsAdr: "ADR-059",
  clickstreamImplementedIn: "src/clickstream/",
  clickstreamAdr: "ADR-060",
  sessionAnalyticsImplementedIn: "src/session-analytics/",
  sessionAnalyticsAdr: "ADR-061",
  /** ADR-063 — projections + counter ports; HTTP/UI remain ARD-016 / ADR-088. */
  merchantOltpWidgetsImplementedIn: "src/merchant-oltp-analytics/",
  merchantOltpWidgetsAdr: "ADR-063",
  merchantOltpModulesPackage: "src/modules/analytics/",
  merchantOltpHttpAndUiDeferredTo: "ARD-016",
  /** ADR-062 — mos_mgmt rollups; HTTP/UI remain ARD-025 / ADR-089. */
  mgmtDashboardImplementedIn: "src/mgmt-dashboard-analytics/",
  mgmtDashboardAdr: "ADR-062",
  mgmtDashboardHttpAndUiDeferredTo: "ARD-025",
  relatedArds: {
    merchantOltp: "ARD-016",
    analyticsPlatform: "ARD-021",
    management: "ARD-025",
  },
} as const;

/** Merchant OLTP dashboard capabilities (AN-01..04) — PostgreSQL projections. */
export const MERCHANT_OLTP_ANALYTICS = {
  plane: "postgresql_oltp" as const,
  store: "postgresql" as const,
  ard: "ARD-016",
  detailAdr: "ADR-063",
  architecturePackage: "src/merchant-oltp-analytics/",
  modulesPackage: "src/modules/analytics/",
  capabilities: ["AN-01", "AN-02", "AN-03", "AN-04"] as const,
  widgets: [
    "overview",
    "revenue",
    "customers",
    "retention",
  ] as const,
  projectionTablesIllustrative: [
    "analytics_daily_revenue",
    "analytics_customer_stats",
    "analytics_retention_stats",
  ] as const,
  cacheTtlSeconds: 60,
  apiPaths: {
    overview: "/api/v1/analytics/overview",
    revenue: "/api/v1/analytics/revenue",
    customers: "/api/v1/analytics/customers",
    retention: "/api/v1/analytics/retention",
  },
  moneyFiguresMustReconcileToPg: true,
  redisCacheAside: true,
} as const;

export type MerchantOltpCapability =
  (typeof MERCHANT_OLTP_ANALYTICS.capabilities)[number];

/** Mongo analytics / telemetry plane capabilities — never money SoT. */
export const MONGO_ANALYTICS_PLANE = {
  plane: "mongodb_analytics" as const,
  store: "mongodb" as const,
  neverOltpSourceOfTruth: true,
  platformArd: "ARD-021",
  detailAdr: "ADR-056",
  capabilities: [
    "product_analytics",
    "event_warehouse",
    "audit_logging",
    "user_behavior",
    "clickstream",
    "session_analytics",
    "feature_usage",
    "management_dashboards",
    "security_monitoring",
  ] as const,
  relatedArds: {
    platform: "ARD-021",
    audit: "ARD-022",
    product: "ARD-023",
    warehouse: "ARD-024",
    management: "ARD-025",
    security: "ARD-026",
    behavior: "ARD-027",
    observability: "ARD-028",
  },
  ingestApiPath: "/api/v1/analytics/ingest",
  warehouseOutboxConsumer: "mongodb_warehouse" as const,
  /** Admin / platform audience — not merchant AN-* widgets. */
  managementAudience: "platform_admin" as const,
} as const;

export type MongoAnalyticsCapability =
  (typeof MONGO_ANALYTICS_PLANE.capabilities)[number];

/** Dual-read: accounting truth from PG; engagement from Mongo. */
export const DUAL_READ_DISCIPLINE = {
  moneyAndAccountingTruth: "postgresql_projections" as const,
  engagementAndProductUsage: "mongodb" as const,
  neverShowMongoAsAccountingTruth: true,
  northStarFromOltp: true,
  productAnalyticsExplainsNorthStar: true,
} as const;

/**
 * Critical-path isolation — align with ADR-036 ANALYTICS_CRITICAL_PATH.
 * Checkout / CompleteSale must not await analytics or warehouse writes.
 */
export const ANALYTICS_CRITICAL_PATH_BOUNDARY = {
  onCheckoutCriticalPath: false,
  warehouseMirrorViaOutbox: true,
  syncMongoWriteInCompleteSaleForbidden: true,
  syncPgProjectionAwaitInCompleteSaleForbidden: true,
  preferOutboxAfterCommit: true,
  alignsWith: ANALYTICS_CRITICAL_PATH,
  outboxWarehouseConsumer: OUTBOX_CONSUMERS.mongodb_warehouse,
} as const;

/**
 * Iranian First — merchant-facing analytics reports.
 * Event codes may remain English; human labels/titles/exports are Persian.
 * Full chart UI → ADR-088 / ARD-016 (+ uiuxpromax); titles/projections → ADR-063.
 */
export const MERCHANT_ANALYTICS_UX_FA = {
  locale: LOCALE_DEFAULTS.locale,
  lang: LOCALE_DEFAULTS.language,
  dir: LOCALE_DEFAULTS.dir,
  calendar: LOCALE_DEFAULTS.calendar,
  timeZone: LOCALE_DEFAULTS.timeZone,
  moneyDisplayUnit: LOCALE_DEFAULTS.moneyDisplayUnit,
  overviewTitle: "نمای کلی",
  revenueTitle: "گزارش درآمد",
  customersTitle: "گزارش مشتری‌ها",
  retentionTitle: "گزارش بازگشت مشتری",
  emptyState: "هنوز داده‌ای برای نمایش نیست.",
  loadError: "بارگذاری گزارش ممکن نشد. دوباره تلاش کنید.",
  dateRangeHint: "بازه زمانی بر اساس تقویم شمسی و ساعت تهران.",
  tabletSkimable: true,
  avoidDesktopOnlyBiTools: true,
  eventCodesMayStayEnglish: true,
} as const;

export const ANALYTICS_BOUNDARIES_PLACEMENT = {
  package: "src/analytics-boundaries/",
  oltpContextId: "analytics_oltp" as const,
  platformContextId: "analytics_platform" as const,
  detailAdr: "ADR-014",
  mongoPlaneAdr: "ADR-056",
  mongoPlanePackage: "src/mongodb-analytics/",
} as const;

export const ANALYTICS_BOUNDARIES_REQUIREMENTS = {
  merchantAnOnPostgresql: true,
  productPlatformOnMongodb: true,
  moneyTruthPostgresql: true,
  mongoNeverOltpSot: true,
  dualReadDiscipline: true,
  analyticsOffCheckoutCriticalPath: true,
  platformAnalyticsAdminOnly: true,
  merchantReportsPersianJalaliRtl: true,
} as const;

export function assertMerchantAnOnPostgresql(
  capability: MerchantOltpCapability,
  store: string,
): void {
  if (!MERCHANT_OLTP_ANALYTICS.capabilities.includes(capability)) {
    throw new Error(`Unknown merchant AN capability: ${capability} (ADR-014).`);
  }
  if (store !== "postgresql" && store !== "postgresql_projections") {
    throw new Error(
      `Merchant AN-* dashboards must use PostgreSQL projections (ADR-014); got "${store}".`,
    );
  }
  if (ANALYTICS_BOUNDARIES_DECISION.merchantDashboardsStore !== "postgresql_projections") {
    throw new Error(
      "ANALYTICS_BOUNDARIES_DECISION.merchantDashboardsStore must be postgresql_projections (ADR-014).",
    );
  }
}

export function assertMongoCapabilityOnAnalyticsPlane(
  capability: MongoAnalyticsCapability,
  role: string,
): void {
  if (!MONGO_ANALYTICS_PLANE.capabilities.includes(capability)) {
    throw new Error(`Unknown Mongo analytics capability: ${capability} (ADR-014).`);
  }
  if (role === "oltp_source_of_truth") {
    throw new Error(
      "Mongo analytics capabilities must never be OLTP source of truth (ADR-014 / ADR-056).",
    );
  }
  if (!MONGO_ANALYTICS_PLANE.neverOltpSourceOfTruth) {
    throw new Error(
      "MONGO_ANALYTICS_PLANE.neverOltpSourceOfTruth must be true (ADR-014).",
    );
  }
}

export function assertMoneyTruthFromPostgresql(store: string): void {
  if (store !== "postgresql" && store !== "postgresql_projections") {
    throw new Error(
      `Money / accounting dashboard truth must come from PostgreSQL (ADR-014); got "${store}".`,
    );
  }
  if (DUAL_READ_DISCIPLINE.moneyAndAccountingTruth !== "postgresql_projections") {
    throw new Error(
      "DUAL_READ_DISCIPLINE.moneyAndAccountingTruth must be postgresql_projections (ADR-014).",
    );
  }
}

export function assertMongoNeverOltpSot(planeRole: string): void {
  if (planeRole === "oltp_source_of_truth") {
    throw new Error(
      "MongoDB must never be the OLTP source of truth (ADR-014 / ADR-056).",
    );
  }
  if (ANALYTICS_BOUNDARIES_DECISION.mongoNeverOltpSourceOfTruth !== true) {
    throw new Error(
      "ANALYTICS_BOUNDARIES_DECISION.mongoNeverOltpSourceOfTruth must be true (ADR-014).",
    );
  }
  if (COMPOSE_DATA_PLANES.mongo.neverOltpSourceOfTruth !== true) {
    throw new Error(
      "Compose mongo plane must set neverOltpSourceOfTruth (ADR-014 / ADR-066).",
    );
  }
  if (PRODUCT_ARCHITECTURE.dataPlanes.oltp !== "postgresql") {
    throw new Error(
      `PRODUCT_ARCHITECTURE.dataPlanes.oltp must be "postgresql" (ADR-014); got "${PRODUCT_ARCHITECTURE.dataPlanes.oltp}".`,
    );
  }
}

export function assertAnalyticsOffCheckoutCriticalPath(
  blocksCheckout: boolean,
): void {
  if (blocksCheckout) {
    throw new Error(
      "Analytics/warehouse must not run on the checkout critical path (ADR-014 / ADR-036).",
    );
  }
  if (ANALYTICS_BOUNDARIES_DECISION.analyticsOnCheckoutCriticalPath !== false) {
    throw new Error(
      "ANALYTICS_BOUNDARIES_DECISION.analyticsOnCheckoutCriticalPath must be false (ADR-014).",
    );
  }
  if (ANALYTICS_CRITICAL_PATH.onCheckoutCriticalPath !== false) {
    throw new Error(
      "ANALYTICS_CRITICAL_PATH.onCheckoutCriticalPath must be false (ADR-014 / ADR-036).",
    );
  }
  if (OUTBOX_CONSUMERS.mongodb_warehouse.onCriticalPath !== false) {
    throw new Error(
      "mongodb_warehouse outbox consumer must stay off critical path (ADR-014).",
    );
  }
}

export function assertPlatformAnalyticsAdminOnly(audience: string): void {
  if (audience !== "admin_only" && audience !== "platform_admin") {
    throw new Error(
      `Platform / management analytics must be admin-only (ADR-014); got "${audience}".`,
    );
  }
  if (ANALYTICS_BOUNDARIES_DECISION.platformAnalyticsAudience !== "admin_only") {
    throw new Error(
      "ANALYTICS_BOUNDARIES_DECISION.platformAnalyticsAudience must be admin_only (ADR-014).",
    );
  }
}

export function assertMerchantAnalyticsUxFa(): void {
  if (MERCHANT_ANALYTICS_UX_FA.dir !== "rtl") {
    throw new Error("Merchant analytics UX must be RTL (ADR-014 Iranian First).");
  }
  if (MERCHANT_ANALYTICS_UX_FA.calendar !== "jalali") {
    throw new Error(
      "Merchant analytics time buckets must use Jalali (ADR-014 Iranian First).",
    );
  }
  if (MERCHANT_ANALYTICS_UX_FA.timeZone !== "Asia/Tehran") {
    throw new Error(
      "Merchant analytics must use Asia/Tehran (ADR-014 Iranian First).",
    );
  }
  if (!/[\u0600-\u06FF]/.test(MERCHANT_ANALYTICS_UX_FA.overviewTitle)) {
    throw new Error(
      "Merchant analytics titles must include Persian script (ADR-014 Iranian First).",
    );
  }
}

export function assertAnalyticsPlaneAlignment(): void {
  if (DATA_PLANES.oltp !== "postgresql" || DATA_PLANES.analytics !== "mongodb") {
    throw new Error(
      "DATA_PLANES must split oltp=postgresql and analytics=mongodb (ADR-014).",
    );
  }
  const oltpCtx = getContextById("analytics_oltp");
  const platformCtx = getContextById("analytics_platform");
  if (oltpCtx.plane !== "postgresql_oltp") {
    throw new Error(
      `bounded-contexts analytics_oltp must be postgresql_oltp (ADR-014); got "${oltpCtx.plane}".`,
    );
  }
  if (platformCtx.plane !== "mongodb_analytics") {
    throw new Error(
      `bounded-contexts analytics_platform must be mongodb_analytics (ADR-014); got "${platformCtx.plane}".`,
    );
  }
}

export const ANALYTICS_BOUNDARIES = {
  decision: ANALYTICS_BOUNDARIES_DECISION,
  merchantOltp: MERCHANT_OLTP_ANALYTICS,
  mongoPlane: MONGO_ANALYTICS_PLANE,
  dualRead: DUAL_READ_DISCIPLINE,
  criticalPath: ANALYTICS_CRITICAL_PATH_BOUNDARY,
  uxFa: MERCHANT_ANALYTICS_UX_FA,
  placement: ANALYTICS_BOUNDARIES_PLACEMENT,
  requirements: ANALYTICS_BOUNDARIES_REQUIREMENTS,
  assertMerchantAnOnPostgresql,
  assertMongoCapabilityOnAnalyticsPlane,
  assertMoneyTruthFromPostgresql,
  assertMongoNeverOltpSot,
  assertAnalyticsOffCheckoutCriticalPath,
  assertPlatformAnalyticsAdminOnly,
  assertMerchantAnalyticsUxFa,
  assertAnalyticsPlaneAlignment,
} as const;
