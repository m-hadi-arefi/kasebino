/**
 * Ports for ERPNext merchant finance ACL (ADR-141).
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
import type { ErpNextSyncRecordRepository } from "../domain/sync-record.js";
import type { ExternalEntityMappingRepository } from "../../accounting/domain/external-entity-mapping.js";

export type FinanceReader = {
  readonly sourceId: "erpnext" | "fake" | "unavailable";
  getDashboardSummary(input: {
    merchantId: string;
  }): Promise<FinanceDashboardSummary>;
  listInvoices(input: {
    merchantId: string;
    limit?: number;
  }): Promise<FinanceInvoiceRow[]>;
  getCustomerFinancialOverview(input: {
    merchantId: string;
    customerId: string;
  }): Promise<CustomerFinancialOverview>;
  getChartOfAccounts(input: {
    merchantId: string;
  }): Promise<FinanceAccountNode[]>;
  getGeneralLedger(input: {
    merchantId: string;
    filters?: {
      account?: string | undefined;
      fromDate?: string | undefined;
      toDate?: string | undefined;
      party?: string | undefined;
      voucherNo?: string | undefined;
      limit?: number | undefined;
    } | undefined;
  }): Promise<FinanceGeneralLedgerRow[]>;
  getProfitAndLoss(input: {
    merchantId: string;
  }): Promise<FinanceProfitAndLossReport>;
  getBalanceSheet(input: {
    merchantId: string;
  }): Promise<FinanceBalanceSheetReport>;
  getTrialBalance(input: {
    merchantId: string;
  }): Promise<FinanceTrialBalanceReport>;
  getPayables(input: {
    merchantId: string;
  }): Promise<FinancePayablesSummary>;
  getReceivables(input: {
    merchantId: string;
  }): Promise<FinanceReceivablesSummary>;
};

export type ErpNextModuleDeps = {
  financeReader: FinanceReader;
  syncRecords: ErpNextSyncRecordRepository;
  mappings?: ExternalEntityMappingRepository;
  now?: () => Date;
  idFactory?: () => string;
};
