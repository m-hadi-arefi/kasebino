/**
 * ADR-062 — Management Dashboard Analytics.
 *
 * Platform leadership / ops portfolio metrics from Mongo `mos_mgmt` rollups
 * (activation, engagement DAM/MAM, commerce GMV proxy, reliability, trust &
 * safety). Money reconciles to PostgreSQL — Mongo GMV is an instrumented
 * proxy only. Audience: `platform_admin` (audited). Persian titles; Jalali /
 * Asia/Tehran presentation stubs. In-memory store for tests; HTTP APIs /
 * uiuxpromax admin chart stubs → ADR-089 (`src/modules/admin/ui/dashboard`); live HTTP → ARD-025.
 *
 * Normative: docs/architecture/management-dashboards-architecture.md,
 * docs/architecture/analytics-architecture.md, ADR-014 / ADR-056 / ADR-057 /
 * ADR-059, docs/product/success-metrics.md.
 */

import {
  DUAL_READ_DISCIPLINE,
  MONGO_ANALYTICS_PLANE,
  assertMoneyTruthFromPostgresql,
  assertMongoCapabilityOnAnalyticsPlane,
  assertPlatformAnalyticsAdminOnly,
} from "../../../../infrastructure/mongodb/contracts/boundaries/index.js";
import {
  MONGO_COLLECTIONS,
  TENANCY_AND_AUTHZ,
  UNICODE_PAYLOAD_SAFETY,
  assertPlatformAnalyticsAudience,
} from "../../../../infrastructure/mongodb/contracts/analytics/index.js";
import { LOCALE_DEFAULTS } from "../../../../shared/architecture/product/index.js";

/** ADR-062 Decision — binding management dashboard analytics stance. */
export const MGMT_DASHBOARD_DECISION = {
  adr: "ADR-062",
  pattern: "mongo_mos_mgmt_rollups_platform_admin" as const,
  collection: MONGO_COLLECTIONS.mgmt,
  store: "mongodb_mgmt_rollups" as const,
  moneyTruthStore: DUAL_READ_DISCIPLINE.moneyAndAccountingTruth,
  gmvFromEventsIsProxyOnly: true,
  reconcileMoneyToPostgresql: true,
  neverMongoAsAccountingTruth: true,
  audience: "platform_admin" as const,
  accessMustBeAudited: true,
  onCheckoutCriticalPath: false,
  architecturePackage: "src/modules/admin/ui/analytics/",
  mongodbPlanePackage: "src/infrastructure/mongodb/contracts/analytics/",
  warehousePackage: "src/events/contracts/event-warehouse/",
  productAnalyticsPackage: "src/modules/analytics/domain/product/",
  architectureDoc: "docs/architecture/management-dashboards-architecture.md",
  analyticsArchitectureDoc: "docs/architecture/analytics-architecture.md",
  relatedArd: "ARD-025",
  uiImplementedIn: "src/modules/admin/ui/dashboard/",
  uiHttpDeferredTo: "ARD-025",
} as const;

/** Metric groups (management-dashboards-architecture.md). */
export const MGMT_METRIC_GROUPS = [
  "acquisition_activation",
  "engagement",
  "commerce",
  "retention",
  "reliability",
  "trust_safety",
] as const;

export type MgmtMetricGroup = (typeof MGMT_METRIC_GROUPS)[number];

/** Canonical metric codes (English); human labels are Persian. */
export const MGMT_METRIC_CODES = {
  merchantRegistrations: "merchant_registrations",
  activationRate: "activation_rate",
  timeToFirstSaleHours: "time_to_first_sale_hours",
  dam: "dam",
  mam: "mam",
  posSessions: "pos_sessions",
  featureAdoptionRate: "feature_adoption_rate",
  gmvProxy: "gmv_proxy",
  gmvPosProxy: "gmv_pos_proxy",
  gmvOnlineProxy: "gmv_online_proxy",
  returningCustomersPlatform: "returning_customers_platform",
  otpSuccessRate: "otp_success_rate",
  checkoutP95Ms: "checkout_p95_ms",
  errorRate: "error_rate",
  suspensions: "suspensions",
  rateLimitSpikes: "rate_limit_spikes",
  suspiciousAuth: "suspicious_auth",
} as const;

export type MgmtMetricCode =
  (typeof MGMT_METRIC_CODES)[keyof typeof MGMT_METRIC_CODES];

export type MgmtMoneySource = "postgresql" | "mongo_proxy" | "not_money";

/**
 * GMV / DAM / MAM instrumentation notes (success-metrics.md + ADR-062).
 * Codes stay English; human copy Persian. GMV from warehouse events is proxy;
 * financial audit reconciles to PostgreSQL.
 */
