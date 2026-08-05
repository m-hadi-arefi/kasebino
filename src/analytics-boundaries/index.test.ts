/**
 * ADR-014 Analytics Domain Boundaries contract tests.
 */

import { describe, expect, it } from "vitest";

import { ANALYTICS_CRITICAL_PATH, OUTBOX_CONSUMERS } from "../event-driven/index.js";
import { PRODUCT_ARCHITECTURE } from "../product-architecture/index.js";
import { getContextById } from "../bounded-contexts/index.js";
import { COMPOSE_DATA_PLANES } from "../docker-compose-parity/index.js";

import {
  ANALYTICS_BOUNDARIES,
  ANALYTICS_BOUNDARIES_DECISION,
  ANALYTICS_CRITICAL_PATH_BOUNDARY,
  DUAL_READ_DISCIPLINE,
  MERCHANT_ANALYTICS_UX_FA,
  MERCHANT_OLTP_ANALYTICS,
  MONGO_ANALYTICS_PLANE,
  assertAnalyticsOffCheckoutCriticalPath,
  assertAnalyticsPlaneAlignment,
  assertMerchantAnOnPostgresql,
  assertMerchantAnalyticsUxFa,
  assertMoneyTruthFromPostgresql,
  assertMongoCapabilityOnAnalyticsPlane,
  assertMongoNeverOltpSot,
  assertPlatformAnalyticsAdminOnly,
} from "./index.js";

