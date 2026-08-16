/**
 * ERPNext merchant finance use-cases (ADR-141).
 */

import type { ErpNextModuleDeps } from "./ports.js";
import type { ErpNextSyncStatus } from "../domain/sync-record.js";

export function createErpNextUseCases(deps: ErpNextModuleDeps) {
  const now = deps.now ?? (() => new Date());

  return {
    async getFinanceDashboard(input: { merchantId: string }) {
      const summary = await deps.financeReader.getDashboardSummary({
        merchantId: input.merchantId,
      });
      const pending = await deps.syncRecords.listByMerchant({
        merchantId: input.merchantId,
        status: "pending",
        limit: 50,
      });
      const failed = await deps.syncRecords.listByMerchant({
        merchantId: input.merchantId,
        status: "failed",
        limit: 50,
      });
      return {
        summary: {
          ...summary,
          pendingSyncCount: pending.length,
          failedSyncCount: failed.length,
        },
      };
    },

    async listSyncRecords(input: {
      merchantId: string;
      status?: ErpNextSyncStatus;
      limit?: number;
    }) {
      const records = await deps.syncRecords.listByMerchant({
        merchantId: input.merchantId,
        ...(input.status !== undefined ? { status: input.status } : {}),
        limit: input.limit ?? 50,
      });
      return { records };
    },

    async getSaleFinancialStatus(input: {
      merchantId: string;
      saleId: string;
    }) {
      const sync = await deps.syncRecords.findByInternal({
        merchantId: input.merchantId,
        entityType: "sale",
        entityId: input.saleId,
      });
      const mapping = deps.mappings
        ? await deps.mappings.findByInternal({
            merchantId: input.merchantId,
            provider: "erpnext",
            entityType: "sale",
            entityId: input.saleId,
          })
        : null;
      return {
        saleId: input.saleId,
        syncStatus: sync?.status ?? (mapping ? "synced" : "unknown"),
        erpnextId: sync?.erpnextId ?? mapping?.externalId ?? null,
        erpnextType: sync?.erpnextType ?? (mapping ? "Sales Invoice" : null),
        errorMessageFa: sync?.errorMessageFa ?? null,
        lastSyncAt: sync?.lastSyncAt?.toISOString() ?? null,
        updatedAt: now().toISOString(),
      };
    },

    async getCustomerFinancialOverview(input: {
      merchantId: string;
      customerId: string;
    }) {
      return deps.financeReader.getCustomerFinancialOverview(input);
    },

    async listFinanceInvoices(input: { merchantId: string; limit?: number }) {
      const rows = await deps.financeReader.listInvoices({
        merchantId: input.merchantId,
        limit: input.limit ?? 30,
      });
      return { invoices: rows };
    },

    async getChartOfAccounts(input: { merchantId: string }) {
      const accounts = await deps.financeReader.getChartOfAccounts(input);
      return { accounts };
    },

    async getGeneralLedger(input: {
      merchantId: string;
      filters?: {
        account?: string | undefined;
        fromDate?: string | undefined;
        toDate?: string | undefined;
        party?: string | undefined;
        voucherNo?: string | undefined;
        limit?: number | undefined;
      } | undefined;
    }) {
      const entries = await deps.financeReader.getGeneralLedger(input);
      return { entries };
    },

    async getProfitAndLoss(input: { merchantId: string }) {
      const report = await deps.financeReader.getProfitAndLoss(input);
      return { report };
    },

    async getBalanceSheet(input: { merchantId: string }) {
      const report = await deps.financeReader.getBalanceSheet(input);
      return { report };
    },

    async getTrialBalance(input: { merchantId: string }) {
      const report = await deps.financeReader.getTrialBalance(input);
      return { report };
    },

    async getPayables(input: { merchantId: string }) {
      const payables = await deps.financeReader.getPayables(input);
      return { payables };
    },

    async getReceivables(input: { merchantId: string }) {
      const receivables = await deps.financeReader.getReceivables(input);
      return { receivables };
    },
  };
}

export type ErpNextUseCases = ReturnType<typeof createErpNextUseCases>;
