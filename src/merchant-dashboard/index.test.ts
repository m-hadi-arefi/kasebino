import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MERCHANT_OLTP_ANALYTICS } from "../analytics-boundaries/index.js";
import { MERCHANT_OLTP_CACHE } from "../merchant-oltp-analytics/index.js";
import {
  MERCHANT_DASHBOARD,
  MERCHANT_DASHBOARD_APP_PATHS,
  MERCHANT_DASHBOARD_CACHE,
  MERCHANT_DASHBOARD_COPY_FA,
  MERCHANT_DASHBOARD_DECISION,
  MERCHANT_DASHBOARD_EVENTS,
  MERCHANT_DASHBOARD_UIUX_GATE,
  MERCHANT_DASHBOARD_URL,
  MERCHANT_DASHBOARD_WIDGETS,
  MERCHANT_DASHBOARD_UX_FA,
  assertMerchantDashboardAudience,
  assertMerchantDashboardAuthRequired,
  assertMerchantDashboardCacheAside,
  assertMerchantDashboardRtl,
  assertMerchantDashboardUiuxGate,
  assertNoCustomerPortalOnMerchantDashboard,
  assertNoDeliveryOnMerchantDashboard,
  assertWidgetWiredToOltp,
  merchantDashboardHomePath,
} from "./index.js";

