/**
 * Drizzle sales + membership counters for merchant OLTP dashboards (ADR-106).
 * Prefer index-backed aggregates on completed sales; projections hot-path via apply.
 */

import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { storeMemberships } from "../../../../infrastructure/database/schema/memberships.js";
import { sales } from "../../../../infrastructure/database/schema/sales.js";
import {
  assertMerchantId,
  notDeleted,
} from "../../../../infrastructure/persistence/helpers.js";
import { toTehranIsoDay } from "../../domain/merchant-oltp/index.js";
import type {
  AnalyticsDateRange,
  MembershipCountersPort,
  SalesCountersPort,
} from "../../domain/merchant-oltp/index.js";

function dayStartTehran(day: string): Date {
  // Approximate UTC instant for Asia/Tehran midnight of ISO day.
  return new Date(`${day}T00:00:00+03:30`);
}

function dayEndTehran(day: string): Date {
  return new Date(`${day}T23:59:59.999+03:30`);
}

export class DrizzleSalesCountersPort implements SalesCountersPort {
  constructor(private readonly db: DrizzleDb) {}

  async countCompletedSales(input: {
    merchantId: string;
    storeId?: string | null;
    range: AnalyticsDateRange;
  }): Promise<{ salesCount: number; revenueMinor: bigint }> {
    assertMerchantId(input.merchantId);
    const from = dayStartTehran(input.range.fromDay);
    const to = dayEndTehran(input.range.toDay);
    const conditions = [
      eq(sales.merchantId, input.merchantId),
      eq(sales.status, "completed"),
      notDeleted(sales.deletedAt),
      isNotNull(sales.completedAt),
      gte(sales.completedAt, from),
      lte(sales.completedAt, to),
    ];
    if (input.storeId) {
      conditions.push(eq(sales.storeId, input.storeId));
    }
    const rows = await this.db
      .select({
        salesCount: sql<number>`count(*)::int`,
        revenueMinor: sql<string>`coalesce(sum(${sales.totalAmountMinor}), 0)`,
      })
      .from(sales)
      .where(and(...conditions));
    const row = rows[0];
    return {
      salesCount: row?.salesCount ?? 0,
      revenueMinor: BigInt(row?.revenueMinor ?? "0"),
    };
  }

  async countMonthlyReturningCustomers(input: {
    merchantId: string;
    storeId?: string | null;
    range?: AnalyticsDateRange;
  }): Promise<number> {
    assertMerchantId(input.merchantId);
    const range = input.range;
    if (!range) return 0;
    const from = dayStartTehran(range.fromDay);
    const to = dayEndTehran(range.toDay);
    const conditions = [
      eq(sales.merchantId, input.merchantId),
      eq(sales.status, "completed"),
      notDeleted(sales.deletedAt),
      isNotNull(sales.completedAt),
      isNotNull(sales.membershipId),
      gte(sales.completedAt, from),
      lte(sales.completedAt, to),
    ];
    if (input.storeId) {
      conditions.push(eq(sales.storeId, input.storeId));
    }
    const rows = await this.db
      .select({
        membershipId: sales.membershipId,
        purchaseCount: sql<number>`count(*)::int`,
      })
      .from(sales)
      .where(and(...conditions))
      .groupBy(sales.membershipId);

    let returning = 0;
    for (const row of rows) {
      if ((row.purchaseCount ?? 0) > 1) returning += 1;
    }
    return returning;
  }
}

export class DrizzleMembershipCountersPort implements MembershipCountersPort {
  constructor(private readonly db: DrizzleDb) {}

  async countActiveMemberships(input: {
    merchantId: string;
    storeId?: string | null;
  }): Promise<number> {
    assertMerchantId(input.merchantId);
    const conditions = [
      eq(storeMemberships.merchantId, input.merchantId),
      eq(storeMemberships.status, "active"),
      notDeleted(storeMemberships.deletedAt),
    ];
    if (input.storeId) {
      conditions.push(eq(storeMemberships.storeId, input.storeId));
    }
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(storeMemberships)
      .where(and(...conditions));
    return rows[0]?.n ?? 0;
  }

  async countNewMemberships(input: {
    merchantId: string;
    storeId?: string | null;
    range: AnalyticsDateRange;
  }): Promise<number> {
    assertMerchantId(input.merchantId);
    const from = dayStartTehran(input.range.fromDay);
    const to = dayEndTehran(input.range.toDay);
    const conditions = [
      eq(storeMemberships.merchantId, input.merchantId),
      notDeleted(storeMemberships.deletedAt),
      gte(storeMemberships.joinedAt, from),
      lte(storeMemberships.joinedAt, to),
    ];
    if (input.storeId) {
      conditions.push(eq(storeMemberships.storeId, input.storeId));
    }
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(storeMemberships)
      .where(and(...conditions));
    return rows[0]?.n ?? 0;
  }
}

export { toTehranIsoDay };
