/**
 * Merchant-facing finance DTOs (provider-neutral) — ADR-141.
 */

export type FinanceMoney = {
  amountMinor: string;
  currency: "IRR";
  displayToman: string;
};

export type FinanceDashboardSummary = {
  source: "erpnext" | "unavailable" | "fake";
  asOf: string;
  todaySales: FinanceMoney;
  monthRevenue: FinanceMoney;
  receivables: FinanceMoney;
  payables: FinanceMoney;
  /** Soft profit overview — null when ERP unavailable. */
  profitOverview: FinanceMoney | null;
  invoiceCountSynced: number;
  paymentCountSynced: number;
  pendingSyncCount: number;
  failedSyncCount: number;
};

export type FinanceInvoiceRow = {
  saleOrOrderId: string;
  channel: "pos" | "online" | "unknown";
  externalId: string | null;
  status: "pending" | "synced" | "failed" | "unknown";
  total: FinanceMoney | null;
  occurredAt: string | null;
  errorMessageFa: string | null;
};

export type CustomerFinancialOverview = {
  customerId: string;
  source: "erpnext" | "unavailable" | "fake";
  outstanding: FinanceMoney;
  invoices: Array<{
    externalId: string;
    status: string;
    grandTotal: FinanceMoney;
    outstanding: FinanceMoney;
    postingDate: string | null;
  }>;
  payments: Array<{
    externalId: string;
    amount: FinanceMoney;
    postingDate: string | null;
  }>;
  creditStatusFa: string;
};
