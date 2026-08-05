import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_LIST_CACHE, ADMIN_ROLE } from "../admin-domain/index.js";
import { AUDIT_AUTHZ } from "../audit-logging/index.js";
import { MGMT_API_PATHS, MGMT_TITLES_FA } from "../mgmt-dashboard-analytics/index.js";
import {
  ADMIN_DASHBOARD,
  ADMIN_DASHBOARD_APP_PATHS,
  ADMIN_DASHBOARD_CACHE,
  ADMIN_DASHBOARD_COPY_FA,
  ADMIN_DASHBOARD_DECISION,
  ADMIN_DASHBOARD_ENFORCEMENT,
  ADMIN_DASHBOARD_EVENTS,
  ADMIN_DASHBOARD_MGMT_WIDGETS,
  ADMIN_DASHBOARD_SURFACES,
  ADMIN_DASHBOARD_UIUX_GATE,
  ADMIN_DASHBOARD_URL,
  ADMIN_DASHBOARD_UX_FA,
  adminDashboardHomePath,
  assertAdminDashboardAudience,
  assertAdminDashboardAuthRequired,
  assertAdminDashboardRtl,
  assertAdminDashboardUiuxGate,
  assertEnforcementStubAudited,
  assertEveryAdminViewAudited,
  assertMgmtWidgetWired,
  assertNoCustomerPortalOnAdminDashboard,
  assertNoDeliveryOnAdminDashboard,
  assertNoMerchantChromeOnAdminDashboard,
} from "./index.js";

