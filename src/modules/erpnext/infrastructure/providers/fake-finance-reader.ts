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
import type { ExternalEntityMappingRepository } from "../../../accounting/domain/external-entity-mapping.js";

export class FakeFinanceReader implements FinanceReader {
  readonly sourceId = "fake" as const;

  constructor(
    private readonly deps: {
      syncRecords?: ErpNextSyncRecordRepository;
      mappings?: ExternalEntityMappingRepository;
    } = {},
  ) {}

  async getDashboardSummary(input: {
    merchantId: string;
  }): Promise<FinanceDashboardSummary> {
    const synced =
      (await this.deps.syncRecords?.listByMerchant({
        merchantId: input.merchantId,
        status: "synced",
        limit: 100,
      })) ?? [];
    const pending =
      (await this.deps.syncRecords?.listByMerchant({
        merchantId: input.merchantId,
        status: "pending",
        limit: 100,
      })) ?? [];
    const failed =
      (await this.deps.syncRecords?.listByMerchant({
        merchantId: input.merchantId,
        status: "failed",
        limit: 100,
      })) ?? [];
    const saleSynced = synced.filter((r) => r.entityType === "sale").length;
    const paySynced = synced.filter((r) => r.entityType === "payment").length;
    return {
      source: "fake",
      asOf: new Date().toISOString(),
      todaySales: moneyOf(String(saleSynced * 1_000_000)),
      monthRevenue: moneyOf(String(saleSynced * 5_000_000)),
      receivables: moneyOf("0"),
      payables: moneyOf("0"),
      profitOverview: moneyOf(String(saleSynced * 800_000)),
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
    const records =
      (await this.deps.syncRecords?.listByMerchant({
        merchantId: input.merchantId,
        limit: input.limit ?? 30,
      })) ?? [];
    return records
      .filter((r) => r.entityType === "sale" || r.entityType === "order")
      .map((r) => ({
        saleOrOrderId: r.entityId,
        channel: r.entityType === "order" ? "online" : "pos",
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
    return {
      customerId: input.customerId,
      source: "fake",
      outstanding: moneyOf("0"),
      invoices: [],
      payments: [],
      creditStatusFa: "بدون بدهی معوق (نمای آزمایشی)",
    };
  }

  async getChartOfAccounts(input: {
    merchantId: string;
  }): Promise<FinanceAccountNode[]> {
    void input;
    return [
      {
        name: "1000 - Assets",
        accountName: "دارایی‌های جاری",
        accountNumber: "1000",
        rootType: "Asset",
        isGroup: true,
        balance: moneyOf("50000000"),
        children: [
          {
            name: "1110 - Cash",
            accountName: "موجودی نقد و صندوق",
            accountNumber: "1110",
            rootType: "Asset",
            isGroup: false,
            balance: moneyOf("20000000"),
          },
          {
            name: "1120 - Bank",
            accountName: "حساب‌های بانکی",
            accountNumber: "1120",
            rootType: "Asset",
            isGroup: false,
            balance: moneyOf("30000000"),
          },
        ],
      },
      {
        name: "2000 - Liabilities",
        accountName: "بدهی‌های جاری",
        accountNumber: "2000",
        rootType: "Liability",
        isGroup: false,
        balance: moneyOf("10000000"),
      },
      {
        name: "4000 - Income",
        accountName: "درآمد فروش",
        accountNumber: "4000",
        rootType: "Income",
        isGroup: false,
        balance: moneyOf("80000000"),
      },
    ];
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
    void input;
    return [
      {
        id: "GL-001",
        postingDate: new Date().toISOString().slice(0, 10),
        account: "1110 - Cash",
        againstAccount: "4000 - Sales",
        debit: moneyOf("10000000"),
        credit: moneyOf("0"),
        balance: moneyOf("10000000"),
        voucherType: "Sales Invoice",
        voucherNo: "ACC-SINV-2026-00001",
        partyType: "Customer",
        party: "مشتری نقدی",
        remarks: "ثبت فروش روزانه",
      },
    ];
  }

  async getProfitAndLoss(input: {
    merchantId: string;
  }): Promise<FinanceProfitAndLossReport> {
    void input;
    return {
      source: "fake",
      asOf: new Date().toISOString(),
      rows: [
        {
          account: "4000 - Income",
          accountName: "درآمدهای عملیاتی و فروش",
          indent: 0,
          yearToDate: moneyOf("80000000"),
        },
        {
          account: "5000 - Expense",
          accountName: "هزینه‌های عملیاتی و بهای تمام شده",
          indent: 0,
          yearToDate: moneyOf("25000000"),
        },
      ],
      totalIncome: moneyOf("80000000"),
      totalExpense: moneyOf("25000000"),
      netProfit: moneyOf("55000000"),
    };
  }

  async getBalanceSheet(input: {
    merchantId: string;
  }): Promise<FinanceBalanceSheetReport> {
    void input;
    return {
      source: "fake",
      asOf: new Date().toISOString(),
      rows: [
        {
          account: "Asset",
          accountName: "دارایی‌ها",
          indent: 0,
          yearToDate: moneyOf("50000000"),
        },
        {
          account: "Liability",
          accountName: "بدهی‌ها",
          indent: 0,
          yearToDate: moneyOf("10000000"),
        },
        {
          account: "Equity",
          accountName: "حقوق صاحبان سهام",
          indent: 0,
          yearToDate: moneyOf("40000000"),
        },
      ],
      totalAsset: moneyOf("50000000"),
      totalLiability: moneyOf("10000000"),
      totalEquity: moneyOf("40000000"),
    };
  }

  async getTrialBalance(input: {
    merchantId: string;
  }): Promise<FinanceTrialBalanceReport> {
    void input;
    return {
      source: "fake",
      asOf: new Date().toISOString(),
      rows: [
        {
          account: "1110 - Cash",
          accountName: "موجودی نقد و صندوق",
          debit: moneyOf("20000000"),
          credit: moneyOf("0"),
          closingDebit: moneyOf("20000000"),
          closingCredit: moneyOf("0"),
        },
        {
          account: "4000 - Income",
          accountName: "درآمد فروش",
          debit: moneyOf("0"),
          credit: moneyOf("20000000"),
          closingDebit: moneyOf("0"),
          closingCredit: moneyOf("20000000"),
        },
      ],
      totalDebit: moneyOf("20000000"),
      totalCredit: moneyOf("20000000"),
    };
  }

  async getPayables(input: {
    merchantId: string;
  }): Promise<FinancePayablesSummary> {
    void input;
    return {
      source: "fake",
      asOf: new Date().toISOString(),
      totalPayable: moneyOf("0"),
      invoices: [],
    };
  }

  async getReceivables(input: {
    merchantId: string;
  }): Promise<FinanceReceivablesSummary> {
    void input;
    return {
      source: "fake",
      asOf: new Date().toISOString(),
      totalReceivable: moneyOf("0"),
      invoices: [],
    };
  }
}

export class UnavailableFinanceReader implements FinanceReader {
  readonly sourceId = "unavailable" as const;

  async getDashboardSummary(input: {
    merchantId: string;
  }): Promise<FinanceDashboardSummary> {
    void input;
    return {
      source: "unavailable",
      asOf: new Date().toISOString(),
      todaySales: moneyOf("0"),
      monthRevenue: moneyOf("0"),
      receivables: moneyOf("0"),
      payables: moneyOf("0"),
      profitOverview: null,
      invoiceCountSynced: 0,
      paymentCountSynced: 0,
      pendingSyncCount: 0,
      failedSyncCount: 0,
    };
  }

  async listInvoices(): Promise<FinanceInvoiceRow[]> {
    return [];
  }

  async getCustomerFinancialOverview(input: {
    merchantId: string;
    customerId: string;
  }): Promise<CustomerFinancialOverview> {
    return {
      customerId: input.customerId,
      source: "unavailable",
      outstanding: moneyOf("0"),
      invoices: [],
      payments: [],
      creditStatusFa: "دفتر مالی در دسترس نیست",
    };
  }

  async getChartOfAccounts(): Promise<FinanceAccountNode[]> {
    return [];
  }

  async getGeneralLedger(): Promise<FinanceGeneralLedgerRow[]> {
    return [];
  }

  async getProfitAndLoss(): Promise<FinanceProfitAndLossReport> {
    return {
      source: "unavailable",
      asOf: new Date().toISOString(),
      rows: [],
      totalIncome: moneyOf("0"),
      totalExpense: moneyOf("0"),
      netProfit: moneyOf("0"),
    };
  }

  async getBalanceSheet(): Promise<FinanceBalanceSheetReport> {
    return {
      source: "unavailable",
      asOf: new Date().toISOString(),
      rows: [],
      totalAsset: moneyOf("0"),
      totalLiability: moneyOf("0"),
      totalEquity: moneyOf("0"),
    };
  }

  async getTrialBalance(): Promise<FinanceTrialBalanceReport> {
    return {
      source: "unavailable",
      asOf: new Date().toISOString(),
      rows: [],
      totalDebit: moneyOf("0"),
      totalCredit: moneyOf("0"),
    };
  }

  async getPayables(): Promise<FinancePayablesSummary> {
    return {
      source: "unavailable",
      asOf: new Date().toISOString(),
      totalPayable: moneyOf("0"),
      invoices: [],
    };
  }

  async getReceivables(): Promise<FinanceReceivablesSummary> {
    return {
      source: "unavailable",
      asOf: new Date().toISOString(),
      totalReceivable: moneyOf("0"),
      invoices: [],
    };
  }
}
