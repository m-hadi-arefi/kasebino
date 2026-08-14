/**
 * Reports Application Use-Cases (MerchantOS Phase 8).
 */

import {
  DebtAgingReport,
  InventoryValuationReport,
  ProfitSummaryReport,
} from "../domain/reports.js";

export interface ReportRepository {
  getProfitSummary(merchantId: string, startDate: string, endDate: string): Promise<ProfitSummaryReport>;
  getInventoryValuation(merchantId: string, storeId?: string): Promise<InventoryValuationReport>;
  getDebtAging(merchantId: string): Promise<DebtAgingReport>;
}

export class GetProfitSummaryUseCase {
  constructor(private readonly repo: ReportRepository) {}

  async execute(merchantId: string, startDate: string, endDate: string): Promise<ProfitSummaryReport> {
    return this.repo.getProfitSummary(merchantId, startDate, endDate);
  }
}

export class GetInventoryValuationUseCase {
  constructor(private readonly repo: ReportRepository) {}

  async execute(merchantId: string, storeId?: string): Promise<InventoryValuationReport> {
    return this.repo.getInventoryValuation(merchantId, storeId);
  }
}

export class GetDebtAgingUseCase {
  constructor(private readonly repo: ReportRepository) {}

  async execute(merchantId: string): Promise<DebtAgingReport> {
    return this.repo.getDebtAging(merchantId);
  }
}