export const MGMT_INSTRUMENT_NOTES = {
  dam: {
    code: MGMT_METRIC_CODES.dam,
    nameEn: "Daily Active Merchants",
    definitionEn:
      "Distinct merchants with at least one qualifying activity event in the Tehran calendar day (POS session, SaleCompleted, or FeatureUsed).",
    definitionFa:
      "تعداد فروشندگان متمایزی که در یک روز تقویم تهران حداقل یک فعالیت واجد شرایط داشته‌اند (نشست صندوق، فروش تکمیل‌شده، یا استفاده از قابلیت).",
    sourceEvents: [
      "SaleCompleted",
      "SessionStarted",
      "FeatureUsed",
    ] as const,
    plane: "mongodb_mgmt_rollups" as const,
    moneySource: "not_money" as const,
  },
  mam: {
    code: MGMT_METRIC_CODES.mam,
    nameEn: "Monthly Active Merchants",
    definitionEn:
      "Distinct merchants with at least one qualifying activity event in the rolling / calendar month (Tehran).",
    definitionFa:
      "تعداد فروشندگان متمایزی که در ماه جاری (یا بازه ماهانه تهران) حداقل یک فعالیت واجد شرایط داشته‌اند.",
    sourceEvents: [
      "SaleCompleted",
      "SessionStarted",
      "FeatureUsed",
    ] as const,
    plane: "mongodb_mgmt_rollups" as const,
    moneySource: "not_money" as const,
  },
  gmv: {
    code: MGMT_METRIC_CODES.gmvProxy,
    nameEn: "GMV (warehouse proxy)",
    definitionEn:
      "Sum of sale totals mirrored into the event warehouse for portfolio trend — labeled mongo_proxy. Accounting truth and reconciliation come from PostgreSQL projections/sales.",
    definitionFa:
      "مجموع مبالغ فروش منعکس‌شده در انبار رویداد برای روند پورتفolio — برچسب پروکسی Mongo. حقیقت حسابداری و تطبیق از PostgreSQL است.",
    sourceEvents: ["SaleCompleted", "OrderPaid"] as const,
    plane: "mongodb_mgmt_rollups" as const,
    moneySource: "mongo_proxy" as const,
    reconcileTo: "postgresql" as const,
    displayUnit: LOCALE_DEFAULTS.moneyDisplayUnit,
    neverAccountingTruth: true,
  },
  activation: {
    code: MGMT_METRIC_CODES.activationRate,
    nameEn: "Merchant activation rate",
    definitionEn:
      "Share of registered merchants that completed first SaleCompleted with customer phone (success-metrics engineering default).",
    definitionFa:
      "سهم فروشندگان ثبت‌نام‌شده که اولین فروش با شماره مشتری را تکمیل کرده‌اند.",
    sourceEvents: ["MerchantRegistered", "SaleCompleted"] as const,
    plane: "mongodb_mgmt_rollups" as const,
    moneySource: "not_money" as const,
  },
} as const;

/** Freshness SLAs (management-dashboards-architecture.md). */
export const MGMT_FRESHNESS_SLA = {
  liveOpsStripMaxMinutes: 1,
  standardWidgetsMaxMinutes: 15,
  dailyExecutive: "T+1_batch_ok" as const,
  noteEn:
    "Live ops strip ≤ 1 minute; standard mgmt widgets ≤ 15 minutes; daily executive T+1 batch OK.",
  noteFa:
    "نوار عملیات زنده حداکثر ۱ دقیقه؛ ویجت‌های استاندارد حداکثر ۱۵ دقیقه؛ گزارش روزانه مدیریتی با تأخیر یک‌روزه مجاز است.",
} as const;

/** Reserved admin API paths (ARD-025). */
export const MGMT_API_PATHS = {
  overview: "/api/v1/admin/mgmt/overview",
  activation: "/api/v1/admin/mgmt/activation",
  engagement: "/api/v1/admin/mgmt/engagement",
} as const;

export const MGMT_INDEXES = {
  periodMetric: "{ period: 1, metric: 1 }",
  metricPeriod: "{ metric: 1, period: -1 }",
  merchantPeriod: "{ merchantId: 1, period: -1 }",
  uniqueRollupKey: "{ period: 1, metric: 1, merchantId: 1 } unique",
} as const;

