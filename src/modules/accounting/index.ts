/**
 * Accounting integration module (ADR-126 / ADR-140).
 * Port + Noop/Fake/ERPNext providers + outbox consumer.
 * ERPNext DocTypes live only under infrastructure/providers/erpnext/.
 */

export type { AccountingProvider } from "./application/ports/accounting-provider.js";
export type {
  AccountingSyncResult,
  RecordSaleInput,
  SyncCustomerInput,
  SyncProductInput,
} from "./application/ports/accounting-provider.js";
export {
  ACCOUNTING_MOVEMENT_TYPES,
  mapCustomerToAccountingSync,
  mapPaymentToAccountingRecord,
  mapProductToAccountingSync,
  mapSaleToAccountingRecord,
  mapStockReasonToAccountingMovementType,
  mapStoreToWarehouseProjection,
} from "./application/mappers/index.js";
export { createAccountingOutboxHandler } from "./application/outbox-handler.js";
export {
  createAccountingProvider,
  resolveAccountingProviderId,
} from "./application/create-accounting-provider.js";
export type { AccountingProviderId } from "./application/create-accounting-provider.js";
export {
  INTEGRATION_METRIC_NAMES,
  recordIntegrationMetric,
  resetIntegrationMetrics,
  snapshotIntegrationMetrics,
} from "./application/observability.js";
export type { ExternalEntityMapping } from "./domain/external-entity-mapping.js";
export type { ExternalEntityMappingRepository } from "./domain/external-entity-mapping.js";
export { NoopAccountingProvider } from "./infrastructure/providers/noop-accounting-provider.js";
export { FakeAccountingProvider } from "./infrastructure/providers/fake-accounting-provider.js";
export {
  ErpNextAccountingProvider,
  createErpNextAccountingProviderFromEnv,
  ErpNextConfigError,
} from "./infrastructure/providers/erpnext/index.js";
export {
  DrizzleExternalEntityMappingRepository,
  InMemoryExternalEntityMappingRepository,
} from "./infrastructure/persistence/external-entity-mapping-repository.js";
