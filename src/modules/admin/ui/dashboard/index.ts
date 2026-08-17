/**
 * ADR-089 — Admin Dashboard Architecture.
 *
 * Platform ops console: merchants, mgmt analytics, security signals, audit
 * browser. Auth platform_admin only. Every view audited. Persian RTL + تومان
 * + Jalali. NEVER merchant dashboard (ADR-088) or customer portal (ADR-087).
 */

import {
  ADMIN_ACTION_LABELS_FA,
  ADMIN_DOMAIN_DECISION,
  ADMIN_LIST_CACHE,
  ADMIN_PRIVILEGE_WARNINGS_FA,
  ADMIN_ROLE,
  assertPlatformAdminAudience,
} from "../../domain/contracts/index.js";
import { AUDIT_AUTHZ, AUDIT_LOGGING_UX_FA } from "../../../../infrastructure/security/contracts/audit-logging/index.js";
import {
  MGMT_API_PATHS,
  MGMT_CACHE,
  MGMT_TITLES_FA,
  MGMT_UX_FA,
} from "../analytics/index.js";
import { LOCALE_DEFAULTS } from "../../../../shared/architecture/product/index.js";
import { assertUiuxGate } from "../../../../shared/contracts/uiuxpromax-gate/index.js";

/** Binding Decision (ADR-089). */
export const ADMIN_DASHBOARD_DECISION = {
  adr: "ADR-089",
  shell: "admin" as const,
  laptopPrimary: true,
  mobileAlertsReadable: true,
  authRequired: true,
  authAudience: ADMIN_ROLE,
  permission: ADMIN_DOMAIN_DECISION.permission,
  everyViewAudited: true,
  surfaces: ["home", "merchants", "security", "audit"] as const,
  adminDomainPackage: "src/modules/admin/domain/contracts/",
  mgmtAnalyticsPackage: "src/modules/admin/ui/analytics/",
  auditPackage: "src/infrastructure/security/contracts/audit-logging/",
  noMerchantDashboardChrome: true,
  noCustomerPortalChrome: true,
  noDeliveryBi: true,
  fulfillment: "pickup_only" as const,
  rationale: "operate_saas_portfolio_security",
  relatedArds: ["ARD-018", "ARD-022", "ARD-025", "ARD-026"] as const,
} as const;

/** Admin API paths reserved for ARD-018 (conceptual wiring). */
export const ADMIN_DASHBOARD_API_PATHS = {
  merchants: "/api/v1/admin/merchants",
  merchantDetail: "/api/v1/admin/merchants/:id",
  activate: "/api/v1/admin/merchants/:id/activate",
  suspend: "/api/v1/admin/merchants/:id/suspend",
  mgmtOverview: MGMT_API_PATHS.overview,
  mgmtActivation: MGMT_API_PATHS.activation,
  mgmtEngagement: MGMT_API_PATHS.engagement,
  auditBrowse: AUDIT_AUTHZ.reservedBrowsePath,
  auditDetail: AUDIT_AUTHZ.reservedDetailPath,
  securitySignals: "/api/v1/admin/security/signals",
} as const;

/** Portfolio / ops surfaces on the admin console. */
export const ADMIN_DASHBOARD_SURFACES = {
  home: {
    id: "home" as const,
    titleFa: "نمای کلی پلتفرم",
    path: "/admin",
    audited: true,
    apiPath: ADMIN_DASHBOARD_API_PATHS.mgmtOverview,
  },
  merchants: {
    id: "merchants" as const,
    titleFa: ADMIN_ACTION_LABELS_FA["merchant.list"],
    path: "/admin/merchants",
    audited: true,
    apiPath: ADMIN_DASHBOARD_API_PATHS.merchants,
  },
  security: {
    id: "security" as const,
    titleFa: "سیگنال‌های امنیتی",
    path: "/admin/security",
    audited: true,
    apiPath: ADMIN_DASHBOARD_API_PATHS.securitySignals,
  },
  audit: {
    id: "audit" as const,
    titleFa: AUDIT_LOGGING_UX_FA.ADMIN_BROWSE_TITLE,
    path: "/admin/audit",
    audited: true,
    apiPath: ADMIN_DASHBOARD_API_PATHS.auditBrowse,
  },
} as const;

export type AdminDashboardSurfaceId = keyof typeof ADMIN_DASHBOARD_SURFACES;

