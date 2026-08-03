/**
 * ADR-062 Management Dashboard Analytics contract tests.
 */

import { describe, expect, it } from "vitest";

import { MONGO_COLLECTIONS } from "../mongodb-analytics/index.js";

import {
  InMemoryMgmtRollupStore,
  MGMT_API_PATHS,
  MGMT_AUTHZ,
  MGMT_CACHE,
  MGMT_DASHBOARD_ANALYTICS,
  MGMT_DASHBOARD_DECISION,
  MGMT_FRESHNESS_SLA,
  MGMT_INSTRUMENT_NOTES,
  MGMT_METRIC_CODES,
  MGMT_METRIC_LABELS_FA,
  MGMT_PLACEMENT,
  MGMT_TITLES_FA,
  MGMT_UX_FA,
  assertDamMamGmvInstrumentNotes,
  assertFreshnessSla,
  assertImplementedHere,
  assertJalaliMgmtRangeStub,
  assertMgmtDashboardAccess,
  assertMgmtOnMosMgmt,
  assertOffCheckoutCriticalPath,
  assertPersianMgmtTitles,
  buildMgmtActivation,
  buildMgmtEngagement,
  buildMgmtOverview,
  stubMgmtJalaliRange,
  upsertMgmtRollup,
} from "./index.js";

