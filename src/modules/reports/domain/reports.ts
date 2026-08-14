/**
 * Operational Reports Domain Types (MerchantOS Phase 8).
 */

export type DailySalesReport = {
  readonly date: string;
  readonly totalSalesMinor: bigint;
  readonly totalOrders: number;
  readonly totalCogsMinor: bigint;
  readonly grossProfitMinor: bigint;
  readonly grossMarginPercentage: number;
};

export type ProfitSummaryReport = {
  readonly startDate: string;
  readonly endDate: string;
  readonly totalRevenueMinor: bigint;
  readonly totalCogsMinor: bigint;
  readonly grossProfitMinor: bigint;
  readonly totalExpensesMinor: bigint;
  readonly netProfitMinor: bigint;
};

export type InventoryValuationReport = {
  readonly totalProductsCount: number;
  readonly totalQuantity: number;
  readonly totalValueMinor: bigint;
};

export type AgingBucket = {
  readonly current0To30Minor: bigint;
  readonly days31To60Minor: bigint;
  readonly days61To90Minor: bigint;
  readonly over90Minor: bigint;
  readonly totalBalanceMinor: bigint;
};

export type DebtAgingReport = {
  readonly customerReceivables: AgingBucket;
  readonly supplierPayables: AgingBucket;
};
