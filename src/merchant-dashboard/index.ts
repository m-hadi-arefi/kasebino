/**
 * ADR-088 — Merchant Dashboard Architecture.
 *
 * Merchant shell with overview widgets from OLTP analytics APIs (conceptual).
 * Auth merchant only. Persian RTL + تومان + Jalali. Cache-aside TTL 60s.
 * NEVER customer storefront portal (ADR-087) or delivery BI.
 */

import {
  MERCHANT_OLTP_ANALYTICS,
  MERCHANT_ANALYTICS_UX_FA,
} from "../analytics-boundaries/index.js";
import { MERCHANT_AUTH_DECISION } from "../merchant-auth/index.js";
import {
  AN_CAPABILITY_MAP,
  MERCHANT_OLTP_CACHE,
  MERCHANT_OLTP_TITLES_FA,
  MERCHANT_OLTP_UX_FA,
} from "../merchant-oltp-analytics/index.js";
import { LOCALE_DEFAULTS } from "../product-architecture/index.js";
import { assertUiuxGate } from "../uiuxpromax-gate/index.js";

/** Binding Decision (ADR-088). */
export const MERCHANT_DASHBOARD_DECISION = {
  adr: "ADR-088",
  shell: "merchant" as const,
  mobileFirst: true,
  authRequired: true,
  authAudience: MERCHANT_AUTH_DECISION.audience,
  oltpAnalyticsPackage: "src/merchant-oltp-analytics/",
  widgetsFromOltpApis: true,
  cacheAside: true,
  cacheTtlSeconds: MERCHANT_OLTP_CACHE.ttlSeconds,
  northStar: "monthly_returning_customers" as const,
  noCustomerPortalChrome: true,
  noDeliveryBi: true,
  fulfillment: "pickup_only" as const,
  rationale: "activation_retention_pulse",
  relatedArds: ["ARD-013", "ARD-016"] as const,
} as const;

/** AN overview widgets on the merchant home dashboard. */
export const MERCHANT_DASHBOARD_WIDGETS = {
  overview: {
    capability: "AN-01" as const,
    widget: AN_CAPABILITY_MAP["AN-01"].widget,
    apiPath: AN_CAPABILITY_MAP["AN-01"].path,
    titleFa: AN_CAPABILITY_MAP["AN-01"].titleFa,
  },
  revenue: {
    capability: "AN-02" as const,
    widget: AN_CAPABILITY_MAP["AN-02"].widget,
    apiPath: AN_CAPABILITY_MAP["AN-02"].path,
    titleFa: AN_CAPABILITY_MAP["AN-02"].titleFa,
  },
  customers: {
    capability: "AN-03" as const,
    widget: AN_CAPABILITY_MAP["AN-03"].widget,
    apiPath: AN_CAPABILITY_MAP["AN-03"].path,
    titleFa: AN_CAPABILITY_MAP["AN-03"].titleFa,
  },
  retention: {
    capability: "AN-04" as const,
    widget: AN_CAPABILITY_MAP["AN-04"].widget,
    apiPath: AN_CAPABILITY_MAP["AN-04"].path,
    titleFa: AN_CAPABILITY_MAP["AN-04"].titleFa,
  },
} as const;

export type MerchantDashboardWidgetId = keyof typeof MERCHANT_DASHBOARD_WIDGETS;

/** App Router paths relative to repo root. */
export const MERCHANT_DASHBOARD_APP_PATHS = {
  homePage: "app/(merchant)/dashboard/page.tsx",
  layout: "app/(merchant)/layout.tsx",
} as const;

/** Public URL for merchant dashboard home. */
export const MERCHANT_DASHBOARD_URL = {
  home: "/dashboard",
} as const;

/**
 * Cache-aside for AN overview widgets — TTL 60s (ADR-053 / ADR-063).
 * Live Redis wiring remains ARD-016.
 */
export const MERCHANT_DASHBOARD_CACHE = {
  pattern: "cache_aside" as const,
  ttlSeconds: MERCHANT_DASHBOARD_DECISION.cacheTtlSeconds,
  alignsWithMerchantOltp: true,
  overviewApiPath: MERCHANT_OLTP_ANALYTICS.apiPaths.overview,
  neverSourceOfTruth: true,
  rebuildFrom: "postgresql_projections" as const,
  noteFa: MERCHANT_OLTP_CACHE.noteFa,
} as const;

