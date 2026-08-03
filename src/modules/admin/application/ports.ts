/**
 * Application ports for Admin enforcement (ADR-013).
 * AuditPort from ADR-058; security monitoring stub → ARD-026.
 */

import type { AuditPort } from "../../../audit-logging/index.js";

export type { AuditPort };

/** Security monitoring hook — placeholder until ARD-026. */
export type SecurityMonitoringPort = {
  recordAdminSignal(input: {
    type: "AdminMerchantActivated" | "AdminMerchantSuspended";
    merchantId: string;
    adminUserId: string;
    occurredAt: Date;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
};

export type NoopSecurityMonitoringPort = SecurityMonitoringPort;

export function createNoopSecurityMonitoringPort(): SecurityMonitoringPort {
  return {
    async recordAdminSignal(): Promise<void> {
      /* ARD-026 */
    },
  };
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
