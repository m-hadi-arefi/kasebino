/**
 * ADR-063 — Merchant OLTP Dashboard Analytics.
 *
 * PostgreSQL projection read models for AN-01..04 (overview / revenue /
 * customers / retention North Star). Sales + membership counter ports feed
 * merchant overview — money truth stays PG (never Mongo). Redis TTL 60s
 * (ADR-053). Persian widget titles; Jalali/`Asia/Tehran` range helpers stub.
 * In-memory ports for tests; Drizzle migrations / HTTP APIs / live Redis
 * → ARD-016. Merchant dashboard UI stubs → ADR-088 (`src/merchant-dashboard`).
 *
 * Normative: ADR-014, ADR-053, ADR-054, docs/architecture/analytics-architecture.md,
 * docs/product/success-metrics.md.
 */

import {
  DUAL_READ_DISCIPLINE,
  MERCHANT_ANALYTICS_UX_FA,
  MERCHANT_OLTP_ANALYTICS,
  assertMerchantAnOnPostgresql,
  assertMoneyTruthFromPostgresql,
  type MerchantOltpCapability,
} from "../analytics-boundaries/index.js";
import {
  CACHE_TTL_SECONDS,
  buildDashboardOverviewKey,
  buildDashboardRevenueKey,
} from "../cache-keys/index.js";
import { LOCALE_DEFAULTS } from "../product-architecture/index.js";

/** ADR-063 Decision — binding merchant OLTP dashboard stance. */
export const MERCHANT_OLTP_DASHBOARD_DECISION = {
  adr: "ADR-063",
  pattern: "pg_projections_redis_60s_for_an_01_04" as const,
  store: "postgresql_projections" as const,
  moneyTruthStore: DUAL_READ_DISCIPLINE.moneyAndAccountingTruth,
  mongoNeverMoneyTruth: true,
  cacheTtlSeconds: 60,
  northStar: "monthly_returning_customers" as const,
  northStarDefinition:
    "Customers who make more than one purchase within a rolling 30-day window.",
  capabilities: MERCHANT_OLTP_ANALYTICS.capabilities,
  projectionTables: MERCHANT_OLTP_ANALYTICS.projectionTablesIllustrative,
  apiPaths: MERCHANT_OLTP_ANALYTICS.apiPaths,
  onCheckoutCriticalPath: false,
  architecturePackage: "src/merchant-oltp-analytics/",
  modulesPackage: "src/modules/analytics/",
  boundariesPackage: "src/analytics-boundaries/",
  cacheKeysPackage: "src/cache-keys/",
  cacheInvalidationPackage: "src/cache-invalidation/",
  architectureDoc: "docs/architecture/analytics-architecture.md",
  relatedArd: "ARD-016",
  /** Persian AN overview stubs landed; live chart pages remain ARD-016. */
  uiStubsAdr: "ADR-088",
  uiLiveDeferredTo: "ARD-016",
} as const;

/** Events that maintain / invalidate merchant OLTP projections. */
export const MERCHANT_OLTP_CONSUMED_EVENTS = [
  "SaleCompleted",
  "OrderPaid",
  "CustomerReturned",
] as const;

export type MerchantOltpConsumedEvent =
  (typeof MERCHANT_OLTP_CONSUMED_EVENTS)[number];

/**
 * Redis cache for AN widgets — TTL 60s (ADR-053 analytics class).
 * Live Redis wiring remains ARD-016; this records the binding note.
 */
export const MERCHANT_OLTP_CACHE = {
  ttlSeconds: MERCHANT_OLTP_DASHBOARD_DECISION.cacheTtlSeconds,
  alignsWithCacheKeysAnalyticsTtl: true,
  overviewKeyParts: ["analytics", "overview"] as const,
  revenueKeyParts: ["analytics", "revenue", "{range}"] as const,
  retentionKeyParts: ["analytics", "retention"] as const,
  invalidateOn: MERCHANT_OLTP_CONSUMED_EVENTS,
  noteEn:
    "Merchant OLTP dashboard widgets use cache-aside Redis with TTL 60s; rebuild from PostgreSQL projections on miss; invalidate on SaleCompleted / OrderPaid / CustomerReturned (ADR-053 / ADR-054).",
  noteFa:
    "ویجت‌های داشبورد فروشنده با کش Redis و TTL شصت ثانیه؛ در miss از projectionهای PostgreSQL بازسازی می‌شود.",
} as const;

