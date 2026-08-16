/**
 * In-Memory Report Repository Implementation (MerchantOS Phase 8).
 */

import type { ReportRepository } from "../application/report-use-cases.js";
import type {
  DebtAgingReport,
  InventoryValuationReport,
  ProfitSummaryReport,
} from "../domain/reports.js";

export class InMemoryReportRepository implements ReportRepository {
  async getProfitSummary(
    _merchantId: string,
    startDate: string,
    endDate: string,
  ): Promise<ProfitSummaryReport> {
    void _merchantId;
    const totalRevenueMinor = 150000000n; // 15,000,000 IRR
    const totalCogsMinor = 90000000n; // 9,000,000 IRR
    const grossProfitMinor = totalRevenueMinor - totalCogsMinor; // 6,000,000 IRR
    const totalExpensesMinor = 15000000n; // 1,500,000 IRR
    const netProfitMinor = grossProfitMinor - totalExpensesMinor; // 4,500,000 IRR

    return {
      startDate,
      endDate,
      totalRevenueMinor,
      totalCogsMinor,
      grossProfitMinor,
      totalExpensesMinor,
      netProfitMinor,
    };
  }

  async getInventoryValuation(
    _merchantId: string,
    _storeId?: string,
  ): Promise<InventoryValuationReport> {
    void _merchantId;
    void _storeId;
    return {
      totalProductsCount: 45,
      totalQuantity: 320,
      totalValueMinor: 480000000n, // 48,000,000 IRR stock value
    };
  }

  async getDebtAging(_merchantId: string): Promise<DebtAgingReport> {
    void _merchantId;
    return {
      customerReceivables: {
        current0To30Minor: 12000000n,
        days31To60Minor: 4000000n,
        days61To90Minor: 0n,
        over90Minor: 0n,
        totalBalanceMinor: 16000000n,
      },
      supplierPayables: {
        current0To30Minor: 25000000n,
        days31To60Minor: 10000000n,
        days61To90Minor: 0n,
        over90Minor: 0n,
        totalBalanceMinor: 35000000n,
      },
    };
  }
}
