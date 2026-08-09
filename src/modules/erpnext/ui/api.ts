/**
 * ERPNext finance merchant HTTP client — session cookies only (ADR-141).
 * Never holds ERPNext credentials.
 */

import type {
  CustomerFinancialOverview,
  FinanceDashboardSummary,
  FinanceInvoiceRow,
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
  const res = await fetch("/api/v1/erpnext/finance/dashboard", {
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