/** Mgmt portfolio widgets on the admin home dashboard. */
export const ADMIN_DASHBOARD_MGMT_WIDGETS = {
  overview: {
    id: "overview" as const,
    apiPath: MGMT_API_PATHS.overview,
    titleFa: MGMT_TITLES_FA.overview,
  },
  activation: {
    id: "activation" as const,
    apiPath: MGMT_API_PATHS.activation,
    titleFa: MGMT_TITLES_FA.activation,
  },
  engagement: {
    id: "engagement" as const,
    apiPath: MGMT_API_PATHS.engagement,
    titleFa: MGMT_TITLES_FA.engagement,
  },
  trustSafety: {
    id: "trustSafety" as const,
    apiPath: ADMIN_DASHBOARD_API_PATHS.securitySignals,
    titleFa: MGMT_TITLES_FA.trustSafety,
  },
} as const;

export type AdminDashboardMgmtWidgetId =
  keyof typeof ADMIN_DASHBOARD_MGMT_WIDGETS;

/** Enforcement actions shown on merchant list stubs. */
export const ADMIN_DASHBOARD_ENFORCEMENT = {
  activate: {
    action: "merchant.activate" as const,
    labelFa: ADMIN_ACTION_LABELS_FA["merchant.activate"],
    confirmFa: ADMIN_PRIVILEGE_WARNINGS_FA.activateConfirm,
    apiPath: ADMIN_DASHBOARD_API_PATHS.activate,
    audited: true,
  },
  suspend: {
    action: "merchant.suspend" as const,
    labelFa: ADMIN_ACTION_LABELS_FA["merchant.suspend"],
    confirmFa: ADMIN_PRIVILEGE_WARNINGS_FA.suspendConfirm,
    apiPath: ADMIN_DASHBOARD_API_PATHS.suspend,
    audited: true,
  },
} as const;

/** App Router paths relative to repo root. */
export const ADMIN_DASHBOARD_APP_PATHS = {
  homePage: "app/(admin)/admin/page.tsx",
  merchantsPage: "app/(admin)/admin/merchants/page.tsx",
  securityPage: "app/(admin)/admin/security/page.tsx",
  auditPage: "app/(admin)/admin/audit/page.tsx",
  layout: "app/(admin)/layout.tsx",
} as const;

/** Public URLs for admin dashboard. */
export const ADMIN_DASHBOARD_URL = {
  home: "/admin",
  merchants: "/admin/merchants",
  security: "/admin/security",
  audit: "/admin/audit",
} as const;

/**
 * Cache notes — list short TTL + mgmt widget band (ADR-053 / ADR-062).
 * Live Redis wiring remains ARD-018 / ARD-025.
 */
export const ADMIN_DASHBOARD_CACHE = {
  pattern: "cache_aside" as const,
  merchantListTtlSeconds: ADMIN_LIST_CACHE.ttlSeconds,
  mgmtTtlSecondsMin: MGMT_CACHE.ttlSecondsMin,
  mgmtTtlSecondsMax: MGMT_CACHE.ttlSecondsMax,
  neverSourceOfTruth: true,
  noteFa:
    "فهرست فروشندگان کش کوتاه (~۳۰ث) · ویجت‌های مدیریت ۶۰–۹۰۰ث",
} as const;

/**
 * Analytics / audit event names (emit via planes later).
 * ADR-089 Analytics Impact: careful admin usage analytics.
 */
export const ADMIN_DASHBOARD_EVENTS = {
  dashboardViewed: "AdminDashboardViewed",
  surfaceViewed: "AdminSurfaceViewed",
  featureKey: "admin.dashboard.viewed",
  accessAudited: true,
} as const;

