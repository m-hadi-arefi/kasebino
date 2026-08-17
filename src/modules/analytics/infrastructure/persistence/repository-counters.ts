/**
 * SaleRepository / StoreMembershipRepository backed analytics counters (ADR-106).
 * Works for both InMemory (tests) and Drizzle (production) repositories.
 */

import type { StoreMembershipRepository } from "../../../crm/domain/repositories.js";
import type { SaleRepository } from "../../../pos/domain/repositories.js";
import type {
  AnalyticsDateRange,
  MembershipCountersPort,
  SalesCountersPort,
} from "../../domain/merchant-oltp/index.js";

function dayStartTehran(day: string): Date {
  return new Date(`${day}T00:00:00+03:30`);
}

function dayEndTehran(day: string): Date {
  return new Date(`${day}T23:59:59.999+03:30`);
}

function inRange(at: Date | null, range: AnalyticsDateRange): boolean {
  if (!at) return false;
  const t = at.getTime();
  return (
    t >= dayStartTehran(range.fromDay).getTime() &&
    t <= dayEndTehran(range.toDay).getTime()
  );
}

export class SaleRepositoryCountersPort implements SalesCountersPort {
  constructor(private readonly sales: SaleRepository) {}

  async countCompletedSales(input: {
    merchantId: string;
    storeId?: string | null;
    range: AnalyticsDateRange;
  }): Promise<{ salesCount: number; revenueMinor: bigint }> {
    const rows = await this.sales.listCompletedByMerchantId(input.merchantId, {
      storeId: input.storeId ?? null,
    });
    let salesCount = 0;
    let revenueMinor = 0n;
    for (const sale of rows) {
      if (!inRange(sale.completedAt, input.range)) continue;
      salesCount += 1;
      revenueMinor += sale.totalAmountMinor;
    }
    return { salesCount, revenueMinor };
  }

  async countMonthlyReturningCustomers(input: {
    merchantId: string;
    storeId?: string | null;
    range?: AnalyticsDateRange;
  }): Promise<number> {
    if (!input.range) return 0;
    const rows = await this.sales.listCompletedByMerchantId(input.merchantId, {
      storeId: input.storeId ?? null,
    });
    const counts = new Map<string, number>();
    for (const sale of rows) {
      if (!sale.membershipId) continue;
      if (!inRange(sale.completedAt, input.range)) continue;
      counts.set(
        sale.membershipId,
        (counts.get(sale.membershipId) ?? 0) + 1,
      );
    }
    let returning = 0;
    for (const n of counts.values()) {
      if (n > 1) returning += 1;
    }
    return returning;
  }
}

export class MembershipRepositoryCountersPort implements MembershipCountersPort {
  constructor(private readonly memberships: StoreMembershipRepository) {}

  async countActiveMemberships(input: {
    merchantId: string;
    storeId?: string | null;
  }): Promise<number> {
    const rows = input.storeId
      ? await this.memberships.listByStoreId(input.storeId, {
          merchantId: input.merchantId,
        })
      : await this.memberships.listByMerchantId(input.merchantId);
    return rows.filter((m) => m.status === "active").length;
  }

  async countNewMemberships(input: {
    merchantId: string;
    storeId?: string | null;
    range: AnalyticsDateRange;
  }): Promise<number> {
    const rows = input.storeId
      ? await this.memberships.listByStoreId(input.storeId, {
          merchantId: input.merchantId,
        })
      : await this.memberships.listByMerchantId(input.merchantId);
    return rows.filter((m) => inRange(m.joinedAt, input.range)).length;
  }
}
