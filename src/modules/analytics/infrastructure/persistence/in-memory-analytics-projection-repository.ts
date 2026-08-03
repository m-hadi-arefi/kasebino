/**
 * In-memory analytics projection repository (ADR-063 tests / worker skeleton).
 * Drizzle implementation → ARD-016 Kit migrations.
 */

import type { AnalyticsProjectionRepository } from "../../domain/projections.js";

type DailyRow = {
  merchantId: string;
  storeId: string | null;
  day: string;
  salesCount: number;
  revenueMinor: bigint;
};

function rowKey(merchantId: string, storeId: string | null, day: string): string {
  return `${merchantId}|${storeId ?? ""}|${day}`;
}

export class InMemoryAnalyticsProjectionRepository
  implements AnalyticsProjectionRepository
{
  private readonly rows = new Map<string, DailyRow>();

  async upsertDailyRevenue(row: {
    merchantId: string;
    storeId: string | null;
    day: string;
    salesCountDelta: number;
    revenueMinorDelta: bigint;
  }): Promise<void> {
    const key = rowKey(row.merchantId, row.storeId, row.day);
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
}