/** Persian admin copy for dashboard chrome and stubs. */
export const ADMIN_DASHBOARD_COPY_FA = {
  homeTitle: "مدیریت پلتفرم",
  homeLead: "پورتفolio فروشندگان، امنیت و حسابرسی",
  merchantsTitle: ADMIN_ACTION_LABELS_FA["merchant.list"],
  merchantsLead: "مشاهده، فعال‌سازی و تعلیق فروشندگان",
  securityTitle: "سیگنال‌های امنیتی",
  securityLead: "هشدارهای سوءاستفاده و اعتماد پلتفرم",
  auditTitle: AUDIT_LOGGING_UX_FA.ADMIN_BROWSE_TITLE,
  auditLead: AUDIT_LOGGING_UX_FA.ADMIN_BROWSE_HINT,
  privilegeWarning: ADMIN_PRIVILEGE_WARNINGS_FA.platformOnly,
  auditedHint: ADMIN_PRIVILEGE_WARNINGS_FA.auditedAction,
  enforcementHint: ADMIN_PRIVILEGE_WARNINGS_FA.enforcementIrreversibleHint,
  activateLabel: ADMIN_ACTION_LABELS_FA["merchant.activate"],
  suspendLabel: ADMIN_ACTION_LABELS_FA["merchant.suspend"],
  activateConfirm: ADMIN_PRIVILEGE_WARNINGS_FA.activateConfirm,
  suspendConfirm: ADMIN_PRIVILEGE_WARNINGS_FA.suspendConfirm,
  authRequired: "برای ورود به پنل مدیریت وارد شوید.",
  authHint: "فقط مدیران پلتفرم — کارکنان فروشگاه مجاز نیستند.",
  emptyMerchants: "هنوز فروشنده‌ای ثبت نشده.",
  emptySecurity: "هنوز سیگنال امنیتی برای نمایش نیست.",
  emptyAudit: "هنوز رویداد حسابرسی برای نمایش نیست.",
  emptyMgmt: MGMT_TITLES_FA.emptyState,
  loading: "در حال بارگذاری…",
  errorRetry: "بارگذاری پنل مدیریت ممکن نشد. دوباره تلاش کنید.",
  priceUnit: "تومان",
  moneyHint: MGMT_TITLES_FA.moneyProxyHint,
  jalaliHint: MGMT_TITLES_FA.dateRangeHint,
  jalaliRangeNote: "بازهٔ تاریخ‌ها به تقویم شمسی (تهران)",
  widgetStubHint: "داده از analytics مدیریتی (به‌زودی)",
  cacheHint: ADMIN_DASHBOARD_CACHE.noteFa,
  accessAuditedHint: AUDIT_LOGGING_UX_FA.ACCESS_AUDITED_HINT,
  merchantOnlyForbidden: "این پنل برای فروشنده نیست.",
  customerForbidden: "این پنل برای مشتری نیست.",
  noDeliveryHint: "فقط پیکاپ حضوری — بدون ارسال/پیک در دامنه‌های تجاری",
  statusActive: "فعال",
  statusSuspended: "تعلیق‌شده",
  statusDraft: "پیش‌نویس",
  viewMerchant: ADMIN_ACTION_LABELS_FA["merchant.view"],
  navHome: "خانه",
  navMerchants: ADMIN_ACTION_LABELS_FA["merchant.list"],
  navSecurity: "امنیت",
  navAudit: "حسابرسی",
} as const;

/** Iranian First locale stubs. */
export const ADMIN_DASHBOARD_UX_FA = {
  locale: LOCALE_DEFAULTS.locale,
  lang: LOCALE_DEFAULTS.language,
  dir: LOCALE_DEFAULTS.dir,
  calendar: LOCALE_DEFAULTS.calendar,
  timeZone: LOCALE_DEFAULTS.timeZone,
  moneyDisplayUnit: LOCALE_DEFAULTS.moneyDisplayUnit,
  rtlTablesAndFilters: true,
  laptopPrimaryOps: true,
  mobileCriticalAlertsReadable: true,
  tabletSkimable: MGMT_UX_FA.tabletSkimable,
} as const;

/**
 * uiuxpromax gate evidence for ADR-089 admin dashboard stubs.
 * Brief: docs/execution/plans/ADR-089.md
 */