/**
 * Persian widget titles for merchant dashboards (ADR-063 Iranian UX).
 * Codes English; human titles always Persian.
 */
export const MERCHANT_OLTP_TITLES_FA = {
  overview: MERCHANT_ANALYTICS_UX_FA.overviewTitle,
  revenue: MERCHANT_ANALYTICS_UX_FA.revenueTitle,
  customers: MERCHANT_ANALYTICS_UX_FA.customersTitle,
  retention: MERCHANT_ANALYTICS_UX_FA.retentionTitle,
  northStar: "مشتریان بازمانده ماهانه",
  salesCount: "تعداد فروش",
  revenueToman: "درآمد (تومان)",
  memberships: "عضویت‌های فعال",
  newMemberships: "عضویت‌های جدید",
  returningCustomers: "مشتریان بازگشتی",
  emptyState: MERCHANT_ANALYTICS_UX_FA.emptyState,
  loadError: MERCHANT_ANALYTICS_UX_FA.loadError,
  dateRangeHint: MERCHANT_ANALYTICS_UX_FA.dateRangeHint,
} as const;

export type MerchantOltpTitleKey = keyof typeof MERCHANT_OLTP_TITLES_FA;

/** AN capability → reserved API path + Persian title. */
export const AN_CAPABILITY_MAP = {
  "AN-01": {
    widget: "overview" as const,
    path: MERCHANT_OLTP_ANALYTICS.apiPaths.overview,
    titleFa: MERCHANT_OLTP_TITLES_FA.overview,
  },
  "AN-02": {
    widget: "revenue" as const,
    path: MERCHANT_OLTP_ANALYTICS.apiPaths.revenue,
    titleFa: MERCHANT_OLTP_TITLES_FA.revenue,
  },
  "AN-03": {
    widget: "customers" as const,
    path: MERCHANT_OLTP_ANALYTICS.apiPaths.customers,
    titleFa: MERCHANT_OLTP_TITLES_FA.customers,
  },
  "AN-04": {
    widget: "retention" as const,
    path: MERCHANT_OLTP_ANALYTICS.apiPaths.retention,
    titleFa: MERCHANT_OLTP_TITLES_FA.retention,
  },
} as const;

/**
 * Iranian First — viewer stubs; full charts → ADR-088 / uiuxpromax.
 */
export const MERCHANT_OLTP_UX_FA = {
  locale: LOCALE_DEFAULTS.locale,
  lang: LOCALE_DEFAULTS.language,
  dir: LOCALE_DEFAULTS.dir,
  calendar: LOCALE_DEFAULTS.calendar,
  timeZone: LOCALE_DEFAULTS.timeZone,
  moneyDisplayUnit: LOCALE_DEFAULTS.moneyDisplayUnit,
  titles: MERCHANT_OLTP_TITLES_FA,
  tabletSkimable: true,
  avoidDesktopOnlyBiTools: true,
  eventCodesMayStayEnglish: true,
} as const;

export type IsoDay = string; // YYYY-MM-DD (UTC or Tehran-day key for projections)

export type AnalyticsDateRange = {
  fromDay: IsoDay;
  toDay: IsoDay;
  /** Merchant-facing calendar for this range (always jalali for UX). */
  calendar: "jalali";
  timeZone: "Asia/Tehran";
  /** Stub flag — full Jalali picker → ARD-016 UI. */
  jalaliHelperStub: true;
  labelFa: string;
};

/**
 * Jalali / Asia/Tehran range helpers stub (ADR-063).
 * Does not implement a full Jalali calendar library — returns Tehran-scoped
 * metadata and ISO day bounds for projection queries. Real conversion → ARD-016.
 */
