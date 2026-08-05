/**
 * Drizzle analytics projection repository (ADR-106).
 */

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import {
  analyticsCustomerStats,
  analyticsDailyRevenue,
  analyticsProjectionEvents,
  analyticsRetentionStats,
} from "../../../../infrastructure/database/schema/analytics.js";
import { assertMerchantId } from "../../../../infrastructure/persistence/helpers.js";
import type { AnalyticsProjectionRepository } from "../../domain/projections.js";

/** Sentinel store when apply lacks storeId (should be rare — POS always has store). */
const UNKNOWN_STORE = "00000000-0000-4000-8000-000000000000";

function resolveStoreId(storeId: string | null | undefined): string {
  return storeId?.trim() || UNKNOWN_STORE;
}

export class DrizzleAnalyticsProjectionRepository
  implements AnalyticsProjectionRepository
{
  constructor(private readonly db: DrizzleDb) {}

  async tryBeginEvent(input: {
    eventId: string;
    merchantId: string;
    appliedAt: Date;
  }): Promise<boolean> {
    assertMerchantId(input.merchantId);
    try {
      await this.db.insert(analyticsProjectionEvents).values({
        eventId: input.eventId,
        merchantId: input.merchantId,
        appliedAt: input.appliedAt,
      });
      return true;
    } catch {
      return false;
    }
  }

  async upsertDailyRevenue(row: {
    merchantId: string;
    storeId: string | null;
    day: string;
    salesCountDelta: number;
    revenueMinorDelta: bigint;
  }): Promise<void> {
    assertMerchantId(row.merchantId);
    const storeId = resolveStoreId(row.storeId);
    const now = new Date();
    await this.db
      .insert(analyticsDailyRevenue)
      .values({
        id: randomUUID(),
        merchantId: row.merchantId,
        storeId,
        day: row.day,
        salesCount: row.salesCountDelta,
        revenueMinor: row.revenueMinorDelta,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          analyticsDailyRevenue.merchantId,
          analyticsDailyRevenue.storeId,
          analyticsDailyRevenue.day,
        ],
        set: {
          salesCount: sql`${analyticsDailyRevenue.salesCount} + ${row.salesCountDelta}`,
          revenueMinor: sql`${analyticsDailyRevenue.revenueMinor} + ${row.revenueMinorDelta}`,
          updatedAt: now,
        },
      });
  }

  async upsertCustomerStats(row: {
    merchantId: string;
    storeId: string | null;
    day: string;
    newMembershipsDelta?: number;
    salesWithPhoneDelta?: number;
  }): Promise<void> {
    assertMerchantId(row.merchantId);
    const storeId = resolveStoreId(row.storeId);
    const now = new Date();
    const newDelta = row.newMembershipsDelta ?? 0;
    const phoneDelta = row.salesWithPhoneDelta ?? 0;
    await this.db
      .insert(analyticsCustomerStats)
      .values({
        id: randomUUID(),
        merchantId: row.merchantId,
        storeId,
        day: row.day,
        newMemberships: newDelta,
        salesWithPhone: phoneDelta,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          analyticsCustomerStats.merchantId,
          analyticsCustomerStats.storeId,
          analyticsCustomerStats.day,
        ],
        set: {
          newMemberships: sql`${analyticsCustomerStats.newMemberships} + ${newDelta}`,
          salesWithPhone: sql`${analyticsCustomerStats.salesWithPhone} + ${phoneDelta}`,
          updatedAt: now,
        },
      });
  }

  async upsertRetentionPurchase(row: {
    merchantId: string;
    storeId: string | null;
    membershipId: string;
    day: string;
    purchaseCountDelta: number;
  }): Promise<void> {
    assertMerchantId(row.merchantId);
    const storeId = resolveStoreId(row.storeId);
    const now = new Date();
    await this.db
      .insert(analyticsRetentionStats)
      .values({
        id: randomUUID(),
        merchantId: row.merchantId,
        storeId,
        membershipId: row.membershipId,
        day: row.day,
        purchaseCount: row.purchaseCountDelta,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          analyticsRetentionStats.membershipId,
          analyticsRetentionStats.day,
        ],
        set: {
          purchaseCount: sql`${analyticsRetentionStats.purchaseCount} + ${row.purchaseCountDelta}`,
          updatedAt: now,
        },
      });
  }

  async findDailyRevenue(input: {
    merchantId: string;
    storeId?: string | null;
    fromDay: string;
    toDay: string;
  }) {
    assertMerchantId(input.merchantId);
    const conditions = [
      eq(analyticsDailyRevenue.merchantId, input.merchantId),
      gte(analyticsDailyRevenue.day, input.fromDay),
      lte(analyticsDailyRevenue.day, input.toDay),
    ];
    if (input.storeId) {
      conditions.push(eq(analyticsDailyRevenue.storeId, input.storeId));
    }
    const rows = await this.db
      .select()
      .from(analyticsDailyRevenue)
      .where(and(...conditions))
      .orderBy(analyticsDailyRevenue.day);
    return rows.map((r) => ({
      merchantId: r.merchantId,
      storeId: r.storeId,
      day: r.day,
      salesCount: r.salesCount,
      revenueMinor: r.revenueMinor,
    }));
  }

  async countMonthlyReturningFromProjection(input: {
    merchantId: string;
    storeId?: string | null;
    fromDay: string;
    toDay: string;
  }): Promise<number> {
    assertMerchantId(input.merchantId);
    const conditions = [
      eq(analyticsRetentionStats.merchantId, input.merchantId),
      gte(analyticsRetentionStats.day, input.fromDay),
      lte(analyticsRetentionStats.day, input.toDay),
    ];
    if (input.storeId) {
      conditions.push(eq(analyticsRetentionStats.storeId, input.storeId));
    }
    const rows = await this.db
      .select({
        membershipId: analyticsRetentionStats.membershipId,
        total: sql<number>`sum(${analyticsRetentionStats.purchaseCount})::int`,
      })
      .from(analyticsRetentionStats)
      .where(and(...conditions))
      .groupBy(analyticsRetentionStats.membershipId);

    let returning = 0;
    for (const row of rows) {
      if ((row.total ?? 0) > 1) returning += 1;
    }
    return returning;
  }
}
