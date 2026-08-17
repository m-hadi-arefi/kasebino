/**
 * ADR-063 Merchant OLTP Dashboard Analytics contract tests.
 */

import { describe, expect, it } from "vitest";

import { MERCHANT_OLTP_ANALYTICS } from "../../../../infrastructure/mongodb/contracts/boundaries/index.js";
import { CACHE_TTL_SECONDS } from "../../../../infrastructure/redis/cache-keys/index.js";

import {
  AN_CAPABILITY_MAP,
  InMemoryMembershipCountersPort,
  InMemorySalesCountersPort,
  MERCHANT_OLTP_ANALYTICS_PACKAGE,
  MERCHANT_OLTP_CACHE,
  MERCHANT_OLTP_DASHBOARD_DECISION,
  MERCHANT_OLTP_TITLES_FA,
  MERCHANT_OLTP_UX_FA,
  assertCacheTtl60Seconds,
  assertImplementedHere,
  assertJalaliRangeStub,
  assertMerchantOltpOnPostgresql,
  assertOffCheckoutCriticalPath,
  assertPersianTitles,
  buildMerchantOverview,
  northStarRollingRange,
  overviewCacheKey,
  persianTitleForCapability,
  revenueCacheKey,
  stubJalaliRange,
} from "./index.js";