describe("ADR-014 Analytics Domain Boundaries", () => {
  it("splits PG merchant AN-* dashboards from Mongo telemetry plane", () => {
    expect(ANALYTICS_BOUNDARIES_DECISION.pattern).toBe(
      "dual_plane_oltp_pg_vs_mongo_telemetry",
    );
    expect(ANALYTICS_BOUNDARIES_DECISION.merchantDashboardsStore).toBe(
      "postgresql_projections",
    );
    expect(ANALYTICS_BOUNDARIES_DECISION.productPlatformStore).toBe("mongodb");
    expect(MERCHANT_OLTP_ANALYTICS.capabilities).toEqual([
      "AN-01",
      "AN-02",
      "AN-03",
      "AN-04",
    ]);
    expect(MERCHANT_OLTP_ANALYTICS.store).toBe("postgresql");
    expect(MERCHANT_OLTP_ANALYTICS.apiPaths.overview).toBe(
      "/api/v1/analytics/merchant/overview",
    );
    expect(MONGO_ANALYTICS_PLANE.capabilities).toContain("event_warehouse");
    expect(MONGO_ANALYTICS_PLANE.capabilities).toContain("clickstream");
    expect(MONGO_ANALYTICS_PLANE.capabilities).toContain("product_analytics");
    expect(MONGO_ANALYTICS_PLANE.capabilities).toContain("audit_logging");
    expect(MONGO_ANALYTICS_PLANE.ingestApiPath).toBe("/api/v1/analytics/ingest");

    expect(() => assertMerchantAnOnPostgresql("AN-01", "postgresql")).not.toThrow();
    expect(() => assertMerchantAnOnPostgresql("AN-02", "mongodb")).toThrow(
      /PostgreSQL/i,
    );
    expect(() =>
      assertMongoCapabilityOnAnalyticsPlane("clickstream", "analytics_plane"),
    ).not.toThrow();
    expect(() =>
      assertMongoCapabilityOnAnalyticsPlane("clickstream", "oltp_source_of_truth"),
    ).toThrow(/never be OLTP/i);
  });

  it("keeps money truth on PostgreSQL with dual-read discipline", () => {
    expect(ANALYTICS_BOUNDARIES_DECISION.moneyTruthStore).toBe("postgresql");
    expect(DUAL_READ_DISCIPLINE.moneyAndAccountingTruth).toBe(
      "postgresql_projections",
    );
    expect(DUAL_READ_DISCIPLINE.engagementAndProductUsage).toBe("mongodb");
    expect(DUAL_READ_DISCIPLINE.neverShowMongoAsAccountingTruth).toBe(true);
    expect(MERCHANT_OLTP_ANALYTICS.moneyFiguresMustReconcileToPg).toBe(true);

    expect(() => assertMoneyTruthFromPostgresql("postgresql")).not.toThrow();
    expect(() => assertMoneyTruthFromPostgresql("mongodb")).toThrow(/Money/i);
  });

  it("forbids Mongo as OLTP source of truth", () => {
    expect(ANALYTICS_BOUNDARIES_DECISION.mongoNeverOltpSourceOfTruth).toBe(true);
    expect(MONGO_ANALYTICS_PLANE.neverOltpSourceOfTruth).toBe(true);
    expect(COMPOSE_DATA_PLANES.mongo.neverOltpSourceOfTruth).toBe(true);
    expect(PRODUCT_ARCHITECTURE.dataPlanes.oltp).toBe("postgresql");
    expect(PRODUCT_ARCHITECTURE.dataPlanes.analytics).toBe("mongodb");

    expect(() => assertMongoNeverOltpSot("analytics_plane")).not.toThrow();
    expect(() => assertMongoNeverOltpSot("oltp_source_of_truth")).toThrow(
      /never be the OLTP/i,
    );
  });

  it("keeps analytics and warehouse off the checkout critical path", () => {
    expect(ANALYTICS_BOUNDARIES_DECISION.analyticsOnCheckoutCriticalPath).toBe(
      false,
    );
    expect(ANALYTICS_CRITICAL_PATH_BOUNDARY.onCheckoutCriticalPath).toBe(false);
    expect(ANALYTICS_CRITICAL_PATH.onCheckoutCriticalPath).toBe(false);
    expect(OUTBOX_CONSUMERS.mongodb_warehouse.onCriticalPath).toBe(false);
    expect(OUTBOX_CONSUMERS.mongodb_warehouse.neverOltpSourceOfTruth).toBe(true);
    expect(ANALYTICS_CRITICAL_PATH_BOUNDARY.warehouseMirrorViaOutbox).toBe(true);

    expect(() => assertAnalyticsOffCheckoutCriticalPath(false)).not.toThrow();
    expect(() => assertAnalyticsOffCheckoutCriticalPath(true)).toThrow(
      /critical path/i,
    );
  });

  it("locks platform analytics to admin-only audience", () => {
    expect(ANALYTICS_BOUNDARIES_DECISION.platformAnalyticsAudience).toBe(
      "admin_only",
    );
    expect(MONGO_ANALYTICS_PLANE.managementAudience).toBe("platform_admin");
    expect(() => assertPlatformAnalyticsAdminOnly("admin_only")).not.toThrow();
    expect(() => assertPlatformAnalyticsAdminOnly("merchant")).toThrow(
      /admin-only/i,
    );
  });

  it("ships Persian RTL Jalali merchant report UX contract", () => {
    expect(MERCHANT_ANALYTICS_UX_FA.locale).toBe("fa-IR");
    expect(MERCHANT_ANALYTICS_UX_FA.dir).toBe("rtl");
    expect(MERCHANT_ANALYTICS_UX_FA.calendar).toBe("jalali");
    expect(MERCHANT_ANALYTICS_UX_FA.timeZone).toBe("Asia/Tehran");
    expect(MERCHANT_ANALYTICS_UX_FA.moneyDisplayUnit).toBe("toman");
    expect(MERCHANT_ANALYTICS_UX_FA.overviewTitle).toMatch(/[\u0600-\u06FF]/);
    expect(MERCHANT_ANALYTICS_UX_FA.revenueTitle).toMatch(/[\u0600-\u06FF]/);
    expect(MERCHANT_ANALYTICS_UX_FA.dateRangeHint).toMatch(/[\u0600-\u06FF]/);
    expect(MERCHANT_ANALYTICS_UX_FA.tabletSkimable).toBe(true);
    expect(MERCHANT_ANALYTICS_UX_FA.avoidDesktopOnlyBiTools).toBe(true);
    expect(() => assertMerchantAnalyticsUxFa()).not.toThrow();
  });

  it("aligns with product architecture and bounded contexts", () => {
    expect(() => assertAnalyticsPlaneAlignment()).not.toThrow();
    expect(getContextById("analytics_oltp").plane).toBe("postgresql_oltp");
    expect(getContextById("analytics_platform").plane).toBe("mongodb_analytics");
    expect(ANALYTICS_BOUNDARIES.decision.mongoPlaneAdr).toBe("ADR-056");
    expect(ANALYTICS_BOUNDARIES.decision.mongoPlaneImplementedIn).toBe(
      "src/mongodb-analytics/",
    );
    expect(ANALYTICS_BOUNDARIES.decision.merchantOltpWidgetsImplementedIn).toBe(
      "src/merchant-oltp-analytics/",
    );
    expect(ANALYTICS_BOUNDARIES.decision.merchantOltpModulesPackage).toBe(
      "src/modules/analytics/",
    );
    expect(ANALYTICS_BOUNDARIES.decision.mgmtDashboardImplementedIn).toBe(
      "src/mgmt-dashboard-analytics/",
    );
    expect(ANALYTICS_BOUNDARIES.decision.mgmtDashboardAdr).toBe("ADR-062");
    expect(ANALYTICS_BOUNDARIES.placement.mongoPlanePackage).toBe(
      "src/mongodb-analytics/",
    );
    expect(ANALYTICS_BOUNDARIES.placement.package).toBe(
      "src/analytics-boundaries/",
    );
    expect(ANALYTICS_BOUNDARIES.requirements.merchantAnOnPostgresql).toBe(true);
  });
});