export function stubJalaliRange(input?: {
  /** Inclusive start day (ISO YYYY-MM-DD). Default: 30 days ago UTC date. */
  fromDay?: IsoDay;
  /** Inclusive end day (ISO YYYY-MM-DD). Default: today UTC date. */
  toDay?: IsoDay;
  /** Optional human Jalali label overlay (not validated this cycle). */
  labelFa?: string;
  now?: () => Date;
}): AnalyticsDateRange {
  const now = input?.now ?? (() => new Date());
  const end = input?.toDay ?? toIsoDay(now());
  const start =
    input?.fromDay ??
    toIsoDay(new Date(Date.parse(`${end}T00:00:00.000Z`) - 29 * 86_400_000));
  if (!isIsoDay(start) || !isIsoDay(end)) {
    throw new Error(
      "Jalali range stub requires ISO YYYY-MM-DD day bounds (ADR-063).",
    );
  }
  if (start > end) {
    throw new Error(
      "Jalali range stub: fromDay must be <= toDay (ADR-063).",
    );
  }
  return {
    fromDay: start,
    toDay: end,
    calendar: "jalali",
    timeZone: "Asia/Tehran",
    jalaliHelperStub: true,
    labelFa:
      input?.labelFa ??
      `بازه ${start} تا ${end} (تقویم شمسی / Asia/Tehran — تبدیل کامل بعداً)`,
  };
}

export function isIsoDay(value: string): value is IsoDay {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Asia/Tehran calendar day for Jalali boundary alignment (ADR-106).
 * Day keys remain ISO YYYY-MM-DD; presentation uses Jalali.
 */
export function toTehranIsoDay(date: Date): IsoDay {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Unable to format Asia/Tehran ISO day (ADR-106).");
  }
  return `${year}-${month}-${day}`;
}

/** Prefer Tehran day bounds for merchant dashboards (ADR-106). */
export function toIsoDay(date: Date): IsoDay {
  return toTehranIsoDay(date);
}

/** Rolling 30-day North Star window (UTC day keys; presentation Jalali). */
export function northStarRollingRange(now?: () => Date): AnalyticsDateRange {
  return now ? stubJalaliRange({ now }) : stubJalaliRange();
}

/** Sales counters port — reads OLTP / projection-backed sale aggregates. */
export type SalesCountersPort = {
  countCompletedSales(input: {
    merchantId: string;
    storeId?: string | null;
    range: AnalyticsDateRange;
  }): Promise<{ salesCount: number; revenueMinor: bigint }>;
  /**
   * Distinct customers with >1 completed sale in rolling 30d (North Star).
   */
  countMonthlyReturningCustomers(input: {
    merchantId: string;
    storeId?: string | null;
    range?: AnalyticsDateRange;
  }): Promise<number>;
};

/** Membership counters port — store memberships (ADR-007), not Mongo. */
export type MembershipCountersPort = {
  countActiveMemberships(input: {
    merchantId: string;
    storeId?: string | null;
  }): Promise<number>;
  countNewMemberships(input: {
    merchantId: string;
    storeId?: string | null;
    range: AnalyticsDateRange;
  }): Promise<number>;
};

/** AN-01 merchant overview projection (PG read model). */
export type MerchantOverviewProjection = {
  merchantId: string;
  storeId: string | null;
  capability: "AN-01";
  titleFa: string;
  range: AnalyticsDateRange;
  salesCount: number;
  /** Integer minor units (display as تومان at presentation). */
  revenueMinor: bigint;
  activeMemberships: number;
  newMemberships: number;
  /** North Star: Monthly Returning Customers. */
  monthlyReturningCustomers: number;
  moneyTruthStore: "postgresql_projections";
  cacheTtlSeconds: 60;
  generatedAt: string;
};

export type BuildOverviewInput = {
  merchantId: string;
  storeId?: string | null;
  range?: AnalyticsDateRange;
  sales: SalesCountersPort;
  memberships: MembershipCountersPort;
  now?: () => Date;
};

