/**
 * AuditPort stub factory for Admin enforcement (ADR-013).
 * Wires ADR-058 createAuditPort + InMemoryAuditStore for tests / local.
 */

import {
  createAuditPort,
  createInMemoryAuditMetrics,
  InMemoryAuditStore,
  type AuditPort,
  type AuditStore,
} from "../../../../infrastructure/security/contracts/audit-logging/index.js";

export type AdminAuditStub = {
  port: AuditPort;
  store: AuditStore;
};

export function createAdminAuditPortStub(
  store: AuditStore = new InMemoryAuditStore(),
): AdminAuditStub {
  const port = createAuditPort({
    store,
    metrics: createInMemoryAuditMetrics(),
  });
  return { port, store };
}