/**
 * Analytics event names (emit via product analytics plane later).
 * ADR-088 Analytics Impact: DashboardWidgetViewed.
 */
export const MERCHANT_DASHBOARD_EVENTS = {
  widgetViewed: "DashboardWidgetViewed",
  featureKey: "dashboard.widget_viewed",
} as const;

/** Persian merchant copy for dashboard chrome and stubs. */
export const MERCHANT_DASHBOARD_COPY_FA = {
  homeTitle: "داشبورد فروشگاه",
  homeLead: "نبض حفظ مشتری — فروش، عضویت و بازگشت",
  navOverview: MERCHANT_OLTP_TITLES_FA.overview,
  navRevenue: MERCHANT_OLTP_TITLES_FA.revenue,
  navCustomers: MERCHANT_OLTP_TITLES_FA.customers,
  navRetention: MERCHANT_OLTP_TITLES_FA.retention,
  northStarTitle: MERCHANT_OLTP_TITLES_FA.northStar,
  authRequired: "برای مشاهدهٔ داشبورد وارد شوید.",
  authHint: "ورود با پیامک برای صاحب مغازه و کارکنان",
  emptyState: MERCHANT_ANALYTICS_UX_FA.emptyState,
  loading: "در حال بارگذاری…",
  errorRetry: MERCHANT_ANALYTICS_UX_FA.loadError,
  priceUnit: "تومان",
  moneyHint: "مبالغ به تومان",
  jalaliHint: MERCHANT_ANALYTICS_UX_FA.dateRangeHint,
  jalaliRangeNote: "بازهٔ تاریخ‌ها به تقویم شمسی (تهران)",
  salesCountLabel: MERCHANT_OLTP_TITLES_FA.salesCount,
  revenueLabel: MERCHANT_OLTP_TITLES_FA.revenueToman,
  membershipsLabel: MERCHANT_OLTP_TITLES_FA.memberships,
  returningLabel: MERCHANT_OLTP_TITLES_FA.returningCustomers,
  widgetStubHint: "داده از analytics OLTP (به‌زودی)",
  cacheHint: "به‌روزرسانی کش تقریباً هر ۶۰ ثانیه",
  merchantOnlyHint: "این داشبورد فقط برای فروشنده است.",
  noDeliveryHint: "فقط پیکاپ حضوری — بدون ارسال/پیک",
  posLinkLabel: "صندوق فروش",
} as const;

/** Iranian First locale stubs inherited from OLTP analytics UX. */
export const MERCHANT_DASHBOARD_UX_FA = {
  locale: LOCALE_DEFAULTS.locale,
  lang: LOCALE_DEFAULTS.language,
  dir: LOCALE_DEFAULTS.dir,
  calendar: LOCALE_DEFAULTS.calendar,
  timeZone: LOCALE_DEFAULTS.timeZone,
  moneyDisplayUnit: LOCALE_DEFAULTS.moneyDisplayUnit,
  tabletSkimable: MERCHANT_OLTP_UX_FA.tabletSkimable,
  avoidDesktopOnlyBiTools: MERCHANT_OLTP_UX_FA.avoidDesktopOnlyBiTools,
} as const;

/**
 * uiuxpromax gate evidence for ADR-088 merchant dashboard stubs.
 * Brief: docs/execution/plans/ADR-088.md
 */
export const MERCHANT_DASHBOARD_UIUX_GATE = {
  briefPath: "docs/execution/plans/ADR-088.md",
  gatePassed: true,
  skillPresent: true,
  docsPresent: true,
  uiInScope: true,
  brief: {
    persian: true,
    rtl: true,
    faIrPersona: true,
    mobile390: true,
    iranianRetailContext: true,
    screenListDocumented: true,
    statesDocumented: true,
    a11yNotes: true,
  },
} as const;

export function assertMerchantDashboardUiuxGate(): void {
  assertUiuxGate({
    gatePassed: MERCHANT_DASHBOARD_UIUX_GATE.gatePassed,
    skillPresent: MERCHANT_DASHBOARD_UIUX_GATE.skillPresent,
    docsPresent: MERCHANT_DASHBOARD_UIUX_GATE.docsPresent,
    uiInScope: MERCHANT_DASHBOARD_UIUX_GATE.uiInScope,
    brief: { ...MERCHANT_DASHBOARD_UIUX_GATE.brief },
  });
}

export function merchantDashboardHomePath(): string {
  return MERCHANT_DASHBOARD_URL.home;
}

