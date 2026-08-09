/**
 * Accounting integration module (ADR-126).
 * Port + Fake/Noop providers + outbox consumer. No ERPNext client.
 */

export type { AccountingProvider } from "./application/ports/accounting-provider.js";
export type {
  AccountingSyncResult,
  RecordSaleInput,
  SyncCustomerInput,
  SyncProductInput,
} from "./application/ports/accounting-provider.js";
export {
  mapCustomerToAccountingSync,
  mapProductToAccountingSync,
  mapSaleToAccountingRecord,
  mapStoreToWarehouseProjection,
} from "./application/mappers/index.js";
export { createAccountingOutboxHandler } from "./application/outbox-handler.js";
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
  DrizzleExternalEntityMappingRepository,
  InMemoryExternalEntityMappingRepository,
} from "./infrastructure/persistence/external-entity-mapping-repository.js";

export function resolveAccountingProviderId(
  env: NodeJS.ProcessEnv = process.env,
): "noop" | "fake" {
  const raw = (env.MOS_ACCOUNTING_PROVIDER ?? "noop").trim().toLowerCase();
  if (raw === "fake") return "fake";
  return "noop";
}