/**
 * Build AN-01 overview from sales + membership counter ports (PG plane).
 * Does not scan raw sale history on the request path beyond port impls.
 */
export async function buildMerchantOverview(
  input: BuildOverviewInput,
): Promise<MerchantOverviewProjection> {
  if (!input.merchantId?.trim()) {
    throw new Error(
      "Merchant overview requires merchantId (ADR-063 / multi-tenant).",
    );
  }
  assertMerchantAnOnPostgresql("AN-01", "postgresql_projections");
  assertMoneyTruthFromPostgresql("postgresql_projections");

  const now = input.now ?? (() => new Date());
  const range = input.range ?? stubJalaliRange({ now });
  const storeId = input.storeId ?? null;

  const [sales, activeMemberships, newMemberships, monthlyReturningCustomers] =
    await Promise.all([
      input.sales.countCompletedSales({
        merchantId: input.merchantId,
        storeId,
        range,
      }),
      input.memberships.countActiveMemberships({
        merchantId: input.merchantId,
        storeId,
      }),
      input.memberships.countNewMemberships({
        merchantId: input.merchantId,
        storeId,
        range,
      }),
      input.sales.countMonthlyReturningCustomers({
        merchantId: input.merchantId,
        storeId,
        range: northStarRollingRange(now),
      }),
    ]);

  return {
    merchantId: input.merchantId,
    storeId,
    capability: "AN-01",
    titleFa: MERCHANT_OLTP_TITLES_FA.overview,
    range,
    salesCount: sales.salesCount,
    revenueMinor: sales.revenueMinor,
    activeMemberships,
    newMemberships,
    monthlyReturningCustomers,
    moneyTruthStore: "postgresql_projections",
    cacheTtlSeconds: 60,
    generatedAt: now().toISOString(),
  };
}

/** Daily revenue projection row (illustrative PG table analytics_daily_revenue). */
export type DailyRevenueProjection = {
  merchantId: string;
  storeId: string | null;
  day: IsoDay;
  salesCount: number;
  revenueMinor: bigint;
};

/** In-memory sales counters for tests / worker skeleton. */
export class InMemorySalesCountersPort implements SalesCountersPort {
  private readonly sales: Array<{
    merchantId: string;
    storeId: string | null;
    customerId: string | null;
    day: IsoDay;
    revenueMinor: bigint;
  }> = [];

  seedSale(input: {
    merchantId: string;
    storeId?: string | null;
    customerId?: string | null;
    day: IsoDay;
    revenueMinor: bigint;
  }): void {
    this.sales.push({
      merchantId: input.merchantId,
      storeId: input.storeId ?? null,
      customerId: input.customerId ?? null,
      day: input.day,
      revenueMinor: input.revenueMinor,
    });
  }

  async countCompletedSales(input: {
    merchantId: string;
    storeId?: string | null;
    range: AnalyticsDateRange;
  }): Promise<{ salesCount: number; revenueMinor: bigint }> {
    assertMerchantScoped(input.merchantId);
    let salesCount = 0;
    let revenueMinor = 0n;
    for (const sale of this.sales) {
      if (sale.merchantId !== input.merchantId) continue;
      if (input.storeId && sale.storeId !== input.storeId) continue;
      if (sale.day < input.range.fromDay || sale.day > input.range.toDay) {
        continue;
      }
      salesCount += 1;
      revenueMinor += sale.revenueMinor;
    }
    return { salesCount, revenueMinor };
  }

  async countMonthlyReturningCustomers(input: {
    merchantId: string;
    storeId?: string | null;
    range?: AnalyticsDateRange;
  }): Promise<number> {
    assertMerchantScoped(input.merchantId);
    const range = input.range ?? northStarRollingRange();
    const counts = new Map<string, number>();
    for (const sale of this.sales) {
      if (sale.merchantId !== input.merchantId) continue;
      if (input.storeId && sale.storeId !== input.storeId) continue;
      if (sale.day < range.fromDay || sale.day > range.toDay) continue;
      if (!sale.customerId) continue;
      counts.set(sale.customerId, (counts.get(sale.customerId) ?? 0) + 1);
    }
    let returning = 0;
    for (const n of counts.values()) {
      if (n > 1) returning += 1;
    }
    return returning;
  }
}