export function assertMerchantDashboardAuthRequired(
  authenticated: boolean,
): void {
  if (!MERCHANT_DASHBOARD_DECISION.authRequired) {
    throw new Error("Merchant dashboard must require auth (ADR-088).");
  }
  if (!authenticated) {
    throw new Error(
      `Merchant dashboard requires authentication (ADR-088). ${MERCHANT_DASHBOARD_COPY_FA.authRequired}`,
    );
  }
}

export function assertMerchantDashboardAudience(audience: string): void {
  if (audience !== MERCHANT_DASHBOARD_DECISION.authAudience) {
    throw new Error(
      `Merchant dashboard audience must be "${MERCHANT_DASHBOARD_DECISION.authAudience}" (ADR-088); got "${audience}".`,
    );
  }
}

export function assertNoCustomerPortalOnMerchantDashboard(
  chrome: string,
): void {
  const forbidden = ["customer", "storefront_member", "loyalty_wallet"];
  if (forbidden.includes(chrome)) {
    throw new Error(
      `Merchant dashboard must not use "${chrome}" chrome (ADR-088). Customer portal is ADR-087.`,
    );
  }
}

export function assertNoDeliveryOnMerchantDashboard(feature: string): void {
  const forbidden = ["delivery", "courier", "shipping", "rider"];
  if (forbidden.includes(feature)) {
    throw new Error(
      `Merchant dashboard forbids "${feature}" (ADR-088). Pickup-only MVP.`,
    );
  }
}

export function assertMerchantDashboardCacheAside(): void {
  if (MERCHANT_DASHBOARD_CACHE.pattern !== "cache_aside") {
    throw new Error(
      "Merchant dashboard must use cache-aside (ADR-088 / ADR-053).",
    );
  }
  if (MERCHANT_DASHBOARD_CACHE.ttlSeconds !== 60) {
    throw new Error(
      "Merchant dashboard overview cache TTL must be 60s (ADR-088 / ADR-063).",
    );
  }
  if (!MERCHANT_DASHBOARD_CACHE.alignsWithMerchantOltp) {
    throw new Error(
      "Merchant dashboard cache must align with merchant-oltp-analytics (ADR-088).",
    );
  }
}

export function assertWidgetWiredToOltp(
  widgetId: MerchantDashboardWidgetId,
): void {
  const widget = MERCHANT_DASHBOARD_WIDGETS[widgetId];
  const expected = MERCHANT_OLTP_ANALYTICS.apiPaths[widget.widget];
  if (widget.apiPath !== expected) {
    throw new Error(
      `Merchant dashboard widget "${widgetId}" must wire to ${expected} (ADR-088); got ${widget.apiPath}.`,
    );
  }
  if (!/[\u0600-\u06FF]/.test(widget.titleFa)) {
    throw new Error(
      `Merchant dashboard widget "${widgetId}" title must be Persian (ADR-088).`,
    );
  }
}

export function assertMerchantDashboardRtl(): void {
  if (MERCHANT_DASHBOARD_UX_FA.dir !== "rtl") {
    throw new Error("Merchant dashboard UX must be RTL (ADR-088 Iranian First).");
  }
  if (MERCHANT_DASHBOARD_UX_FA.lang !== "fa") {
    throw new Error("Merchant dashboard UX lang must be fa (ADR-088).");
  }
  if (MERCHANT_DASHBOARD_UX_FA.calendar !== "jalali") {
    throw new Error("Merchant dashboard calendar must be Jalali (ADR-088).");
  }
  if (MERCHANT_DASHBOARD_UX_FA.moneyDisplayUnit !== "toman") {
    throw new Error(
      "Merchant dashboard money display unit must be toman (ADR-088).",
    );
  }
}

export const MERCHANT_DASHBOARD = {
  decision: MERCHANT_DASHBOARD_DECISION,
  widgets: MERCHANT_DASHBOARD_WIDGETS,
  appPaths: MERCHANT_DASHBOARD_APP_PATHS,
  url: MERCHANT_DASHBOARD_URL,
  cache: MERCHANT_DASHBOARD_CACHE,
  events: MERCHANT_DASHBOARD_EVENTS,
  copyFa: MERCHANT_DASHBOARD_COPY_FA,
  uxFa: MERCHANT_DASHBOARD_UX_FA,
  uiuxGate: MERCHANT_DASHBOARD_UIUX_GATE,
} as const;
