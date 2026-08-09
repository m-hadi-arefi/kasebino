/**
 * Fake finance reader — CI/local without live ERPNext (ADR-141).
 */

import type { FinanceReader } from "../../application/ports.js";
import { moneyOf } from "../../application/money.js";
import type {
  CustomerFinancialOverview,
  FinanceDashboardSummary,
  FinanceInvoiceRow,
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
      pendingSyncCount: 0,
      failedSyncCount: 0,
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
}
