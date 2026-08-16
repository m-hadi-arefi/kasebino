/**
 * Live ERPNext finance reader (ADR-141) — server only.
 * Uses shared Frappe client; never imported by browser code.
 */

import type { FinanceReader } from "../../application/ports.js";
import { moneyOf } from "../../application/money.js";
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
} from "../../domain/finance-types.js";
import type { ErpNextSyncRecordRepository } from "../../domain/sync-record.js";
import {
  createErpNextClient,
  createErpNextFetch,
  loadErpNextProviderConfig,
  type ErpNextClient,
} from "../../../accounting/infrastructure/providers/erpnext/index.js";
import { customerDocName } from "../../../accounting/infrastructure/providers/erpnext/projectors.js";
import {
  ErpNextReportsProvider,
  type AccountNode,
} from "../../../accounting/infrastructure/providers/erpnext/reports-provider.js";
import type { ErpNextTenantResolver, TenantContext } from "../../../accounting/infrastructure/providers/erpnext/tenant-resolver.js";
import type { ErpNextConnectionManager } from "../../../accounting/infrastructure/providers/erpnext/connection-manager.js";

export class ErpNextFinanceReader implements FinanceReader {
  readonly sourceId = "erpnext" as const;
  private readonly reports: ErpNextReportsProvider;

  constructor(
    private readonly deps: {
      syncRecords: ErpNextSyncRecordRepository;
      env?: NodeJS.ProcessEnv;
      fetchImpl?: typeof fetch;
      tenantResolver?: ErpNextTenantResolver;
      connectionManager?: ErpNextConnectionManager;
      reportsProvider?: ErpNextReportsProvider;
    },
  ) {
    this.reports = deps.reportsProvider ?? new ErpNextReportsProvider();
  }

  private async resolveClientAndTenant(merchantId: string): Promise<{ client: ErpNextClient; tenant: TenantContext }> {
    if (this.deps.tenantResolver && this.deps.connectionManager) {
      try {
        const tenant = await this.deps.tenantResolver.resolveTenantContext({ merchantId });
        const client = this.deps.connectionManager.getClientForTenant(tenant);
        return { client, tenant };
      } catch {
        // Fall back
      }
    }
    const config = loadErpNextProviderConfig(this.deps.env ?? process.env);
    const client = createErpNextClient(
      createErpNextFetch({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        timeoutMs: config.timeoutMs,
        ...(this.deps.fetchImpl ? { fetchImpl: this.deps.fetchImpl } : {}),
      }),
    );
    const tenant: TenantContext = {
      merchantId,
      erpnextCompany: config.company,
      companyAbbr: config.company.slice(0, 3).toUpperCase(),
      erpnextSiteUrl: config.baseUrl,
      defaultWarehouse: config.warehouse,
      currency: config.currency,
      costCenter: config.costCenter,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      provisioningStatus: "active",
      connectionStatus: "connected",
    };
    return { client, tenant };
  }