describe("ADR-062 Management Dashboard Analytics", () => {
  it("locks mos_mgmt rollups + platform_admin + money reconcile to PG", () => {
    expect(MGMT_DASHBOARD_DECISION.pattern).toBe(
      "mongo_mos_mgmt_rollups_platform_admin",
    );
    expect(MGMT_DASHBOARD_DECISION.collection).toBe(MONGO_COLLECTIONS.mgmt);
    expect(MGMT_DASHBOARD_DECISION.collection).toBe("mos_mgmt");
    expect(MGMT_DASHBOARD_DECISION.audience).toBe("platform_admin");
    expect(MGMT_DASHBOARD_DECISION.gmvFromEventsIsProxyOnly).toBe(true);
    expect(MGMT_DASHBOARD_DECISION.reconcileMoneyToPostgresql).toBe(true);
    expect(MGMT_DASHBOARD_DECISION.neverMongoAsAccountingTruth).toBe(true);
    expect(MGMT_DASHBOARD_DECISION.moneyTruthStore).toBe(
      "postgresql_projections",
    );
    expect(MGMT_AUTHZ.accessMustBeAudited).toBe(true);
    expect(MGMT_PLACEMENT.package).toBe("src/mgmt-dashboard-analytics/");
    expect(MGMT_DASHBOARD_ANALYTICS.placement.relatedArd).toBe("ARD-025");
    expect(() => assertMgmtOnMosMgmt()).not.toThrow();
    expect(() => assertOffCheckoutCriticalPath(false)).not.toThrow();
    expect(() => assertOffCheckoutCriticalPath(true)).toThrow(/critical path/i);
    expect(() =>
      assertImplementedHere("src/mgmt-dashboard-analytics/"),
    ).not.toThrow();
  });

  it("documents DAM / MAM / GMV instrument notes with Persian definitions", () => {
    expect(MGMT_INSTRUMENT_NOTES.dam.code).toBe("dam");
    expect(MGMT_INSTRUMENT_NOTES.mam.code).toBe("mam");
    expect(MGMT_INSTRUMENT_NOTES.gmv.moneySource).toBe("mongo_proxy");
    expect(MGMT_INSTRUMENT_NOTES.gmv.reconcileTo).toBe("postgresql");
    expect(MGMT_INSTRUMENT_NOTES.gmv.displayUnit).toBe("toman");
    expect(MGMT_INSTRUMENT_NOTES.gmv.neverAccountingTruth).toBe(true);
    expect(MGMT_INSTRUMENT_NOTES.dam.definitionFa).toMatch(/[\u0600-\u06FF]/);
    expect(MGMT_INSTRUMENT_NOTES.mam.definitionFa).toMatch(/[\u0600-\u06FF]/);
    expect(MGMT_INSTRUMENT_NOTES.gmv.definitionFa).toMatch(/[\u0600-\u06FF]/);
    expect(MGMT_INSTRUMENT_NOTES.dam.sourceEvents).toContain("SaleCompleted");
    expect(() => assertDamMamGmvInstrumentNotes()).not.toThrow();
  });

  it("documents freshness SLAs and cache TTL band", () => {
    expect(MGMT_FRESHNESS_SLA.liveOpsStripMaxMinutes).toBe(1);
    expect(MGMT_FRESHNESS_SLA.standardWidgetsMaxMinutes).toBe(15);
    expect(MGMT_FRESHNESS_SLA.dailyExecutive).toBe("T+1_batch_ok");
    expect(MGMT_FRESHNESS_SLA.noteFa).toMatch(/[\u0600-\u06FF]/);
    expect(MGMT_CACHE.ttlSecondsMin).toBe(60);
    expect(MGMT_CACHE.ttlSecondsMax).toBe(900);
    expect(MGMT_API_PATHS.overview).toBe("/api/v1/admin/mgmt/overview");
    expect(MGMT_API_PATHS.activation).toBe("/api/v1/admin/mgmt/activation");
    expect(MGMT_API_PATHS.engagement).toBe("/api/v1/admin/mgmt/engagement");
    expect(() => assertFreshnessSla()).not.toThrow();
  });

  it("provides Persian titles, RTL stubs, and Jalali presentation stub", () => {
    expect(MGMT_TITLES_FA.overview).toMatch(/[\u0600-\u06FF]/);
    expect(MGMT_METRIC_LABELS_FA.dam).toMatch(/[\u0600-\u06FF]/);
    expect(MGMT_METRIC_LABELS_FA.gmvProxy).toMatch(/تومان/);
    expect(MGMT_UX_FA.dir).toBe("rtl");
    expect(MGMT_UX_FA.locale).toBe("fa-IR");
    expect(MGMT_UX_FA.calendar).toBe("jalali");
    expect(MGMT_UX_FA.timeZone).toBe("Asia/Tehran");
    expect(MGMT_UX_FA.moneyDisplayUnit).toBe("toman");
    expect(() => assertPersianMgmtTitles()).not.toThrow();

    const range = stubMgmtJalaliRange({
      fromDay: "2026-07-01",
      toDay: "2026-07-31",
    });
    expect(range.calendar).toBe("jalali");
    expect(range.timeZone).toBe("Asia/Tehran");
    expect(range.jalaliHelperStub).toBe(true);
    expect(range.labelFa).toMatch(/[\u0600-\u06FF]/);
    expect(() => assertJalaliMgmtRangeStub(range)).not.toThrow();
    expect(() =>
      stubMgmtJalaliRange({ fromDay: "2026-08-10", toDay: "2026-08-01" }),
    ).toThrow(/fromDay/);
  });

  it("gates reads to audited platform_admin only", () => {
    expect(() =>
      assertMgmtDashboardAccess({
        roles: ["merchant_owner"],
        actorId: "u1",
        accessAudited: true,
      }),
    ).toThrow(/platform_admin/i);

    expect(() =>
      assertMgmtDashboardAccess({
        roles: ["platform_admin"],
        actorId: "admin1",
        accessAudited: false,
      }),
    ).toThrow(/audited/i);

    expect(() =>
      assertMgmtDashboardAccess({
        roles: ["platform_admin"],
        actorId: "admin1",
        accessAudited: true,
      }),
    ).not.toThrow();
  });

  it("builds overview / activation / engagement from mos_mgmt rollups", async () => {
    const store = new InMemoryMgmtRollupStore();
    const period = "2026-08-03";
    const access = {
      roles: ["platform_admin"] as const,
      actorId: "admin1",
      accessAudited: true,
    };

    await upsertMgmtRollup(store, {
      rollupId: "r-act",
      period,
      metric: MGMT_METRIC_CODES.activationRate,
      group: "acquisition_activation",
      value: 0.72,
    });
    await upsertMgmtRollup(store, {
      rollupId: "r-dam",
      period,
      metric: MGMT_METRIC_CODES.dam,
      group: "engagement",
      value: 42,
    });
    await upsertMgmtRollup(store, {
      rollupId: "r-mam",
      period,
      metric: MGMT_METRIC_CODES.mam,
      group: "engagement",
      value: 180,
    });
    await upsertMgmtRollup(store, {
      rollupId: "r-gmv",
      period,
      metric: MGMT_METRIC_CODES.gmvProxy,
      group: "commerce",
      value: 12_500_000,
      valueMinor: 12_500_000_000n,
      moneySource: "mongo_proxy",
    });
    await upsertMgmtRollup(store, {
      rollupId: "r-reg",
      period,
      metric: MGMT_METRIC_CODES.merchantRegistrations,
      group: "acquisition_activation",
      value: 20,
    });
    await upsertMgmtRollup(store, {
      rollupId: "r-ttf",
      period,
      metric: MGMT_METRIC_CODES.timeToFirstSaleHours,
      group: "acquisition_activation",
      value: 36,
    });
    await upsertMgmtRollup(store, {
      rollupId: "r-pos",
      period,
      metric: MGMT_METRIC_CODES.posSessions,
      group: "engagement",
      value: 510,
    });
    await upsertMgmtRollup(store, {
      rollupId: "r-feat",
      period,
      metric: MGMT_METRIC_CODES.featureAdoptionRate,
      group: "engagement",
      value: 0.55,
    });

    const overview = await buildMgmtOverview({ store, period, access });
    expect(overview.audience).toBe("platform_admin");
    expect(overview.activationRate).toBe(0.72);
    expect(overview.dam).toBe(42);
    expect(overview.mam).toBe(180);
    expect(overview.gmvProxyMinor).toBe(12_500_000_000n);
    expect(overview.gmvMoneySource).toBe("mongo_proxy");
    expect(overview.gmvReconcilesTo).toBe("postgresql");
    expect(overview.presentation.calendar).toBe("jalali");
    expect(overview.titlesFa.moneyProxyHint).toMatch(/[\u0600-\u06FF]/);
    expect(
      overview.metrics.find((m) => m.metric === "gmv_proxy")?.sourceLabelFa,
    ).toMatch(/پروکسی/);

    const activation = await buildMgmtActivation({ store, period, access });
    expect(activation.registrations).toBe(20);
    expect(activation.activationRate).toBe(0.72);
    expect(activation.timeToFirstSaleHours).toBe(36);
    expect(activation.titleFa).toBe(MGMT_TITLES_FA.activation);

    const engagement = await buildMgmtEngagement({ store, period, access });
    expect(engagement.dam).toBe(42);
    expect(engagement.mam).toBe(180);
    expect(engagement.posSessions).toBe(510);
    expect(engagement.featureAdoptionRate).toBe(0.55);
    expect(engagement.titleFa).toBe(MGMT_TITLES_FA.engagement);

    await expect(
      buildMgmtOverview({
        store,
        period,
        access: {
          roles: ["store_employee"],
          actorId: "staff",
          accessAudited: true,
        },
      }),
    ).rejects.toThrow(/platform_admin/i);
  });
});