/** In-memory membership counters for tests / worker skeleton. */
export class InMemoryMembershipCountersPort implements MembershipCountersPort {
  private readonly memberships: Array<{
    merchantId: string;
    storeId: string | null;
    status: "active" | "inactive";
    joinedDay: IsoDay;
  }> = [];

  seedMembership(input: {
    merchantId: string;
    storeId?: string | null;
    status?: "active" | "inactive";
    joinedDay: IsoDay;
  }): void {
    this.memberships.push({
      merchantId: input.merchantId,
      storeId: input.storeId ?? null,
      status: input.status ?? "active",
      joinedDay: input.joinedDay,
    });
  }

  async countActiveMemberships(input: {
    merchantId: string;
    storeId?: string | null;
  }): Promise<number> {
    assertMerchantScoped(input.merchantId);
    return this.memberships.filter((m) => {
      if (m.merchantId !== input.merchantId) return false;
      if (input.storeId && m.storeId !== input.storeId) return false;
      return m.status === "active";
    }).length;
  }

  async countNewMemberships(input: {
    merchantId: string;
    storeId?: string | null;
    range: AnalyticsDateRange;
  }): Promise<number> {
    assertMerchantScoped(input.merchantId);
    return this.memberships.filter((m) => {
      if (m.merchantId !== input.merchantId) return false;
      if (input.storeId && m.storeId !== input.storeId) return false;
      return (
        m.joinedDay >= input.range.fromDay && m.joinedDay <= input.range.toDay
      );
    }).length;
  }
}

function assertMerchantScoped(merchantId: string): void {
  if (!merchantId?.trim()) {
    throw new Error(
      "Merchant-scoped analytics counter requires merchantId (ADR-063).",
    );
  }
}

export function persianTitleForCapability(
  capability: MerchantOltpCapability,
): string {
  return AN_CAPABILITY_MAP[capability].titleFa;
}

export function persianTitleForMetric(key: MerchantOltpTitleKey): string {
  return MERCHANT_OLTP_TITLES_FA[key];
}

export function overviewCacheKey(input: {
  env: string;
  merchantId: string;
}): string {
  return buildDashboardOverviewKey(input);
}

export function revenueCacheKey(input: {
  env: string;
  merchantId: string;
  range: string;
}): string {
  return buildDashboardRevenueKey(input);
}

export const MERCHANT_OLTP_REQUIREMENTS = {
  pgProjectionsForAn01To04: true,
  redisTtl60Seconds: true,
  salesCountersPort: true,
  membershipCountersPort: true,
  overviewFromCounters: true,
  northStarMonthlyReturningCustomers: true,
  persianTitles: true,
  jalaliRangeHelpersStub: true,
  moneyTruthPostgresql: true,
  mongoNeverMoneyTruth: true,
  merchantScoped: true,
  offCheckoutCriticalPath: true,
  httpApiDeferredToArd016: true,
  uiStubsLandedAdr088: true,
  uiLiveChartsDeferredToArd016: true,
} as const;

export const MERCHANT_OLTP_PLACEMENT = {
  package: "src/merchant-oltp-analytics/",
  modulesPackage: "src/modules/analytics/",
  detailAdr: "ADR-063",
  relatedArd: "ARD-016",
} as const;

export function assertCacheTtl60Seconds(): void {
  if (MERCHANT_OLTP_CACHE.ttlSeconds !== 60) {
    throw new Error(
      "Merchant OLTP dashboard cache TTL must be 60s (ADR-063 / ADR-053).",
    );
  }
  if (CACHE_TTL_SECONDS.analytics !== 60) {
    throw new Error(
      "CACHE_TTL_SECONDS.analytics must be 60s (ADR-063 / ADR-053).",
    );
  }
  if (MERCHANT_OLTP_ANALYTICS.cacheTtlSeconds !== 60) {
    throw new Error(
      "MERCHANT_OLTP_ANALYTICS.cacheTtlSeconds must be 60 (ADR-063 / ADR-014).",
    );
  }
}