export const ADMIN_DASHBOARD_UIUX_GATE = {
  briefPath: "docs/execution/plans/ADR-089.md",
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

export function assertAdminDashboardUiuxGate(): void {
  assertUiuxGate({
    gatePassed: ADMIN_DASHBOARD_UIUX_GATE.gatePassed,
    skillPresent: ADMIN_DASHBOARD_UIUX_GATE.skillPresent,
    docsPresent: ADMIN_DASHBOARD_UIUX_GATE.docsPresent,
    uiInScope: ADMIN_DASHBOARD_UIUX_GATE.uiInScope,
    brief: { ...ADMIN_DASHBOARD_UIUX_GATE.brief },
  });
}

export function adminDashboardHomePath(): string {
  return ADMIN_DASHBOARD_URL.home;
}

export function assertAdminDashboardAuthRequired(authenticated: boolean): void {
  if (!ADMIN_DASHBOARD_DECISION.authRequired) {
    throw new Error("Admin dashboard must require auth (ADR-089).");
  }
  if (!authenticated) {
    throw new Error(
      `Admin dashboard requires authentication (ADR-089). ${ADMIN_DASHBOARD_COPY_FA.authRequired}`,
    );
  }
}

export function assertAdminDashboardAudience(audience: string): void {
  assertPlatformAdminAudience(audience);
  if (audience !== ADMIN_DASHBOARD_DECISION.authAudience) {
    throw new Error(
      `Admin dashboard audience must be "${ADMIN_DASHBOARD_DECISION.authAudience}" (ADR-089); got "${audience}".`,
    );
  }
}

export function assertEveryAdminViewAudited(
  surfaceId: AdminDashboardSurfaceId,
): void {
  if (!ADMIN_DASHBOARD_DECISION.everyViewAudited) {
    throw new Error("Admin dashboard must audit every view (ADR-089).");
  }
  const surface = ADMIN_DASHBOARD_SURFACES[surfaceId];
  if (!surface.audited) {
    throw new Error(
      `Admin dashboard surface "${surfaceId}" must be audited (ADR-089).`,
    );
  }
}

export function assertNoMerchantChromeOnAdminDashboard(chrome: string): void {
  const forbidden = ["merchant_dashboard", "pos_cart", "merchant_staff"];
  if (forbidden.includes(chrome)) {
    throw new Error(
      `Admin dashboard must not use "${chrome}" chrome (ADR-089). Merchant shell is ADR-088.`,
    );
  }
}

export function assertNoCustomerPortalOnAdminDashboard(chrome: string): void {
  const forbidden = ["customer", "storefront_member", "loyalty_wallet"];
  if (forbidden.includes(chrome)) {
    throw new Error(
      `Admin dashboard must not use "${chrome}" chrome (ADR-089). Customer portal is ADR-087.`,
    );
  }
}

export function assertNoDeliveryOnAdminDashboard(feature: string): void {
  const forbidden = ["delivery", "courier", "shipping", "rider"];
  if (forbidden.includes(feature)) {
    throw new Error(
      `Admin dashboard forbids "${feature}" (ADR-089). Pickup-only MVP.`,
    );
  }
}

export function assertAdminDashboardRtl(): void {
  if (ADMIN_DASHBOARD_UX_FA.dir !== "rtl") {
    throw new Error("Admin dashboard UX must be RTL (ADR-089 Iranian First).");
  }
  if (ADMIN_DASHBOARD_UX_FA.lang !== "fa") {
    throw new Error("Admin dashboard UX lang must be fa (ADR-089).");
  }
  if (ADMIN_DASHBOARD_UX_FA.calendar !== "jalali") {
    throw new Error("Admin dashboard calendar must be Jalali (ADR-089).");
  }
  if (ADMIN_DASHBOARD_UX_FA.moneyDisplayUnit !== "toman") {
    throw new Error(
      "Admin dashboard money display unit must be toman (ADR-089).",
    );
  }
  if (!ADMIN_DASHBOARD_UX_FA.rtlTablesAndFilters) {
    throw new Error(
      "Admin dashboard tables/filters must be RTL (ADR-089).",
    );
  }
}

export function assertMgmtWidgetWired(
  widgetId: AdminDashboardMgmtWidgetId,
): void {
  const widget = ADMIN_DASHBOARD_MGMT_WIDGETS[widgetId];
  if (!/[\u0600-\u06FF]/.test(widget.titleFa)) {
    throw new Error(
      `Admin dashboard widget "${widgetId}" title must be Persian (ADR-089).`,
    );
  }
  if (!widget.apiPath.startsWith("/api/v1/admin/")) {
    throw new Error(
      `Admin dashboard widget "${widgetId}" must use admin API path (ADR-089); got ${widget.apiPath}.`,
    );
  }
}

export function assertEnforcementStubAudited(
  key: keyof typeof ADMIN_DASHBOARD_ENFORCEMENT,
): void {
  const stub = ADMIN_DASHBOARD_ENFORCEMENT[key];
  if (!stub.audited) {
    throw new Error(
      `Admin enforcement "${key}" must be audited (ADR-089 / ADR-013).`,
    );
  }
  if (!/[\u0600-\u06FF]/.test(stub.labelFa)) {
    throw new Error(
      `Admin enforcement "${key}" label must be Persian (ADR-089).`,
    );
  }
}

export const ADMIN_DASHBOARD = {
  decision: ADMIN_DASHBOARD_DECISION,
  surfaces: ADMIN_DASHBOARD_SURFACES,
  mgmtWidgets: ADMIN_DASHBOARD_MGMT_WIDGETS,
  enforcement: ADMIN_DASHBOARD_ENFORCEMENT,
  appPaths: ADMIN_DASHBOARD_APP_PATHS,
  url: ADMIN_DASHBOARD_URL,
  apiPaths: ADMIN_DASHBOARD_API_PATHS,
  cache: ADMIN_DASHBOARD_CACHE,
  events: ADMIN_DASHBOARD_EVENTS,
  copyFa: ADMIN_DASHBOARD_COPY_FA,
  uxFa: ADMIN_DASHBOARD_UX_FA,
  uiuxGate: ADMIN_DASHBOARD_UIUX_GATE,
} as const;