/** Redis cache-aside note for mgmt widgets (ARD-025). */
export const MGMT_CACHE = {
  ttlSecondsMin: 60,
  ttlSecondsMax: 900,
  noteEn:
    "Management widgets use Redis cache-aside with TTL 60–900s; rebuild from mos_mgmt on miss.",
  noteFa:
    "ویجت‌های مدیریت با کش Redis و TTL بین ۶۰ تا ۹۰۰ ثانیه؛ در miss از mos_mgmt بازسازی می‌شود.",
} as const;

/**
 * Persian dashboard titles (ADR-062 Iranian UX).
 * Codes English; human titles always Persian.
 */
export const MGMT_TITLES_FA = {
  overview: "نمای کلی پلتفرم",
  activation: "فعال‌سازی فروشندگان",
  engagement: "تعامل فروشندگان",
  commerce: "تجارت و GMV",
  retention: "ماندگاری پلتفرم",
  reliability: "قابلیت اطمینان",
  trustSafety: "اعتماد و ایمنی",
  emptyState: "هنوز دادهٔ مدیریتی برای نمایش نیست.",
  loadError: "بارگذاری داشبورد مدیریت ممکن نشد. دوباره تلاش کنید.",
  dateRangeHint: "بازه زمانی بر اساس تقویم شمسی و ساعت تهران.",
  moneyProxyHint:
    "مبالغ GMV پروکسی از رویدادها است؛ تطبیق مالی با PostgreSQL انجام می‌شود.",
  sourcePg: "منبع: پایگاه عملیاتی",
  sourceProxy: "منبع: پروکسی تحلیلی",
} as const;

export type MgmtTitleKey = keyof typeof MGMT_TITLES_FA;

/** Persian metric labels for admin widgets. */
export const MGMT_METRIC_LABELS_FA = {
  merchantRegistrations: "ثبت‌نام فروشندگان",
  activationRate: "نرخ فعال‌سازی",
  timeToFirstSaleHours: "زمان تا اولین فروش (ساعت)",
  dam: "فروشندگان فعال روزانه (DAM)",
  mam: "فروشندگان فعال ماهانه (MAM)",
  posSessions: "نشست‌های صندوق",
  featureAdoptionRate: "نرخ پذیرش قابلیت",
  gmvProxy: "GMV پروکسی (تومان)",
  gmvPosProxy: "GMV صندوق (پروکسی)",
  gmvOnlineProxy: "GMV آنلاین (پروکسی)",
  returningCustomersPlatform: "مشتریان بازگشتی پلتفرم",
  otpSuccessRate: "نرخ موفقیت پیامک ورود",
  checkoutP95Ms: "صدک ۹۵ تسویه (میلی‌ثانیه)",
  errorRate: "نرخ خطا",
  suspensions: "تعلیق‌ها",
  rateLimitSpikes: "اوج محدودیت نرخ",
  suspiciousAuth: "احراز هویت مشکوک",
} as const;

export type MgmtMetricLabelKey = keyof typeof MGMT_METRIC_LABELS_FA;

/**
 * Iranian First — admin viewer stubs in ADR-089 (`src/modules/admin/ui/dashboard`); live charts → ARD-025.
 */
export const MGMT_UX_FA = {
  locale: LOCALE_DEFAULTS.locale,
  lang: LOCALE_DEFAULTS.language,
  dir: LOCALE_DEFAULTS.dir,
  calendar: LOCALE_DEFAULTS.calendar,
  timeZone: LOCALE_DEFAULTS.timeZone,
  moneyDisplayUnit: LOCALE_DEFAULTS.moneyDisplayUnit,
  titles: MGMT_TITLES_FA,
  metricLabels: MGMT_METRIC_LABELS_FA,
  tabletSkimable: true,
  avoidDesktopOnlyBiTools: true,
  eventCodesMayStayEnglish: true,
} as const;

export const MGMT_UNICODE = {
  preserveUtf8PersianInPayloads:
    UNICODE_PAYLOAD_SAFETY.preserveUtf8PersianInPayloads,
  eventCodesMayStayEnglish: UNICODE_PAYLOAD_SAFETY.eventCodesMayStayEnglish,
  humanLabelsPersian: true,
  adminTimeBucketsJalaliTehran:
    UNICODE_PAYLOAD_SAFETY.merchantTimeBucketsJalaliTehran,
} as const;

/** AuthZ — platform_admin only; access itself audited (ARD-022). */
export const MGMT_AUTHZ = {
  audience: MGMT_DASHBOARD_DECISION.audience,
  alignsWithMongoTenancy: TENANCY_AND_AUTHZ.platformAudience,
  accessMustBeAudited: true,
  auditAction: "admin.mgmt_dashboard_view" as const,
  crossTenantAggAllowed: true,
  noteEn:
    "Only platform_admin may read mos_mgmt / portfolio aggregates; each view is audited.",
  noteFa:
    "فقط platform_admin می‌تواند تجمیع‌های پورتفolio را ببیند؛ هر مشاهده ممیزی می‌شود.",
} as const;

