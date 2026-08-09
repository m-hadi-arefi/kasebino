/**
 * Ports for ERPNext merchant finance ACL (ADR-141).
 */

import type {
  CustomerFinancialOverview,
  FinanceDashboardSummary,
  FinanceInvoiceRow,
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
};

export type ErpNextModuleDeps = {
  financeReader: FinanceReader;
  syncRecords: ErpNextSyncRecordRepository;
  mappings?: ExternalEntityMappingRepository;
  now?: () => Date;
  idFactory?: () => string;
};