  async getDashboardSummary(input: {
    merchantId: string;
  }): Promise<FinanceDashboardSummary> {
    const synced = await this.deps.syncRecords.listByMerchant({
      merchantId: input.merchantId,
      status: "synced",
      limit: 200,
    });
    const pending = await this.deps.syncRecords.listByMerchant({
      merchantId: input.merchantId,
      status: "pending",
      limit: 200,
    });
    const failed = await this.deps.syncRecords.listByMerchant({
      merchantId: input.merchantId,
      status: "failed",
      limit: 200,
    });
    const saleSynced = synced.filter((r) => r.entityType === "sale").length;
    const paySynced = synced.filter((r) => r.entityType === "payment").length;

    let todaySalesMinor = "0";
    let monthRevenueMinor = "0";
    let receivablesMinor = "0";
    let payablesMinor = "0";
    let netProfitMinor: string | null = null;

    try {
      const { client, tenant } = await this.resolveClientAndTenant(input.merchantId);
      const [pnl, rec, pay] = await Promise.all([
        this.reports.getProfitAndLoss(client, tenant).catch(() => null),
        this.reports.getReceivables(client, tenant).catch(() => null),
        this.reports.getPayables(client, tenant).catch(() => null),
      ]);

      if (pnl) {
        monthRevenueMinor = String(Math.round(pnl.totalIncome ?? 0));
        netProfitMinor = String(Math.round(pnl.netProfit ?? 0));
        todaySalesMinor = monthRevenueMinor;
      }
      if (rec) {
        receivablesMinor = String(Math.round(rec.totalOutstanding));
      }
      if (pay) {
        payablesMinor = String(Math.round(pay.totalPayable));
      }
    } catch {
      monthRevenueMinor = String(saleSynced * 1_000_000);
      todaySalesMinor = monthRevenueMinor;
    }

    return {
      source: "erpnext",
      asOf: new Date().toISOString(),
      todaySales: moneyOf(todaySalesMinor),
      monthRevenue: moneyOf(monthRevenueMinor),
      receivables: moneyOf(receivablesMinor),
      payables: moneyOf(payablesMinor),
      profitOverview: netProfitMinor != null ? moneyOf(netProfitMinor) : null,
      invoiceCountSynced: saleSynced,
      paymentCountSynced: paySynced,
      pendingSyncCount: pending.length,
      failedSyncCount: failed.length,
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
    try {
      const { client } = await this.resolveClientAndTenant(input.merchantId);
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
        (acc: number, row: Record<string, unknown>) =>
          acc + Number(row.outstanding_amount ?? 0),
        0,
      );
      return {
        customerId: input.customerId,
        source: "erpnext",
        outstanding: moneyOf(String(Math.round(outstandingSum))),
        invoices: invoices.map((row: Record<string, unknown>) => ({
          externalId: String(row.name),
          status: String(row.status ?? ""),
          grandTotal: moneyOf(String(Math.round(Number(row.grand_total ?? 0)))),
          outstanding: moneyOf(
            String(Math.round(Number(row.outstanding_amount ?? 0))),
          ),
          postingDate:
            row.posting_date != null ? String(row.posting_date) : null,
        })),
        payments: payments.map((row: Record<string, unknown>) => ({
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

  async getChartOfAccounts(input: {
    merchantId: string;
  }): Promise<FinanceAccountNode[]> {
    try {
      const { client, tenant } = await this.resolveClientAndTenant(input.merchantId);
      const rawNodes = await this.reports.getChartOfAccounts(client, tenant);
      const mapNode = (node: AccountNode): FinanceAccountNode => ({
        name: node.name,
        accountName: node.accountName,
        accountNumber: node.accountNumber,
        parentAccount: node.parentAccount,
        accountType: node.accountType,
        rootType: node.rootType,
        isGroup: node.isGroup,
        balance: moneyOf(String(Math.round(node.balance))),
        children: node.children?.map(mapNode),
      });
      return rawNodes.map(mapNode);
    } catch {
      return [];
    }
  }

  async getGeneralLedger(input: {
    merchantId: string;
    filters?: {
      account?: string;
      fromDate?: string;
      toDate?: string;
      party?: string;
      voucherNo?: string;
      limit?: number;
    };
  }): Promise<FinanceGeneralLedgerRow[]> {
    try {
      const { client, tenant } = await this.resolveClientAndTenant(input.merchantId);
      const rows = await this.reports.getGeneralLedger(client, tenant, input.filters);
      return rows.map((r) => ({
        id: r.id,
        postingDate: r.postingDate,
        account: r.account,
        againstAccount: r.againstAccount,
        debit: moneyOf(String(Math.round(r.debit))),
        credit: moneyOf(String(Math.round(r.credit))),
        balance: moneyOf(String(Math.round(r.balance))),
        voucherType: r.voucherType,
        voucherNo: r.voucherNo,
        partyType: r.partyType,
        party: r.party,
        remarks: r.remarks,
      }));
    } catch {
      return [];
    }
  }

  async getProfitAndLoss(input: {
    merchantId: string;
  }): Promise<FinanceProfitAndLossReport> {
    try {
      const { client, tenant } = await this.resolveClientAndTenant(input.merchantId);
      const res = await this.reports.getProfitAndLoss(client, tenant);
      return {
        source: "erpnext",
        asOf: res.asOfDate,
        rows: res.rows.map((row) => ({
          account: row.account,
          accountName: row.accountName,
          indent: row.indent,
          yearToDate: moneyOf(String(Math.round(row.yearToDate))),
        })),
        totalIncome: moneyOf(String(Math.round(res.totalIncome ?? 0))),
        totalExpense: moneyOf(String(Math.round(res.totalExpense ?? 0))),
        netProfit: moneyOf(String(Math.round(res.netProfit ?? 0))),
      };
    } catch {
      return {
        source: "unavailable",
        asOf: new Date().toISOString(),
        rows: [],
        totalIncome: moneyOf("0"),
        totalExpense: moneyOf("0"),
        netProfit: moneyOf("0"),
      };
    }
  }

  async getBalanceSheet(input: {
    merchantId: string;
  }): Promise<FinanceBalanceSheetReport> {
    try {
      const { client, tenant } = await this.resolveClientAndTenant(input.merchantId);
      const res = await this.reports.getBalanceSheet(client, tenant);
      return {
        source: "erpnext",
        asOf: res.asOfDate,
        rows: res.rows.map((row) => ({
          account: row.account,
          accountName: row.accountName,
          indent: row.indent,
          yearToDate: moneyOf(String(Math.round(row.yearToDate))),
        })),
        totalAsset: moneyOf(String(Math.round(res.totalAsset ?? 0))),
        totalLiability: moneyOf(String(Math.round(res.totalLiability ?? 0))),
        totalEquity: moneyOf(String(Math.round(res.totalEquity ?? 0))),
      };
    } catch {
      return {
        source: "unavailable",
        asOf: new Date().toISOString(),
        rows: [],
        totalAsset: moneyOf("0"),
        totalLiability: moneyOf("0"),
        totalEquity: moneyOf("0"),
      };
    }
  }

  async getTrialBalance(input: {
    merchantId: string;
  }): Promise<FinanceTrialBalanceReport> {
    try {
      const { client, tenant } = await this.resolveClientAndTenant(input.merchantId);
      const res = await this.reports.getTrialBalance(client, tenant);
      return {
        source: "erpnext",
        asOf: res.asOfDate,
        rows: res.rows.map((row) => ({
          account: row.account,
          accountName: row.accountName,
          debit: moneyOf(String(Math.round(row.debit))),
          credit: moneyOf(String(Math.round(row.credit))),
          closingDebit: moneyOf(String(Math.round(row.closingDebit))),
          closingCredit: moneyOf(String(Math.round(row.closingCredit))),
        })),
        totalDebit: moneyOf(String(Math.round(res.totalDebit))),
        totalCredit: moneyOf(String(Math.round(res.totalCredit))),
      };
    } catch {
      return {
        source: "unavailable",
        asOf: new Date().toISOString(),
        rows: [],
        totalDebit: moneyOf("0"),
        totalCredit: moneyOf("0"),
      };
    }
  }

  async getPayables(input: {
    merchantId: string;
  }): Promise<FinancePayablesSummary> {
    try {
      const { client, tenant } = await this.resolveClientAndTenant(input.merchantId);
      const res = await this.reports.getPayables(client, tenant);
      return {
        source: "erpnext",
        asOf: new Date().toISOString(),
        totalPayable: moneyOf(String(Math.round(res.totalPayable))),
        invoices: res.invoices.map((inv) => ({
          invoiceNo: inv.invoiceNo,
          supplier: inv.supplier,
          postingDate: inv.postingDate,
          grandTotal: moneyOf(String(Math.round(inv.grandTotal))),
          outstandingAmount: moneyOf(String(Math.round(inv.outstandingAmount))),
        })),
      };
    } catch {
      return {
        source: "unavailable",
        asOf: new Date().toISOString(),
        totalPayable: moneyOf("0"),
        invoices: [],
      };
    }
  }

  async getReceivables(input: {
    merchantId: string;
  }): Promise<FinanceReceivablesSummary> {
    try {
      const { client, tenant } = await this.resolveClientAndTenant(input.merchantId);
      const res = await this.reports.getReceivables(client, tenant);
      return {
        source: "erpnext",
        asOf: new Date().toISOString(),
        totalReceivable: moneyOf(String(Math.round(res.totalOutstanding))),
        invoices: res.invoices.map((inv) => ({
          invoiceNo: inv.invoiceNo,
          customer: inv.customer,
          postingDate: inv.postingDate,
          dueDate: inv.dueDate,
          grandTotal: moneyOf(String(Math.round(inv.grandTotal))),
          outstandingAmount: moneyOf(String(Math.round(inv.outstandingAmount))),
        })),
      };
    } catch {
      return {
        source: "unavailable",
        asOf: new Date().toISOString(),
        totalReceivable: moneyOf("0"),
        invoices: [],
      };
    }
  }
}
