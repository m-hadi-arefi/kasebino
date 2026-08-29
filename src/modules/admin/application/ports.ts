/**
 * Application ports for Admin enforcement (ADR-013).
 * AuditPort from ADR-058; security monitoring stub → ARD-026.
 */

import type { AuditPort } from "../../../infrastructure/security/contracts/audit-logging/index.js";
import { getGlobalSecurityMonitoringStore } from "../../../infrastructure/security/monitoring/store.js";
import type { SecuritySignal } from "../../../infrastructure/security/monitoring/types.js";

export type { AuditPort };

/** Security monitoring port (ADR-154). */
export type SecurityMonitoringPort = {
  recordAdminSignal(input: {
    type: "AdminMerchantActivated" | "AdminMerchantSuspended";
    merchantId: string;
    adminUserId: string;
    occurredAt: Date;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  recordSecuritySignal?(signal: Omit<SecuritySignal, "id" | "createdAt">): Promise<void>;
};

export type NoopSecurityMonitoringPort = SecurityMonitoringPort;

export function createProductionSecurityMonitoringPort(): SecurityMonitoringPort {
  const store = getGlobalSecurityMonitoringStore();
  return {
    async recordAdminSignal(input): Promise<void> {
      await store.recordSignal({
        id: crypto.randomUUID(),
        type: "admin_enforcement",
        severity: input.type === "AdminMerchantSuspended" ? "warning" : "info",
        source: "admin_panel",
        merchantId: input.merchantId,
        actorId: input.adminUserId,
        descriptionFa:
          input.type === "AdminMerchantSuspended"
            ? `پذیرنده با شناسه ${input.merchantId.slice(0, 8)} توسط مدیر پلتفرم تعلیق شد.`
            : `پذیرنده با شناسه ${input.merchantId.slice(0, 8)} توسط مدیر پلتفرم فعال شد.`,
        metadata: input.metadata,
        createdAt: input.occurredAt,
      });
    },
    async recordSecuritySignal(signal): Promise<void> {
      await store.recordSignal({
        id: crypto.randomUUID(),
        ...signal,
        createdAt: new Date(),
      });
    },
  };
}

export function createNoopSecurityMonitoringPort(): SecurityMonitoringPort {
  return createProductionSecurityMonitoringPort();
}

/** In-memory stub that records signals for tests. */
export function createRecordingSecurityMonitoringPort(): SecurityMonitoringPort & {
  signals: Array<Record<string, unknown>>;
} {
  const signals: Array<Record<string, unknown>> = [];
  return {
    signals,
    async recordAdminSignal(input): Promise<void> {
      signals.push({ ...input });
    },
  };
}
