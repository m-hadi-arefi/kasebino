/**
 * ERPNext finance merchant HTTP client — session cookies only (ADR-141).
 * Never holds ERPNext credentials.
 */

import type {
  CustomerFinancialOverview,
  FinanceAccountNode,
  FinanceBalanceSheetReport,
  FinanceDashboardSummary,
  FinanceGeneralLedgerRow,
  FinanceInvoiceRow,
  FinancePayablesSummary,
  FinanceProfitAndLossReport,
  FinanceReceivablesSummary,
  FinanceTrialBalanceReport,
} from "../domain/finance-types.js";
import type { ErpNextSyncRecord } from "../domain/sync-record.js";

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string; messageFa?: string };
};

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as Envelope<T>;
  if (!res.ok) {
    throw new Error(
      body.error?.messageFa || body.error?.message || "خطای شبکه",
    );
  }
  if (!body.data) {
    throw new Error("پاسخ خالی از سرور");
  }
  return body.data;
}

export async function fetchFinanceDashboard(): Promise<{
  summary: FinanceDashboardSummary;
}> {
  const res = await fetch("/api/v1/accounting?action=dashboard", {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function fetchFinanceInvoices(): Promise<{
  invoices: FinanceInvoiceRow[];
}> {
  const res = await fetch("/api/v1/erpnext/finance/invoices", {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function fetchFinanceSyncRecords(status?: string): Promise<{
  records: Array<
    Omit<ErpNextSyncRecord, "createdAt" | "updatedAt" | "lastSyncAt"> & {
      createdAt: string;
      updatedAt: string;
      lastSyncAt: string | null;
    }
  >;
}> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`/api/v1/erpnext/finance/sync${q}`, {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function retryFinanceSync(params: {
  syncRecordId?: string;
  entityType?: string;
  entityId?: string;
}): Promise<{
  ok: boolean;
  status: string;
  externalId: string | null;
  messageFa: string;
}> {
  const res = await fetch("/api/v1/erpnext/finance/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(params),
  });
  return parseJson(res);
}

export async function fetchSaleFinancialStatus(saleId: string): Promise<{
  saleId: string;
  syncStatus: string;
  erpnextId: string | null;
  erpnextType: string | null;
  errorMessageFa: string | null;
  lastSyncAt: string | null;
}> {
  const res = await fetch(
    `/api/v1/erpnext/finance/sales/${encodeURIComponent(saleId)}`,
    { credentials: "same-origin" },
  );
  return parseJson(res);
}

export async function fetchCustomerFinancialOverview(
  customerId: string,
): Promise<CustomerFinancialOverview> {
  const res = await fetch(
    `/api/v1/erpnext/finance/customers/${encodeURIComponent(customerId)}`,
    { credentials: "same-origin" },
  );
  return parseJson(res);
}

export async function fetchChartOfAccounts(): Promise<{
  accounts: FinanceAccountNode[];
}> {
  const res = await fetch("/api/v1/accounting?action=chart-of-accounts", {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function fetchGeneralLedger(params?: {
  account?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  entries: FinanceGeneralLedgerRow[];
}> {
  const q = new URLSearchParams();
  q.set("action", "general-ledger");
  if (params?.account) q.set("account", params.account);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  const res = await fetch(`/api/v1/accounting?${q.toString()}`, {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function fetchProfitAndLoss(): Promise<{
  report: FinanceProfitAndLossReport;
}> {
  const res = await fetch("/api/v1/accounting?action=reports/profit-and-loss", {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function fetchBalanceSheet(): Promise<{
  report: FinanceBalanceSheetReport;
}> {
  const res = await fetch("/api/v1/accounting?action=reports/balance-sheet", {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function fetchTrialBalance(): Promise<{
  report: FinanceTrialBalanceReport;
}> {
  const res = await fetch("/api/v1/accounting?action=reports/trial-balance", {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function fetchPayables(): Promise<{
  payables: FinancePayablesSummary;
}> {
  const res = await fetch("/api/v1/accounting?action=payables", {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function fetchReceivables(): Promise<{
  receivables: FinanceReceivablesSummary;
}> {
  const res = await fetch("/api/v1/accounting?action=receivables", {
    credentials: "same-origin",
  });
  return parseJson(res);
}

export async function fetchIntegrityCheck(): Promise<{
  status: string;
  syncHealthPercent: number;
  pendingEvents: number;
  failedEvents: number;
  mismatches: Array<{ entityType: string; entityId: string; reason: string }>;
  lastCheckedAt: string;
}> {
  const res = await fetch("/api/v1/accounting?action=integrity", {
    credentials: "same-origin",
  });
  return parseJson(res);
}