describe("ADR-063 Merchant OLTP Dashboard Analytics", () => {
  it("locks PG projections + Redis 60s for AN-01..04 including North Star", () => {
    expect(MERCHANT_OLTP_DASHBOARD_DECISION.pattern).toBe(
      "pg_projections_redis_60s_for_an_01_04",
    );
    expect(MERCHANT_OLTP_DASHBOARD_DECISION.store).toBe(
      "postgresql_projections",
    );
    expect(MERCHANT_OLTP_DASHBOARD_DECISION.cacheTtlSeconds).toBe(60);
    expect(MERCHANT_OLTP_DASHBOARD_DECISION.northStar).toBe(
      "monthly_returning_customers",
    );
    expect(MERCHANT_OLTP_DASHBOARD_DECISION.capabilities).toEqual([
      "AN-01",
      "AN-02",
      "AN-03",
      "AN-04",
    ]);
    expect(MERCHANT_OLTP_CACHE.ttlSeconds).toBe(60);
    expect(MERCHANT_OLTP_CACHE.noteEn).toMatch(/TTL 60s/i);
    expect(MERCHANT_OLTP_CACHE.noteFa).toMatch(/[\u0600-\u06FF]/);
    expect(CACHE_TTL_SECONDS.analytics).toBe(60);
    expect(MERCHANT_OLTP_ANALYTICS.cacheTtlSeconds).toBe(60);
    expect(() => assertCacheTtl60Seconds()).not.toThrow();
    expect(() => assertMerchantOltpOnPostgresql()).not.toThrow();
    expect(() => assertOffCheckoutCriticalPath(false)).not.toThrow();
    expect(() => assertOffCheckoutCriticalPath(true)).toThrow(/critical path/i);
    expect(() =>
      assertImplementedHere("src/modules/analytics/domain/merchant-oltp/"),
    ).not.toThrow();
  });

  it("maps AN capabilities to Persian titles and reserved API paths", () => {
    expect(AN_CAPABILITY_MAP["AN-01"].path).toBe(
      "/api/v1/analytics/merchant/overview",
    );
    expect(AN_CAPABILITY_MAP["AN-04"].titleFa).toBe(
      MERCHANT_OLTP_TITLES_FA.retention,
    );
    expect(persianTitleForCapability("AN-01")).toMatch(/[\u0600-\u06FF]/);
    expect(MERCHANT_OLTP_TITLES_FA.northStar).toMatch(/[\u0600-\u06FF]/);
    expect(MERCHANT_OLTP_UX_FA.dir).toBe("rtl");
    expect(MERCHANT_OLTP_UX_FA.calendar).toBe("jalali");
    expect(MERCHANT_OLTP_UX_FA.timeZone).toBe("Asia/Tehran");
    expect(MERCHANT_OLTP_UX_FA.moneyDisplayUnit).toBe("toman");
    expect(() => assertPersianTitles()).not.toThrow();
  });

  it("provides Jalali / Asia/Tehran range helpers stub", () => {
    const range = stubJalaliRange({
      fromDay: "2026-07-01",
      toDay: "2026-07-31",
    });
    expect(range.calendar).toBe("jalali");
    expect(range.timeZone).toBe("Asia/Tehran");
    expect(range.jalaliHelperStub).toBe(true);
    expect(range.fromDay).toBe("2026-07-01");
    expect(range.toDay).toBe("2026-07-31");
    expect(range.labelFa).toMatch(/[\u0600-\u06FF]/);
    expect(() => assertJalaliRangeStub(range)).not.toThrow();

    const rolling = northStarRollingRange(() => new Date("2026-08-03T12:00:00Z"));
    expect(rolling.toDay).toBe("2026-08-03");
    expect(rolling.fromDay).toBe("2026-07-05");

    expect(() =>
      stubJalaliRange({ fromDay: "2026-08-10", toDay: "2026-08-01" }),
    ).toThrow(/fromDay/);
  });

  it("builds AN-01 overview from sales + membership counter ports", async () => {
    const sales = new InMemorySalesCountersPort();
    const memberships = new InMemoryMembershipCountersPort();
    const range = stubJalaliRange({
      fromDay: "2026-07-01",
      toDay: "2026-07-31",
    });

    sales.seedSale({
      merchantId: "m1",
      storeId: "s1",
      customerId: "c1",
      day: "2026-07-10",
      revenueMinor: 100_000n,
    });
    sales.seedSale({
      merchantId: "m1",
      storeId: "s1",
      customerId: "c1",
      day: "2026-07-20",
      revenueMinor: 50_000n,
    });
    sales.seedSale({
      merchantId: "m1",
      storeId: "s1",
      customerId: "c2",
      day: "2026-07-15",
      revenueMinor: 25_000n,
    });
    sales.seedSale({
      merchantId: "m2",
      day: "2026-07-15",
      revenueMinor: 999_999n,
    });

    memberships.seedMembership({
      merchantId: "m1",
      storeId: "s1",
      joinedDay: "2026-07-05",
    });
    memberships.seedMembership({
      merchantId: "m1",
      storeId: "s1",
      joinedDay: "2026-06-01",
    });
    memberships.seedMembership({
      merchantId: "m1",
      storeId: "s1",
      status: "inactive",
      joinedDay: "2026-07-08",
    });

    const overview = await buildMerchantOverview({
      merchantId: "m1",
      storeId: "s1",
      range,
      sales,
      memberships,
      now: () => new Date("2026-07-31T12:00:00Z"),
    });

    expect(overview.capability).toBe("AN-01");
    expect(overview.titleFa).toBe(MERCHANT_OLTP_TITLES_FA.overview);
    expect(overview.salesCount).toBe(3);
    expect(overview.revenueMinor).toBe(175_000n);
    expect(overview.activeMemberships).toBe(2);
    expect(overview.newMemberships).toBe(2);
    expect(overview.monthlyReturningCustomers).toBe(1);
    expect(overview.moneyTruthStore).toBe("postgresql_projections");
    expect(overview.cacheTtlSeconds).toBe(60);
    expect(overview.range.jalaliHelperStub).toBe(true);
  });

  it("requires merchantId and isolates tenants", async () => {
    const sales = new InMemorySalesCountersPort();
    const memberships = new InMemoryMembershipCountersPort();
    await expect(
      buildMerchantOverview({
        merchantId: "  ",
        sales,
        memberships,
      }),
    ).rejects.toThrow(/merchantId/i);

    sales.seedSale({
      merchantId: "other",
      day: "2026-08-01",
      revenueMinor: 10n,
    });
    const overview = await buildMerchantOverview({
      merchantId: "m1",
      sales,
      memberships,
      range: stubJalaliRange({ fromDay: "2026-08-01", toDay: "2026-08-03" }),
    });
    expect(overview.salesCount).toBe(0);
    expect(overview.revenueMinor).toBe(0n);
  });

  it("builds overview cache keys with analytics TTL class", () => {
    expect(
      overviewCacheKey({ env: "test", merchantId: "merchant-1" }),
    ).toBe("mos:test:m:merchant-1:analytics:overview");
    expect(
      revenueCacheKey({
        env: "test",
        merchantId: "merchant-1",
        range: "7d",
      }),
    ).toBe("mos:test:m:merchant-1:analytics:revenue:7d");
  });

  it("exports package barrel", () => {
    expect(MERCHANT_OLTP_ANALYTICS_PACKAGE.placement.package).toBe(
      "src/modules/analytics/domain/merchant-oltp/",
    );
    expect(MERCHANT_OLTP_ANALYTICS_PACKAGE.requirements.salesCountersPort).toBe(
      true,
    );
  });
});
