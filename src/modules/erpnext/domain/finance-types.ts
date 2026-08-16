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

export type FinanceAccountNode = {
  name: string;
  accountName: string;
  accountNumber?: string | undefined;
  parentAccount?: string | undefined;
  accountType?: string | undefined;
  rootType: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
  isGroup: boolean;
  balance: FinanceMoney;
  children?: FinanceAccountNode[] | undefined;
};

export type FinanceGeneralLedgerRow = {
  id: string;
  postingDate: string;
  account: string;
  againstAccount?: string | undefined;
  debit: FinanceMoney;
  credit: FinanceMoney;
  balance: FinanceMoney;
  voucherType: string;
  voucherNo: string;
  partyType?: string | undefined;
  party?: string | undefined;
  remarks?: string | undefined;
};

export type FinanceReportItem = {
  account: string;
  accountName: string;
  indent: number;
  yearToDate: FinanceMoney;
};

export type FinanceProfitAndLossReport = {
  source: "erpnext" | "unavailable" | "fake";
  asOf: string;
  rows: FinanceReportItem[];
  totalIncome: FinanceMoney;
  totalExpense: FinanceMoney;
  netProfit: FinanceMoney;
};

export type FinanceBalanceSheetReport = {
  source: "erpnext" | "unavailable" | "fake";
  asOf: string;
  rows: FinanceReportItem[];
  totalAsset: FinanceMoney;
  totalLiability: FinanceMoney;
  totalEquity: FinanceMoney;
};

export type FinanceTrialBalanceRow = {
  account: string;
  accountName: string;
  debit: FinanceMoney;
  credit: FinanceMoney;
  closingDebit: FinanceMoney;
  closingCredit: FinanceMoney;
};

export type FinanceTrialBalanceReport = {
  source: "erpnext" | "unavailable" | "fake";
  asOf: string;
  rows: FinanceTrialBalanceRow[];
  totalDebit: FinanceMoney;
  totalCredit: FinanceMoney;
};

export type FinancePayablesSummary = {
  source: "erpnext" | "unavailable" | "fake";
  asOf: string;
  totalPayable: FinanceMoney;
  invoices: Array<{
    invoiceNo: string;
    supplier: string;
    postingDate: string;
    grandTotal: FinanceMoney;
    outstandingAmount: FinanceMoney;
  }>;
};

export type FinanceReceivablesSummary = {
  source: "erpnext" | "unavailable" | "fake";
  asOf: string;
  totalReceivable: FinanceMoney;
  invoices: Array<{
    invoiceNo: string;
    customer: string;
    postingDate: string;
    dueDate?: string | undefined;
    grandTotal: FinanceMoney;
    outstandingAmount: FinanceMoney;
  }>;
};