export function assertMerchantOltpOnPostgresql(): void {
  assertMerchantAnOnPostgresql("AN-01", MERCHANT_OLTP_DASHBOARD_DECISION.store);
  assertMoneyTruthFromPostgresql(MERCHANT_OLTP_DASHBOARD_DECISION.store);
  if (MERCHANT_OLTP_DASHBOARD_DECISION.mongoNeverMoneyTruth !== true) {
    throw new Error(
      "Merchant OLTP dashboards must never treat Mongo as money truth (ADR-063).",
    );
  }
}

export function assertPersianTitles(): void {
  for (const title of Object.values(MERCHANT_OLTP_TITLES_FA)) {
    if (!/[\u0600-\u06FF]/.test(title)) {
      throw new Error(
        `Merchant OLTP title must include Persian script (ADR-063): ${title}`,
      );
    }
  }
  if (MERCHANT_OLTP_UX_FA.dir !== "rtl") {
    throw new Error("Merchant OLTP UX must be RTL (ADR-063 Iranian First).");
  }
  if (MERCHANT_OLTP_UX_FA.calendar !== "jalali") {
    throw new Error(
      "Merchant OLTP UX calendar must be Jalali (ADR-063 Iranian First).",
    );
  }
  if (MERCHANT_OLTP_UX_FA.timeZone !== "Asia/Tehran") {
    throw new Error(
      "Merchant OLTP UX must use Asia/Tehran (ADR-063 Iranian First).",
    );
  }
}

export function assertJalaliRangeStub(range: AnalyticsDateRange): void {
  if (range.calendar !== "jalali") {
    throw new Error("Analytics range calendar must be jalali (ADR-063).");
  }
  if (range.timeZone !== "Asia/Tehran") {
    throw new Error("Analytics range timeZone must be Asia/Tehran (ADR-063).");
  }
  if (range.jalaliHelperStub !== true) {
    throw new Error("Expected Jalali range helpers stub (ADR-063).");
  }
  if (!isIsoDay(range.fromDay) || !isIsoDay(range.toDay)) {
    throw new Error("Range day bounds must be ISO YYYY-MM-DD (ADR-063).");
  }
}

export function assertOffCheckoutCriticalPath(onCriticalPath: boolean): void {
  if (onCriticalPath) {
    throw new Error(
      "Merchant OLTP projection maintenance must stay off checkout critical path (ADR-063).",
    );
  }
  if (MERCHANT_OLTP_DASHBOARD_DECISION.onCheckoutCriticalPath !== false) {
    throw new Error(
      "MERCHANT_OLTP_DASHBOARD_DECISION.onCheckoutCriticalPath must be false (ADR-063).",
    );
  }
}

export function assertImplementedHere(packagePath: string): void {
  if (packagePath !== MERCHANT_OLTP_PLACEMENT.package) {
    throw new Error(
      `Merchant OLTP analytics package is ${MERCHANT_OLTP_PLACEMENT.package}; got "${packagePath}".`,
    );
  }
}

export const MERCHANT_OLTP_ANALYTICS_PACKAGE = {
  decision: MERCHANT_OLTP_DASHBOARD_DECISION,
  consumedEvents: MERCHANT_OLTP_CONSUMED_EVENTS,
  cache: MERCHANT_OLTP_CACHE,
  titlesFa: MERCHANT_OLTP_TITLES_FA,
  anMap: AN_CAPABILITY_MAP,
  uxFa: MERCHANT_OLTP_UX_FA,
  requirements: MERCHANT_OLTP_REQUIREMENTS,
  placement: MERCHANT_OLTP_PLACEMENT,
} as const;
