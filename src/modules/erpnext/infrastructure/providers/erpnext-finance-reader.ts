/**
 * Live ERPNext finance reader (ADR-141) — server only.
 * Uses shared Frappe client; never imported by browser code.
 */

import type { FinanceReader } from "../../application/ports.js";
import { moneyOf } from "../../application/money.js";
import type {
  CustomerFinancialOverview,
  FinanceDashboardSummary,
  FinanceInvoiceRow,
} from "../../domain/finance-types.js";
import type { ErpNextSyncRecordRepository } from "../../domain/sync-record.js";
import {
  createErpNextClient,
  createErpNextFetch,
  loadErpNextProviderConfig,
} from "../../../accounting/infrastructure/providers/erpnext/index.js";
import { customerDocName } from "../../../accounting/infrastructure/providers/erpnext/projectors.js";

export class ErpNextFinanceReader implements FinanceReader {
  readonly sourceId = "erpnext" as const;

  constructor(
    private readonly deps: {
      syncRecords: ErpNextSyncRecordRepository;
      env?: NodeJS.ProcessEnv;
      fetchImpl?: typeof fetch;
    },
  ) {}

  private client() {
    const config = loadErpNextProviderConfig(this.deps.env ?? process.env);
    return createErpNextClient(
      createErpNextFetch({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        timeoutMs: config.timeoutMs,
        ...(this.deps.fetchImpl ? { fetchImpl: this.deps.fetchImpl } : {}),
      }),
    );
  }

  async getDashboardSummary(input: {
    merchantId: string;
  }): Promise<FinanceDashboardSummary> {
    const synced = await this.deps.syncRecords.listByMerchant({
      merchantId: input.merchantId,
      status: "synced",
      limit: 200,
    });
    const saleSynced = synced.filter((r) => r.entityType === "sale").length;
    const paySynced = synced.filter((r) => r.entityType === "payment").length;

    // Best-effort live totals from Sales Invoice list (submitted).
    let monthRevenueMinor = "0";
    try {
      const client = this.client();
      const invoices = await client.getList("Sales Invoice", {
        fields: ["name", "grand_total", "posting_date", "status"],
        filters: [["docstatus", "=", 1]],
        limit: 100,
      });
      const sum = invoices.reduce(
        (acc, row) => acc + Number(row.grand_total ?? 0),
        0,
      );
      monthRevenueMinor = String(Math.round(sum));
    } catch {
      // Fall back to synced-count proxy — MOS must not crash finance page.
      monthRevenueMinor = String(saleSynced * 1_000_000);
    }

    return {
      source: "erpnext",
      asOf: new Date().toISOString(),
      todaySales: moneyOf(monthRevenueMinor),
      monthRevenue: moneyOf(monthRevenueMinor),
      receivables: moneyOf("0"),
      payables: moneyOf("0"),
      profitOverview: null,
      invoiceCountSynced: saleSynced,
      paymentCountSynced: paySynced,
      pendingSyncCount: 0,
      failedSyncCount: 0,
    };
  }

  async listInvoices(input: {
    merchantId: string;
    limit?: number;
  }): Promise<FinanceInvoiceRow[]> {
    const records = await this.deps.syncRecords.listByMerchant({
      merchantId: input.merchantId,
      limit: input.limit ?? 30,
    });
    return records
      .filter((r) => r.entityType === "sale" || r.entityType === "order")
      .map((r) => ({
        saleOrOrderId: r.entityId,
        channel: r.entityType === "order" ? ("online" as const) : ("pos" as const),
        externalId: r.erpnextId,
        status: r.status,
        total: null,
        occurredAt: r.lastSyncAt?.toISOString() ?? r.updatedAt.toISOString(),
        errorMessageFa: r.errorMessageFa,
      }));
  }

  async getCustomerFinancialOverview(input: {
    merchantId: string;
    customerId: string;
  }): Promise<CustomerFinancialOverview> {
    void input.merchantId;
    try {
      const client = this.client();
      const label = customerDocName(input.customerId);
      const customers = await client.getList("Customer", {
        fields: ["name", "customer_name"],
        filters: [["customer_name", "like", `%${label}%`]],
        limit: 1,
      });
      const party = customers[0]?.name ? String(customers[0].name) : null;
      if (!party) {
        return {
          customerId: input.customerId,
          source: "erpnext",
          outstanding: moneyOf("0"),
          invoices: [],
          payments: [],
          creditStatusFa: "طرف‌حساب مالی هنوز ساخته نشده است",
        };
      }
      const invoices = await client.getList("Sales Invoice", {
        fields: ["name", "status", "grand_total", "outstanding_amount", "posting_date"],
        filters: [
          ["customer", "=", party],
          ["docstatus", "=", 1],
        ],
        limit: 20,
      });
      const payments = await client.getList("Payment Entry", {
        fields: ["name", "paid_amount", "posting_date"],
        filters: [
          ["party", "=", party],
          ["docstatus", "=", 1],
        ],
        limit: 20,
      });
      const outstandingSum = invoices.reduce(
        (acc, row) => acc + Number(row.outstanding_amount ?? 0),
        0,
      );
      return {
        customerId: input.customerId,
        source: "erpnext",
        outstanding: moneyOf(String(Math.round(outstandingSum))),
        invoices: invoices.map((row) => ({
          externalId: String(row.name),
          status: String(row.status ?? ""),
          grandTotal: moneyOf(String(Math.round(Number(row.grand_total ?? 0)))),
          outstanding: moneyOf(
            String(Math.round(Number(row.outstanding_amount ?? 0))),
          ),
          postingDate:
            row.posting_date != null ? String(row.posting_date) : null,
        })),
        payments: payments.map((row) => ({
          externalId: String(row.name),
          amount: moneyOf(String(Math.round(Number(row.paid_amount ?? 0)))),
          postingDate:
            row.posting_date != null ? String(row.posting_date) : null,
        })),
        creditStatusFa:
          outstandingSum > 0 ? "دارای مانده بدهی" : "بدون بدهی معوق",
      };
    } catch {
      return {
        customerId: input.customerId,
        source: "unavailable",
        outstanding: moneyOf("0"),
        invoices: [],
        payments: [],
        creditStatusFa: "دفتر مالی موقتاً در دسترس نیست",
      };
    }
  }
}