describe("ADR-089 Admin Dashboard Architecture", () => {
  it("locks admin shell with platform_admin and every view audited", () => {
    expect(ADMIN_DASHBOARD_DECISION.adr).toBe("ADR-089");
    expect(ADMIN_DASHBOARD_DECISION.shell).toBe("admin");
    expect(ADMIN_DASHBOARD_DECISION.authRequired).toBe(true);
    expect(ADMIN_DASHBOARD_DECISION.authAudience).toBe(ADMIN_ROLE);
    expect(ADMIN_DASHBOARD_DECISION.authAudience).toBe("platform_admin");
    expect(ADMIN_DASHBOARD_DECISION.everyViewAudited).toBe(true);
    expect(ADMIN_DASHBOARD_DECISION.noMerchantDashboardChrome).toBe(true);
    expect(ADMIN_DASHBOARD_DECISION.noCustomerPortalChrome).toBe(true);
    expect(ADMIN_DASHBOARD_DECISION.noDeliveryBi).toBe(true);
    expect(ADMIN_DASHBOARD_DECISION.fulfillment).toBe("pickup_only");

    expect(() => assertAdminDashboardAuthRequired(true)).not.toThrow();
    expect(() => assertAdminDashboardAuthRequired(false)).toThrow(
      /auth|وارد/i,
    );
    expect(() =>
      assertAdminDashboardAudience("platform_admin"),
    ).not.toThrow();
    expect(() => assertAdminDashboardAudience("merchant_staff")).toThrow(
      /platform_admin/,
    );
    expect(() => assertAdminDashboardAudience("customer")).toThrow(
      /platform_admin/,
    );

    for (const id of ["home", "merchants", "security", "audit"] as const) {
      expect(() => assertEveryAdminViewAudited(id)).not.toThrow();
      expect(ADMIN_DASHBOARD_SURFACES[id].audited).toBe(true);
    }
  });

  it("wires mgmt widgets and merchant enforcement stubs", () => {
    expect(ADMIN_DASHBOARD_MGMT_WIDGETS.overview.apiPath).toBe(
      MGMT_API_PATHS.overview,
    );
    expect(ADMIN_DASHBOARD_MGMT_WIDGETS.activation.titleFa).toBe(
      MGMT_TITLES_FA.activation,
    );
    expect(ADMIN_DASHBOARD_MGMT_WIDGETS.engagement.apiPath).toBe(
      MGMT_API_PATHS.engagement,
    );

    for (const id of [
      "overview",
      "activation",
      "engagement",
      "trustSafety",
    ] as const) {
      expect(() => assertMgmtWidgetWired(id)).not.toThrow();
      expect(ADMIN_DASHBOARD_MGMT_WIDGETS[id].titleFa).toMatch(
        /[\u0600-\u06FF]/,
      );
    }

    expect(ADMIN_DASHBOARD_ENFORCEMENT.activate.action).toBe(
      "merchant.activate",
    );
    expect(ADMIN_DASHBOARD_ENFORCEMENT.suspend.action).toBe("merchant.suspend");
    expect(() => assertEnforcementStubAudited("activate")).not.toThrow();
    expect(() => assertEnforcementStubAudited("suspend")).not.toThrow();
    expect(ADMIN_DASHBOARD_SURFACES.merchants.apiPath).toBe(
      "/api/v1/admin/merchants",
    );
    expect(ADMIN_DASHBOARD_SURFACES.audit.apiPath).toBe(
      AUDIT_AUTHZ.reservedBrowsePath,
    );
  });

  it("documents cache-aside list TTL and mgmt band", () => {
    expect(ADMIN_DASHBOARD_CACHE.pattern).toBe("cache_aside");
    expect(ADMIN_DASHBOARD_CACHE.merchantListTtlSeconds).toBe(
      ADMIN_LIST_CACHE.ttlSeconds,
    );
    expect(ADMIN_DASHBOARD_CACHE.merchantListTtlSeconds).toBe(30);
    expect(ADMIN_DASHBOARD_CACHE.mgmtTtlSecondsMin).toBe(60);
    expect(ADMIN_DASHBOARD_CACHE.mgmtTtlSecondsMax).toBe(900);
    expect(ADMIN_DASHBOARD_CACHE.neverSourceOfTruth).toBe(true);
  });

  it("reserves careful admin usage analytics events", () => {
    expect(ADMIN_DASHBOARD_EVENTS.dashboardViewed).toBe("AdminDashboardViewed");
    expect(ADMIN_DASHBOARD_EVENTS.surfaceViewed).toBe("AdminSurfaceViewed");
    expect(ADMIN_DASHBOARD_EVENTS.featureKey).toBe("admin.dashboard.viewed");
    expect(ADMIN_DASHBOARD_EVENTS.accessAudited).toBe(true);
  });

  it("forbids merchant/customer chrome and delivery features", () => {
    expect(() =>
      assertNoMerchantChromeOnAdminDashboard("admin_table"),
    ).not.toThrow();
    expect(() =>
      assertNoMerchantChromeOnAdminDashboard("merchant_dashboard"),
    ).toThrow(/ADR-088|chrome/i);
    expect(() =>
      assertNoCustomerPortalOnAdminDashboard("admin"),
    ).not.toThrow();
    expect(() =>
      assertNoCustomerPortalOnAdminDashboard("customer"),
    ).toThrow(/ADR-087|chrome/i);
    expect(() => assertNoDeliveryOnAdminDashboard("pickup")).not.toThrow();
    expect(() => assertNoDeliveryOnAdminDashboard("delivery")).toThrow(
      /delivery/i,
    );
  });

  it("exposes Persian copy with privilege warnings, تومان, Jalali", () => {
    expect(ADMIN_DASHBOARD_COPY_FA.homeTitle).toMatch(/مدیریت|پلتفرم/);
    expect(ADMIN_DASHBOARD_COPY_FA.privilegeWarning).toMatch(/مدیران پلتفرم/);
    expect(ADMIN_DASHBOARD_COPY_FA.auditedHint).toMatch(/ممیزی|ثبت/);
    expect(ADMIN_DASHBOARD_COPY_FA.activateLabel).toMatch(/فعال/);
    expect(ADMIN_DASHBOARD_COPY_FA.suspendLabel).toMatch(/تعلیق/);
    expect(ADMIN_DASHBOARD_COPY_FA.priceUnit).toBe("تومان");
    expect(ADMIN_DASHBOARD_COPY_FA.moneyHint).toMatch(/تومان|PostgreSQL|پروکسی/);
    expect(ADMIN_DASHBOARD_COPY_FA.jalaliRangeNote).toMatch(
      /شمسی|جلالی|تهران/,
    );
    expect(ADMIN_DASHBOARD_COPY_FA.emptyMerchants).toMatch(/[\u0600-\u06FF]/);
    expect(ADMIN_DASHBOARD_UX_FA.dir).toBe("rtl");
    expect(ADMIN_DASHBOARD_UX_FA.calendar).toBe("jalali");
    expect(ADMIN_DASHBOARD_UX_FA.moneyDisplayUnit).toBe("toman");
    expect(ADMIN_DASHBOARD_UX_FA.rtlTablesAndFilters).toBe(true);
    expect(() => assertAdminDashboardRtl()).not.toThrow();
  });

  it("builds admin dashboard URLs under /admin", () => {
    expect(adminDashboardHomePath()).toBe("/admin");
    expect(ADMIN_DASHBOARD_URL.home).toBe("/admin");
    expect(ADMIN_DASHBOARD_URL.merchants).toBe("/admin/merchants");
    expect(ADMIN_DASHBOARD_URL.security).toBe("/admin/security");
    expect(ADMIN_DASHBOARD_URL.audit).toBe("/admin/audit");
  });

  it("scaffolds Persian RTL admin routes for merchants enforcement audit security", () => {
    const root = process.cwd();
    expect(existsSync(join(root, ADMIN_DASHBOARD_APP_PATHS.homePage))).toBe(
      true,
    );
    expect(
      existsSync(join(root, ADMIN_DASHBOARD_APP_PATHS.merchantsPage)),
    ).toBe(true);
    expect(
      existsSync(join(root, ADMIN_DASHBOARD_APP_PATHS.securityPage)),
    ).toBe(true);
    expect(existsSync(join(root, ADMIN_DASHBOARD_APP_PATHS.auditPage))).toBe(
      true,
    );

    const home = readFileSync(
      join(root, ADMIN_DASHBOARD_APP_PATHS.homePage),
      "utf8",
    );
    expect(home).toMatch(/مدیریت پلتفرم/);
    expect(home).toMatch(/مدیران پلتفرم|وارد شوید/);
    expect(home).toMatch(/تومان/);
    expect(home).toMatch(/شمسی|جلالی|تهران/);
    expect(home).toMatch(/نمای کلی|فعال‌سازی|تعامل|اعتماد/);
    expect(home).toMatch(/ممیزی|ثبت/);
    expect(home).not.toMatch(/delivery|courier/i);
    expect(home).not.toMatch(/پنل من/);

    const merchants = readFileSync(
      join(root, ADMIN_DASHBOARD_APP_PATHS.merchantsPage),
      "utf8",
    );
    expect(merchants).toMatch(/فروشنده/);
    expect(merchants).toMatch(/فعال‌سازی|تعلیق/);
    expect(merchants).toMatch(/ممیزی|ثبت/);
    expect(merchants).toMatch(/هنوز فروشنده‌ای|خالی|وارد|بارگذاری/);

    const security = readFileSync(
      join(root, ADMIN_DASHBOARD_APP_PATHS.securityPage),
      "utf8",
    );
    expect(security).toMatch(/امنیت|سیگنال/);

    const audit = readFileSync(
      join(root, ADMIN_DASHBOARD_APP_PATHS.auditPage),
      "utf8",
    );
    expect(audit).toMatch(/حسابرسی/);
    expect(audit).toMatch(/شمسی|جلالی|تهران/);
  });

  it("passes uiuxpromax gate with Persian RTL admin brief", () => {
    expect(ADMIN_DASHBOARD_UIUX_GATE.brief.persian).toBe(true);
    expect(ADMIN_DASHBOARD_UIUX_GATE.brief.rtl).toBe(true);
    expect(ADMIN_DASHBOARD_UIUX_GATE.brief.mobile390).toBe(true);
    expect(ADMIN_DASHBOARD_UIUX_GATE.brief.iranianRetailContext).toBe(true);
    expect(() => assertAdminDashboardUiuxGate()).not.toThrow();
    expect(ADMIN_DASHBOARD.decision.adr).toBe("ADR-089");
  });
});
