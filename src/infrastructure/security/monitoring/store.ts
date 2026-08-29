/**
 * ADR-154 — Security Monitoring In-Memory Store.
 */

import type {
  SecurityMetricsSummary,
  SecurityMonitoringStore,
  SecuritySeverity,
  SecuritySignal,
  SecuritySignalType,
} from "./types.js";

export class InMemorySecurityMonitoringStore implements SecurityMonitoringStore {
  private signals: SecuritySignal[] = [];

  async recordSignal(signal: SecuritySignal): Promise<void> {
    this.signals.unshift({ ...signal });
    if (this.signals.length > 500) {
      this.signals.length = 500;
    }
  }

  async listSignals(filters?: {
    type?: SecuritySignalType;
    severity?: SecuritySeverity;
    merchantId?: string;
    limit?: number;
    offset?: number;
  }): Promise<SecuritySignal[]> {
    let result = [...this.signals];
    if (filters?.type) {
      result = result.filter((s) => s.type === filters.type);
    }
    if (filters?.severity) {
      result = result.filter((s) => s.severity === filters.severity);
    }
    if (filters?.merchantId) {
      result = result.filter((s) => s.merchantId === filters.merchantId);
    }
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;
    return result.slice(offset, offset + limit);
  }

  async getMetricsSummary(): Promise<SecurityMetricsSummary> {
    const critical = this.signals.filter((s) => s.severity === "critical").length;
    const warning = this.signals.filter((s) => s.severity === "warning").length;
    const info = this.signals.filter((s) => s.severity === "info").length;

    const authFailures = this.signals.filter((s) => s.type === "auth_failure").length;
    const otpAbuse = this.signals.filter((s) => s.type === "otp_abuse").length;
    const rateLimit = this.signals.filter((s) => s.type === "rate_limit_exceeded").length;
    const suspicious = this.signals.filter(
      (s) => s.type === "suspicious_activity" || s.type === "suspicious_login"
    ).length;

    return {
      activeAlertsCount: critical + warning,
      criticalAlertsCount: critical,
      warningAlertsCount: warning,
      authFailures24h: authFailures,
      otpAbuse24h: otpAbuse,
      rateLimitViolations24h: rateLimit,
      suspiciousActivity24h: suspicious,
      eventsBySeverity: {
        critical,
        warning,
        info,
      },
    };
  }
}

let globalSecurityStore: InMemorySecurityMonitoringStore | null = null;

export function getGlobalSecurityMonitoringStore(): InMemorySecurityMonitoringStore {
  if (!globalSecurityStore) {
    globalSecurityStore = new InMemorySecurityMonitoringStore();
  }
  return globalSecurityStore;
}
