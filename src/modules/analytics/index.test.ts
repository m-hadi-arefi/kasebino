/**
 * Analytics module projection wiring tests (ADR-063).
 */

import { describe, expect, it } from "vitest";

import {
  InMemoryMembershipCountersPort,
  InMemorySalesCountersPort,
  createAnalyticsOverviewUseCases,
  createAnalyticsProjectionHandler,
  InMemoryAnalyticsProjectionRepository,
  MERCHANT_OLTP_CACHE,
  stubJalaliRange,
} from "./index.js";

describe("modules/analytics projections (ADR-063)", () => {
  it("applies SaleCompleted into daily revenue projection idempotently", async () => {
    const projections = new InMemoryAnalyticsProjectionRepository();
    const handler = createAnalyticsProjectionHandler({ projections });

    const first = await handler.applySaleCompleted({
      eventId: "evt-1",
      merchantId: "m1",
      storeId: "s1",
      occurredAt: "2026-08-03T10:00:00.000Z",
      revenueMinor: 42_000n,
    });
    const dup = await handler.applySaleCompleted({
      eventId: "evt-1",
      merchantId: "m1",
      storeId: "s1",
      occurredAt: "2026-08-03T10:00:00.000Z",
      revenueMinor: 42_000n,
    });
    await handler.applySaleCompleted({
      eventId: "evt-2",
      merchantId: "m1",
      storeId: "s1",
      occurredAt: "2026-08-03T11:00:00.000Z",
      revenueMinor: 8_000n,
    });

    expect(first).toBe("applied");
    expect(dup).toBe("duplicate");

    const rows = await projections.findDailyRevenue({
      merchantId: "m1",
      storeId: "s1",
      fromDay: "2026-08-03",
      toDay: "2026-08-03",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.salesCount).toBe(2);
    expect(rows[0]?.revenueMinor).toBe(50_000n);
  });

  it("getOverview uses sales + membership counter ports", async () => {
    const sales = new InMemorySalesCountersPort();
    const memberships = new InMemoryMembershipCountersPort();
    sales.seedSale({
      merchantId: "m1",
      day: "2026-08-01",
      revenueMinor: 10_000n,
      customerId: "c1",
    });
    memberships.seedMembership({
      merchantId: "m1",
      joinedDay: "2026-08-01",
    });

    const useCases = createAnalyticsOverviewUseCases({ sales, memberships });
    const overview = await useCases.getOverview({
      merchantId: "m1",
      range: stubJalaliRange({ fromDay: "2026-08-01", toDay: "2026-08-03" }),
    });

    expect(overview.salesCount).toBe(1);
    expect(overview.activeMemberships).toBe(1);
    expect(overview.cacheTtlSeconds).toBe(MERCHANT_OLTP_CACHE.ttlSeconds);
    expect(overview.titleFa).toMatch(/[\u0600-\u06FF]/);
  });
});
