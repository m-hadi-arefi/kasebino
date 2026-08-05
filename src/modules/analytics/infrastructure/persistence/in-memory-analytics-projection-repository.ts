/**
 * In-memory analytics projection repository (ADR-063 / ADR-106 tests).
 */

import type { AnalyticsProjectionRepository } from "../../domain/projections.js";

type DailyRow = {
  merchantId: string;
  storeId: string | null;
  day: string;
  salesCount: number;
  revenueMinor: bigint;
};

type CustomerRow = {
  merchantId: string;
  storeId: string | null;
  day: string;
  newMemberships: number;
  salesWithPhone: number;
};

type RetentionRow = {
  merchantId: string;
  storeId: string | null;
  membershipId: string;
  day: string;
  purchaseCount: number;
};

function dailyKey(merchantId: string, storeId: string | null, day: string): string {
  return `${merchantId}|${storeId ?? ""}|${day}`;
}

export class InMemoryAnalyticsProjectionRepository
  implements AnalyticsProjectionRepository
{
  private readonly events = new Set<string>();
  private readonly rows = new Map<string, DailyRow>();
  private readonly customerRows = new Map<string, CustomerRow>();
  private readonly retentionRows = new Map<string, RetentionRow>();

  async tryBeginEvent(input: {
    eventId: string;
    merchantId: string;
    appliedAt: Date;
  }): Promise<boolean> {
    if (this.events.has(input.eventId)) return false;
    this.events.add(input.eventId);
    return true;
  }

  async upsertDailyRevenue(row: {
    merchantId: string;
    storeId: string | null;
    day: string;
    salesCountDelta: number;
    revenueMinorDelta: bigint;
  }): Promise<void> {
    const key = dailyKey(row.merchantId, row.storeId, row.day);
    const existing = this.rows.get(key);
    if (!existing) {
      this.rows.set(key, {
        merchantId: row.merchantId,
        storeId: row.storeId,
        day: row.day,
        salesCount: row.salesCountDelta,
        revenueMinor: row.revenueMinorDelta,
      });
      return;
    }
    existing.salesCount += row.salesCountDelta;
    existing.revenueMinor += row.revenueMinorDelta;
  }

  async upsertCustomerStats(row: {
    merchantId: string;
    storeId: string | null;
    day: string;
    newMembershipsDelta?: number;
    salesWithPhoneDelta?: number;
  }): Promise<void> {
    const key = dailyKey(row.merchantId, row.storeId, row.day);
    const existing = this.customerRows.get(key);
    if (!existing) {
      this.customerRows.set(key, {
        merchantId: row.merchantId,
        storeId: row.storeId,
        day: row.day,
        newMemberships: row.newMembershipsDelta ?? 0,
        salesWithPhone: row.salesWithPhoneDelta ?? 0,
      });
      return;
    }
    existing.newMemberships += row.newMembershipsDelta ?? 0;
    existing.salesWithPhone += row.salesWithPhoneDelta ?? 0;
  }

  async upsertRetentionPurchase(row: {
    merchantId: string;
    storeId: string | null;
    membershipId: string;
    day: string;
    purchaseCountDelta: number;
  }): Promise<void> {
    const key = `${row.membershipId}|${row.day}`;
    const existing = this.retentionRows.get(key);
    if (!existing) {
      this.retentionRows.set(key, {
        merchantId: row.merchantId,
        storeId: row.storeId,
        membershipId: row.membershipId,
        day: row.day,
        purchaseCount: row.purchaseCountDelta,
      });
      return;
    }
    existing.purchaseCount += row.purchaseCountDelta;
  }

  async findDailyRevenue(input: {
    merchantId: string;
    storeId?: string | null;
    fromDay: string;
    toDay: string;
  }): Promise<DailyRow[]> {
    return [...this.rows.values()]
      .filter((r) => {
        if (r.merchantId !== input.merchantId) return false;
        if (input.storeId !== undefined && input.storeId !== null) {
          if (r.storeId !== input.storeId) return false;
        }
        return r.day >= input.fromDay && r.day <= input.toDay;
      })
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((r) => ({ ...r }));
  }

  async countMonthlyReturningFromProjection(input: {
    merchantId: string;
    storeId?: string | null;
    fromDay: string;
    toDay: string;
  }): Promise<number> {
    const totals = new Map<string, number>();
    for (const row of this.retentionRows.values()) {
      if (row.merchantId !== input.merchantId) continue;
      if (input.storeId && row.storeId !== input.storeId) continue;
      if (row.day < input.fromDay || row.day > input.toDay) continue;
      totals.set(
        row.membershipId,
        (totals.get(row.membershipId) ?? 0) + row.purchaseCount,
      );
    }
    let returning = 0;
    for (const n of totals.values()) {
      if (n > 1) returning += 1;
    }
    return returning;
  }
}
