export { ErpNextAccountingProvider, createErpNextAccountingProviderFromEnv } from "./erpnext-accounting-provider.js";
export { loadErpNextProviderConfig, ErpNextConfigError } from "./erpnext-config.js";
export {
  createErpNextClient,
  createErpNextFetch,
  ErpNextHttpError,
  mosEventMarker,
  minorToErpRate,
  type ErpNextClient,
  type ErpNextFetch,
} from "./erpnext-client.js";
export {
  projectItemDoc,
  projectCustomerDoc,
  projectSalesInvoiceDoc,
  projectPaymentEntryDoc,
  projectStockEntryDoc,
  mapUnitCodeToStockUom,
  customerDocName,
} from "./projectors.js";

// Multi-tenant Proxy & ACL exports (ADR-126)
export { encryptSecret, decryptSecret } from "./crypto-credentials.js";
export { ErpNextTenantResolver, type TenantContext, type TenantIntegrationRepository } from "./tenant-resolver.js";
export { ErpNextConnectionManager } from "./connection-manager.js";
export { ErpNextProvisioningService, type ProvisionCompanyInput, type ProvisioningResult } from "./provisioning-service.js";
export { DrizzleTenantRepository } from "./drizzle-tenant-repository.js";
export { ErpNextReportsProvider, type AccountNode, type GeneralLedgerRow, type FinancialStatementResult } from "./reports-provider.js";
export { ErpNextPurchasingProvider, type RecordPurchaseInvoiceInput, type SyncSupplierInput } from "./purchasing-provider.js";
export { ErpNextSalesProvider, type CreateReturnInput } from "./sales-provider.js";
