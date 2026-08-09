/**
 * ERPNext integration ACL module (ADR-141).
 * Merchant-facing finance reads + sync status. Write path stays AccountingProvider/outbox.
 */

export { createErpNextUseCases } from "./application/use-cases.js";
export type { ErpNextUseCases } from "./application/use-cases.js";
export type { FinanceReader, ErpNextModuleDeps } from "./application/ports.js";
export { normalizeErpNextErrorFa } from "./application/error-messages-fa.js";
export {
  FakeFinanceReader,
  UnavailableFinanceReader,
} from "./infrastructure/providers/fake-finance-reader.js";
export { ErpNextFinanceReader } from "./infrastructure/providers/erpnext-finance-reader.js";
export {
  InMemoryErpNextSyncRecordRepository,
  DrizzleErpNextSyncRecordRepository,
} from "./infrastructure/persistence/sync-record-repository.js";
export type {
  ErpNextSyncRecord,
  ErpNextSyncRecordRepository,
  ErpNextSyncStatus,
} from "./domain/sync-record.js";
export type {
  FinanceDashboardSummary,
  FinanceInvoiceRow,
  CustomerFinancialOverview,
} from "./domain/finance-types.js";

export function resolveFinanceReaderMode(
  env: NodeJS.ProcessEnv = process.env,
): "erpnext" | "fake" | "unavailable" {
  const accounting = (env.MOS_ACCOUNTING_PROVIDER ?? "noop").trim().toLowerCase();
  if (accounting === "erpnext") return "erpnext";
  if (accounting === "fake") return "fake";
  if ((env.MOS_FINANCE_READER ?? "").trim().toLowerCase() === "fake") {
    return "fake";
  }
  // Default local UI readability without live ERP: fake when not configured.
  if ((env.MOS_ENV ?? "").trim().toLowerCase() === "local") return "fake";
  return "unavailable";
}