/** Domain event emitted when a rollup batch lands (catalog alignment). */
export const MGMT_EVENTS = {
  rollupUpdated: "MgmtRollupUpdated",
} as const;

export type IsoPeriodDay = string; // YYYY-MM-DD

export type MgmtPresentationRange = {
  fromDay: IsoPeriodDay;
  toDay: IsoPeriodDay;
  calendar: "jalali";
  timeZone: "Asia/Tehran";
  jalaliHelperStub: true;
  labelFa: string;
};

/**
 * Jalali / Asia/Tehran presentation stub for admin reports (ADR-062).
 * Storage/period keys remain ISO day strings; full Jalali picker → ARD-025.
 */
export function stubMgmtJalaliRange(input?: {
  fromDay?: IsoPeriodDay;
  toDay?: IsoPeriodDay;
  labelFa?: string;
  now?: () => Date;
}): MgmtPresentationRange {
  const now = input?.now ?? (() => new Date());
  const end = input?.toDay ?? toIsoDay(now());
  const start =
    input?.fromDay ??
    toIsoDay(new Date(Date.parse(`${end}T00:00:00.000Z`) - 29 * 86_400_000));
  if (!isIsoDay(start) || !isIsoDay(end)) {
    throw new Error(
      "Mgmt Jalali range stub requires ISO YYYY-MM-DD day bounds (ADR-062).",
    );
  }
  if (start > end) {
    throw new Error(
      "Mgmt Jalali range stub: fromDay must be <= toDay (ADR-062).",
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

export function isIsoDay(value: string): value is IsoPeriodDay {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDay(date: Date): IsoPeriodDay {
  return date.toISOString().slice(0, 10);
}

/** Canonical mos_mgmt rollup document. */
export type MgmtRollupDocument = {
  rollupId: string;
  period: IsoPeriodDay;
  /** hourly | daily | monthly grain for the rollup. */
  grain: "hourly" | "daily" | "monthly";
  metric: MgmtMetricCode | string;
  group: MgmtMetricGroup;
  /** Optional merchant drill-down; null = portfolio aggregate. */
  merchantId: string | null;
  value: number;
  moneySource: MgmtMoneySource;
  /** Integer minor units when money; otherwise null. */
  valueMinor: bigint | null;
  source: string;
  schemaVersion: number;
  occurredAt: string;
  ingestedAt: string;
  properties: Record<string, unknown>;
};

export type MgmtMetricPoint = {
  metric: string;
  labelFa: string;
  value: number;
  moneySource: MgmtMoneySource;
  valueMinor: bigint | null;
  sourceLabelFa: string;
};

export type MgmtOverviewSnapshot = {
  period: IsoPeriodDay;
  audience: "platform_admin";
  presentation: MgmtPresentationRange;
  freshnessSla: typeof MGMT_FRESHNESS_SLA;
  activationRate: number | null;
  dam: number | null;
  mam: number | null;
  gmvProxyMinor: bigint | null;
  gmvMoneySource: "mongo_proxy";
  gmvReconcilesTo: "postgresql";
  metrics: MgmtMetricPoint[];
  titlesFa: typeof MGMT_TITLES_FA;
};

export type MgmtActivationSnapshot = {
  period: IsoPeriodDay;
  registrations: number | null;
  activationRate: number | null;
  timeToFirstSaleHours: number | null;
  metrics: MgmtMetricPoint[];
  titleFa: string;
};

export type MgmtEngagementSnapshot = {
  period: IsoPeriodDay;
  dam: number | null;
  mam: number | null;
  posSessions: number | null;
  featureAdoptionRate: number | null;
  metrics: MgmtMetricPoint[];
  titleFa: string;
};

export type UpsertMgmtRollupInput = {
  rollupId: string;
  period: IsoPeriodDay;
  grain?: MgmtRollupDocument["grain"];
  metric: MgmtMetricCode | string;
  group: MgmtMetricGroup;
  merchantId?: string | null;
  value: number;
  moneySource?: MgmtMoneySource;
  valueMinor?: bigint | null;
  source?: string;
  occurredAt?: Date | string;
  properties?: Record<string, unknown>;
};

export type MgmtRollupStore = {
  upsert(doc: MgmtRollupDocument): Promise<{ inserted: boolean }>;
  findByPeriodMetric(
    period: IsoPeriodDay,
    metric: string,
    merchantId?: string | null,
  ): Promise<MgmtRollupDocument | null>;
  listByPeriod(period: IsoPeriodDay): Promise<MgmtRollupDocument[]>;
  listAll(): Promise<MgmtRollupDocument[]>;
};

export type MgmtAccessContext = {
  roles: readonly string[];
  actorId: string;
  /** When true, caller already recorded audit view (ARD-022). */
  accessAudited: boolean;
};

export class InMemoryMgmtRollupStore implements MgmtRollupStore {
  private readonly byKey = new Map<string, MgmtRollupDocument>();

  private key(
    period: string,
    metric: string,
    merchantId: string | null,
  ): string {
    return `${period}::${metric}::${merchantId ?? "*"}`;
  }

  async upsert(doc: MgmtRollupDocument): Promise<{ inserted: boolean }> {
    const k = this.key(doc.period, doc.metric, doc.merchantId);
    const existed = this.byKey.has(k);
    this.byKey.set(k, doc);
    return { inserted: !existed };
  }

  async findByPeriodMetric(
    period: IsoPeriodDay,
    metric: string,
    merchantId: string | null = null,
  ): Promise<MgmtRollupDocument | null> {
    return this.byKey.get(this.key(period, metric, merchantId)) ?? null;
  }

  async listByPeriod(period: IsoPeriodDay): Promise<MgmtRollupDocument[]> {
    return [...this.byKey.values()].filter((d) => d.period === period);
  }

  async listAll(): Promise<MgmtRollupDocument[]> {
    return [...this.byKey.values()];
  }
}

export function buildMgmtRollupDocument(
  input: UpsertMgmtRollupInput,
  options?: { now?: () => Date },
): MgmtRollupDocument {
  if (!isIsoDay(input.period)) {
    throw new Error("Mgmt rollup period must be ISO YYYY-MM-DD (ADR-062).");
  }
  if (!input.rollupId.trim()) {
    throw new Error("Mgmt rollup requires rollupId (ADR-062).");
  }
  if (!MGMT_METRIC_GROUPS.includes(input.group)) {
    throw new Error(`Unknown mgmt metric group "${input.group}" (ADR-062).`);
  }
  const now = options?.now ?? (() => new Date());
  const occurredAt =
    typeof input.occurredAt === "string"
      ? input.occurredAt
      : (input.occurredAt ?? now()).toISOString();
  const moneySource = input.moneySource ?? inferMoneySource(input.metric);
  return {
    rollupId: input.rollupId,
    period: input.period,
    grain: input.grain ?? "daily",
    metric: input.metric,
    group: input.group,
    merchantId: input.merchantId ?? null,
    value: input.value,
    moneySource,
    valueMinor: input.valueMinor ?? null,
    source: input.source ?? "mgmt_rollup_job",
    schemaVersion: 1,
    occurredAt,
    ingestedAt: now().toISOString(),
    properties: input.properties ?? {},
  };
}

function inferMoneySource(metric: string): MgmtMoneySource {
  if (
    metric === MGMT_METRIC_CODES.gmvProxy ||
    metric === MGMT_METRIC_CODES.gmvPosProxy ||
    metric === MGMT_METRIC_CODES.gmvOnlineProxy
  ) {
    return "mongo_proxy";
  }
  return "not_money";
}

export function sourceLabelFa(moneySource: MgmtMoneySource): string {
  if (moneySource === "postgresql") return MGMT_TITLES_FA.sourcePg;
  if (moneySource === "mongo_proxy") return MGMT_TITLES_FA.sourceProxy;
  return "منبع: تجمیع تحلیلی";
}

export function metricLabelFa(metric: string): string {
  const entry = Object.entries(MGMT_METRIC_CODES).find(
    ([, code]) => code === metric,
  );
  if (!entry) return metric;
  const key = entry[0] as MgmtMetricLabelKey;
  return MGMT_METRIC_LABELS_FA[key] ?? metric;
}

/**
 * Assert caller is platform_admin and access is audited before reading rollups.
 */
export function assertMgmtDashboardAccess(ctx: MgmtAccessContext): void {
  if (!ctx.roles.includes("platform_admin")) {
    throw new Error(
      `Management dashboards require platform_admin (ADR-062); actor=${ctx.actorId}.`,
    );
  }
  assertPlatformAnalyticsAdminOnly("platform_admin");
  assertPlatformAnalyticsAudience("platform_admin");
  if (MGMT_AUTHZ.audience !== "platform_admin") {
    throw new Error("MGMT_AUTHZ.audience must be platform_admin (ADR-062).");
  }
  if (!ctx.accessAudited) {
    throw new Error(
      "Management dashboard access must be audited before read (ADR-062 / ARD-022).",
    );
  }
  if (MGMT_AUTHZ.accessMustBeAudited !== true) {
    throw new Error(
      "MGMT_AUTHZ.accessMustBeAudited must be true (ADR-062).",
    );
  }
}

function toPoint(doc: MgmtRollupDocument | null, metric: string): MgmtMetricPoint | null {
  if (!doc) return null;
  return {
    metric,
    labelFa: metricLabelFa(metric),
    value: doc.value,
    moneySource: doc.moneySource,
    valueMinor: doc.valueMinor,
    sourceLabelFa: sourceLabelFa(doc.moneySource),
  };
}

async function readMetric(
  store: MgmtRollupStore,
  period: IsoPeriodDay,
  metric: string,
): Promise<MgmtRollupDocument | null> {
  return store.findByPeriodMetric(period, metric, null);
}

/**
 * Build PA overview from mos_mgmt rollups (portfolio, not merchant-scoped).
 */
export async function buildMgmtOverview(input: {
  store: MgmtRollupStore;
  period: IsoPeriodDay;
  access: MgmtAccessContext;
  presentation?: MgmtPresentationRange;
}): Promise<MgmtOverviewSnapshot> {
  assertMgmtDashboardAccess(input.access);
  const presentation =
    input.presentation ??
    stubMgmtJalaliRange({ fromDay: input.period, toDay: input.period });

  const activation = await readMetric(
    input.store,
    input.period,
    MGMT_METRIC_CODES.activationRate,
  );
  const dam = await readMetric(input.store, input.period, MGMT_METRIC_CODES.dam);
  const mam = await readMetric(input.store, input.period, MGMT_METRIC_CODES.mam);
  const gmv = await readMetric(
    input.store,
    input.period,
    MGMT_METRIC_CODES.gmvProxy,
  );

  if (gmv && gmv.moneySource !== "mongo_proxy") {
    throw new Error(
      "GMV portfolio metric must be labeled mongo_proxy (ADR-062 dual-read).",
    );
  }

  const metrics = [
    toPoint(activation, MGMT_METRIC_CODES.activationRate),
    toPoint(dam, MGMT_METRIC_CODES.dam),
    toPoint(mam, MGMT_METRIC_CODES.mam),
    toPoint(gmv, MGMT_METRIC_CODES.gmvProxy),
  ].filter((m): m is MgmtMetricPoint => m !== null);

  return {
    period: input.period,
    audience: "platform_admin",
    presentation,
    freshnessSla: MGMT_FRESHNESS_SLA,
    activationRate: activation?.value ?? null,
    dam: dam?.value ?? null,
    mam: mam?.value ?? null,
    gmvProxyMinor: gmv?.valueMinor ?? null,
    gmvMoneySource: "mongo_proxy",
    gmvReconcilesTo: "postgresql",
    metrics,
    titlesFa: MGMT_TITLES_FA,
  };
}

export async function buildMgmtActivation(input: {
  store: MgmtRollupStore;
  period: IsoPeriodDay;
  access: MgmtAccessContext;
}): Promise<MgmtActivationSnapshot> {
  assertMgmtDashboardAccess(input.access);
  const registrations = await readMetric(
    input.store,
    input.period,
    MGMT_METRIC_CODES.merchantRegistrations,
  );
  const activationRate = await readMetric(
    input.store,
    input.period,
    MGMT_METRIC_CODES.activationRate,
  );
  const ttf = await readMetric(
    input.store,
    input.period,
    MGMT_METRIC_CODES.timeToFirstSaleHours,
  );
  const metrics = [
    toPoint(registrations, MGMT_METRIC_CODES.merchantRegistrations),
    toPoint(activationRate, MGMT_METRIC_CODES.activationRate),
    toPoint(ttf, MGMT_METRIC_CODES.timeToFirstSaleHours),
  ].filter((m): m is MgmtMetricPoint => m !== null);

  return {
    period: input.period,
    registrations: registrations?.value ?? null,
    activationRate: activationRate?.value ?? null,
    timeToFirstSaleHours: ttf?.value ?? null,
    metrics,
    titleFa: MGMT_TITLES_FA.activation,
  };
}

export async function buildMgmtEngagement(input: {
  store: MgmtRollupStore;
  period: IsoPeriodDay;
  access: MgmtAccessContext;
}): Promise<MgmtEngagementSnapshot> {
  assertMgmtDashboardAccess(input.access);
  const dam = await readMetric(input.store, input.period, MGMT_METRIC_CODES.dam);
  const mam = await readMetric(input.store, input.period, MGMT_METRIC_CODES.mam);
  const posSessions = await readMetric(
    input.store,
    input.period,
    MGMT_METRIC_CODES.posSessions,
  );
  const featureAdoption = await readMetric(
    input.store,
    input.period,
    MGMT_METRIC_CODES.featureAdoptionRate,
  );
  const metrics = [
    toPoint(dam, MGMT_METRIC_CODES.dam),
    toPoint(mam, MGMT_METRIC_CODES.mam),
    toPoint(posSessions, MGMT_METRIC_CODES.posSessions),
    toPoint(featureAdoption, MGMT_METRIC_CODES.featureAdoptionRate),
  ].filter((m): m is MgmtMetricPoint => m !== null);

  return {
    period: input.period,
    dam: dam?.value ?? null,
    mam: mam?.value ?? null,
    posSessions: posSessions?.value ?? null,
    featureAdoptionRate: featureAdoption?.value ?? null,
    metrics,
    titleFa: MGMT_TITLES_FA.engagement,
  };
}

/**
 * Seed helper for tests / local demos — upserts rollups into store.
 */
export async function upsertMgmtRollup(
  store: MgmtRollupStore,
  input: UpsertMgmtRollupInput,
  options?: { now?: () => Date },
): Promise<MgmtRollupDocument> {
  const doc = buildMgmtRollupDocument(input, options);
  if (doc.moneySource === "mongo_proxy") {
    assertGmvProxyNotAccountingTruth(doc);
  }
  await store.upsert(doc);
  return doc;
}

export function assertGmvProxyNotAccountingTruth(doc: MgmtRollupDocument): void {
  if (doc.moneySource === "mongo_proxy") {
    assertMoneyTruthFromPostgresql(
      MGMT_DASHBOARD_DECISION.moneyTruthStore,
    );
    if (MGMT_DASHBOARD_DECISION.neverMongoAsAccountingTruth !== true) {
      throw new Error(
        "Management GMV must never treat Mongo as accounting truth (ADR-062).",
      );
    }
    if (MGMT_INSTRUMENT_NOTES.gmv.neverAccountingTruth !== true) {
      throw new Error(
        "MGMT_INSTRUMENT_NOTES.gmv.neverAccountingTruth must be true (ADR-062).",
      );
    }
  }
}

export const MGMT_REQUIREMENTS = {
  mosMgmtCollection: true,
  platformAdminOnly: true,
  accessAudited: true,
  damMamGmvInstrumentNotes: true,
  gmvProxyReconcilesToPg: true,
  neverMongoMoneyTruth: true,
  persianTitles: true,
  jalaliPresentationStub: true,
  freshnessSlaDocumented: true,
  overviewActivationEngagementAggregates: true,
  offCheckoutCriticalPath: true,
  httpApiDeferredToArd025: true,
  uiStubsInAdr089: true,
  noProtocolDriverRequiredThisAdr: true,
} as const;

export const MGMT_PLACEMENT = {
  package: "src/modules/admin/ui/analytics/",
  collection: MGMT_DASHBOARD_DECISION.collection,
  detailAdr: "ADR-062",
  relatedArd: "ARD-025",
  modulesLater: "src/modules/analytics/",
} as const;

export function assertMgmtOnMosMgmt(): void {
  if (MGMT_DASHBOARD_DECISION.collection !== MONGO_COLLECTIONS.mgmt) {
    throw new Error(
      `Management dashboards must use ${MONGO_COLLECTIONS.mgmt} (ADR-062 / ADR-056).`,
    );
  }
  assertMongoCapabilityOnAnalyticsPlane(
    "management_dashboards",
    "analytics_audit_telemetry_only",
  );
  if (
    !MONGO_ANALYTICS_PLANE.capabilities.includes("management_dashboards")
  ) {
    throw new Error(
      "MONGO_ANALYTICS_PLANE must include management_dashboards (ADR-062 / ADR-014).",
    );
  }
}

export function assertPersianMgmtTitles(): void {
  for (const title of Object.values(MGMT_TITLES_FA)) {
    if (!/[\u0600-\u06FF]/.test(title)) {
      throw new Error(
        `Mgmt dashboard title must include Persian script (ADR-062): ${title}`,
      );
    }
  }
  for (const label of Object.values(MGMT_METRIC_LABELS_FA)) {
    if (!/[\u0600-\u06FF]/.test(label)) {
      throw new Error(
        `Mgmt metric label must include Persian script (ADR-062): ${label}`,
      );
    }
  }
  if (MGMT_UX_FA.dir !== "rtl") {
    throw new Error("Mgmt UX must be RTL (ADR-062 Iranian First).");
  }
  if (MGMT_UX_FA.calendar !== "jalali") {
    throw new Error("Mgmt UX calendar must be Jalali (ADR-062 Iranian First).");
  }
  if (MGMT_UX_FA.timeZone !== "Asia/Tehran") {
    throw new Error(
      "Mgmt UX must use Asia/Tehran (ADR-062 Iranian First).",
    );
  }
}

export function assertJalaliMgmtRangeStub(range: MgmtPresentationRange): void {
  if (range.calendar !== "jalali") {
    throw new Error("Mgmt range calendar must be jalali (ADR-062).");
  }
  if (range.timeZone !== "Asia/Tehran") {
    throw new Error("Mgmt range timeZone must be Asia/Tehran (ADR-062).");
  }
  if (range.jalaliHelperStub !== true) {
    throw new Error("Expected Jalali management range stub (ADR-062).");
  }
  if (!isIsoDay(range.fromDay) || !isIsoDay(range.toDay)) {
    throw new Error("Mgmt range day bounds must be ISO YYYY-MM-DD (ADR-062).");
  }
}

export function assertFreshnessSla(): void {
  if (MGMT_FRESHNESS_SLA.liveOpsStripMaxMinutes !== 1) {
    throw new Error("Live ops strip SLA must be ≤ 1 minute (ADR-062).");
  }
  if (MGMT_FRESHNESS_SLA.standardWidgetsMaxMinutes !== 15) {
    throw new Error("Standard mgmt widgets SLA must be ≤ 15 minutes (ADR-062).");
  }
  if (MGMT_FRESHNESS_SLA.dailyExecutive !== "T+1_batch_ok") {
    throw new Error("Daily executive SLA must allow T+1 batch (ADR-062).");
  }
}

export function assertDamMamGmvInstrumentNotes(): void {
  if (MGMT_INSTRUMENT_NOTES.dam.code !== MGMT_METRIC_CODES.dam) {
    throw new Error("DAM instrument note code mismatch (ADR-062).");
  }
  if (MGMT_INSTRUMENT_NOTES.mam.code !== MGMT_METRIC_CODES.mam) {
    throw new Error("MAM instrument note code mismatch (ADR-062).");
  }
  if (MGMT_INSTRUMENT_NOTES.gmv.moneySource !== "mongo_proxy") {
    throw new Error("GMV instrument note must be mongo_proxy (ADR-062).");
  }
  if (MGMT_INSTRUMENT_NOTES.gmv.reconcileTo !== "postgresql") {
    throw new Error("GMV must reconcile to postgresql (ADR-062).");
  }
  if (!/[\u0600-\u06FF]/.test(MGMT_INSTRUMENT_NOTES.dam.definitionFa)) {
    throw new Error("DAM definitionFa must be Persian (ADR-062).");
  }
  if (!/[\u0600-\u06FF]/.test(MGMT_INSTRUMENT_NOTES.gmv.definitionFa)) {
    throw new Error("GMV definitionFa must be Persian (ADR-062).");
  }
}

export function assertOffCheckoutCriticalPath(onCriticalPath: boolean): void {
  if (onCriticalPath) {
    throw new Error(
      "Management rollups must stay off checkout critical path (ADR-062).",
    );
  }
  if (MGMT_DASHBOARD_DECISION.onCheckoutCriticalPath !== false) {
    throw new Error(
      "MGMT_DASHBOARD_DECISION.onCheckoutCriticalPath must be false (ADR-062).",
    );
  }
}

export function assertImplementedHere(packagePath: string): void {
  if (packagePath !== MGMT_PLACEMENT.package) {
    throw new Error(
      `Management dashboard analytics package is ${MGMT_PLACEMENT.package}; got "${packagePath}".`,
    );
  }
}

export const MGMT_DASHBOARD_ANALYTICS = {
  decision: MGMT_DASHBOARD_DECISION,
  metricGroups: MGMT_METRIC_GROUPS,
  metricCodes: MGMT_METRIC_CODES,
  instrumentNotes: MGMT_INSTRUMENT_NOTES,
  freshnessSla: MGMT_FRESHNESS_SLA,
  apiPaths: MGMT_API_PATHS,
  indexes: MGMT_INDEXES,
  cache: MGMT_CACHE,
  titlesFa: MGMT_TITLES_FA,
  metricLabelsFa: MGMT_METRIC_LABELS_FA,
  uxFa: MGMT_UX_FA,
  unicode: MGMT_UNICODE,
  authz: MGMT_AUTHZ,
  events: MGMT_EVENTS,
  requirements: MGMT_REQUIREMENTS,
  placement: MGMT_PLACEMENT,
} as const;