describe("ADR-088 Merchant Dashboard Architecture", () => {
  it("locks merchant shell with auth and OLTP analytics wiring", () => {
    expect(MERCHANT_DASHBOARD_DECISION.adr).toBe("ADR-088");
    expect(MERCHANT_DASHBOARD_DECISION.shell).toBe("merchant");
    expect(MERCHANT_DASHBOARD_DECISION.mobileFirst).toBe(true);
    expect(MERCHANT_DASHBOARD_DECISION.authRequired).toBe(true);
    expect(MERCHANT_DASHBOARD_DECISION.authAudience).toBe("merchant_staff");
    expect(MERCHANT_DASHBOARD_DECISION.widgetsFromOltpApis).toBe(true);
    expect(MERCHANT_DASHBOARD_DECISION.cacheAside).toBe(true);
    expect(MERCHANT_DASHBOARD_DECISION.cacheTtlSeconds).toBe(60);
    expect(MERCHANT_DASHBOARD_DECISION.noCustomerPortalChrome).toBe(true);
    expect(MERCHANT_DASHBOARD_DECISION.noDeliveryBi).toBe(true);
    expect(MERCHANT_DASHBOARD_DECISION.fulfillment).toBe("pickup_only");
    expect(MERCHANT_DASHBOARD_DECISION.oltpAnalyticsPackage).toBe(
      "src/merchant-oltp-analytics/",
    );

    expect(() => assertMerchantDashboardAuthRequired(true)).not.toThrow();
    expect(() => assertMerchantDashboardAuthRequired(false)).toThrow(
      /auth|وارد/i,
    );
    expect(() =>
      assertMerchantDashboardAudience("merchant_staff"),
    ).not.toThrow();
    expect(() => assertMerchantDashboardAudience("customer")).toThrow(
      /audience|merchant_staff/i,
    );
  });

  it("wires AN widgets to merchant-oltp-analytics paths and Persian titles", () => {
    expect(MERCHANT_DASHBOARD_WIDGETS.overview.capability).toBe("AN-01");
    expect(MERCHANT_DASHBOARD_WIDGETS.revenue.capability).toBe("AN-02");
    expect(MERCHANT_DASHBOARD_WIDGETS.customers.capability).toBe("AN-03");
    expect(MERCHANT_DASHBOARD_WIDGETS.retention.capability).toBe("AN-04");

    expect(MERCHANT_DASHBOARD_WIDGETS.overview.apiPath).toBe(
      MERCHANT_OLTP_ANALYTICS.apiPaths.overview,
    );
    expect(MERCHANT_DASHBOARD_WIDGETS.revenue.apiPath).toBe(
      MERCHANT_OLTP_ANALYTICS.apiPaths.revenue,
    );
    expect(MERCHANT_DASHBOARD_WIDGETS.customers.apiPath).toBe(
      MERCHANT_OLTP_ANALYTICS.apiPaths.customers,
    );
    expect(MERCHANT_DASHBOARD_WIDGETS.retention.apiPath).toBe(
      MERCHANT_OLTP_ANALYTICS.apiPaths.retention,
    );

    for (const id of [
      "overview",
      "revenue",
      "customers",
      "retention",
    ] as const) {
      expect(() => assertWidgetWiredToOltp(id)).not.toThrow();
      expect(MERCHANT_DASHBOARD_WIDGETS[id].titleFa).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it("documents cache-aside TTL 60s aligned with merchant OLTP", () => {
    expect(MERCHANT_DASHBOARD_CACHE.pattern).toBe("cache_aside");
    expect(MERCHANT_DASHBOARD_CACHE.ttlSeconds).toBe(60);
    expect(MERCHANT_DASHBOARD_CACHE.ttlSeconds).toBe(MERCHANT_OLTP_CACHE.ttlSeconds);
    expect(MERCHANT_DASHBOARD_CACHE.neverSourceOfTruth).toBe(true);
    expect(MERCHANT_DASHBOARD_CACHE.rebuildFrom).toBe("postgresql_projections");
    expect(() => assertMerchantDashboardCacheAside()).not.toThrow();
  });

  it("reserves DashboardWidgetViewed analytics event", () => {
    expect(MERCHANT_DASHBOARD_EVENTS.widgetViewed).toBe("DashboardWidgetViewed");
    expect(MERCHANT_DASHBOARD_EVENTS.featureKey).toBe("dashboard.widget_viewed");
  });

  it("forbids customer portal chrome and delivery features", () => {
    expect(() =>
      assertNoCustomerPortalOnMerchantDashboard("pos"),
    ).not.toThrow();
    expect(() =>
      assertNoCustomerPortalOnMerchantDashboard("customer"),
    ).toThrow(/ADR-087|chrome/i);
    expect(() => assertNoDeliveryOnMerchantDashboard("pickup")).not.toThrow();
    expect(() => assertNoDeliveryOnMerchantDashboard("delivery")).toThrow(
      /delivery/i,
    );
  });

  it("exposes Persian copy with تومان and Jalali notes", () => {
    expect(MERCHANT_DASHBOARD_COPY_FA.homeTitle).toMatch(/داشبورد/);
    expect(MERCHANT_DASHBOARD_COPY_FA.priceUnit).toBe("تومان");
    expect(MERCHANT_DASHBOARD_COPY_FA.moneyHint).toMatch(/تومان/);
    expect(MERCHANT_DASHBOARD_COPY_FA.jalaliRangeNote).toMatch(
      /شمسی|جلالی|تهران/,
    );
    expect(MERCHANT_DASHBOARD_COPY_FA.authRequired).toMatch(/وارد/);
    expect(MERCHANT_DASHBOARD_COPY_FA.emptyState).toMatch(/[\u0600-\u06FF]/);
    expect(MERCHANT_DASHBOARD_COPY_FA.northStarTitle).toMatch(
      /بازمانده|بازگشت/,
    );
    expect(MERCHANT_DASHBOARD_UX_FA.dir).toBe("rtl");
    expect(MERCHANT_DASHBOARD_UX_FA.calendar).toBe("jalali");
    expect(MERCHANT_DASHBOARD_UX_FA.moneyDisplayUnit).toBe("toman");
    expect(() => assertMerchantDashboardRtl()).not.toThrow();
  });

  it("builds merchant dashboard home under /dashboard", () => {
    expect(merchantDashboardHomePath()).toBe("/dashboard");
    expect(MERCHANT_DASHBOARD_URL.home).toBe("/dashboard");
  });

  it("scaffolds Persian RTL AN overview dashboard route", () => {
    const root = process.cwd();
    expect(
      existsSync(join(root, MERCHANT_DASHBOARD_APP_PATHS.homePage)),
    ).toBe(true);

    const home = readFileSync(
      join(root, MERCHANT_DASHBOARD_APP_PATHS.homePage),
      "utf8",
    );

    expect(home).toMatch(/داشبورد/);
    expect(home).toMatch(/وارد شوید|ورود/);
    expect(home).toMatch(/تومان/);
    expect(home).toMatch(/شمسی|جلالی|تهران/);
    expect(home).toMatch(/نمای کلی|overview/i);
    expect(home).toMatch(/درآمد|revenue/i);
    expect(home).toMatch(/مشتری/);
    expect(home).toMatch(/بازماند|وفادار|retention/i);
    expect(home).toMatch(/۶۰|60/);
    expect(home).not.toMatch(/delivery|courier/i);
    expect(home).not.toMatch(/پنل من/);
  });

  it("passes uiuxpromax gate with Persian RTL mobile merchant brief", () => {
    expect(MERCHANT_DASHBOARD_UIUX_GATE.brief.persian).toBe(true);
    expect(MERCHANT_DASHBOARD_UIUX_GATE.brief.rtl).toBe(true);
    expect(MERCHANT_DASHBOARD_UIUX_GATE.brief.mobile390).toBe(true);
    expect(MERCHANT_DASHBOARD_UIUX_GATE.brief.iranianRetailContext).toBe(true);
    expect(() => assertMerchantDashboardUiuxGate()).not.toThrow();
    expect(MERCHANT_DASHBOARD.decision.adr).toBe("ADR-088");
  });
});
