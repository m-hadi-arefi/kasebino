/**
 * ADR-154 — Security Monitoring Signals & Types.
 */

export const SECURITY_SIGNAL_TYPES = [
  "otp_abuse",
  "auth_failure",
  "suspicious_login",
  "unauthorized_access",
  "rate_limit_exceeded",
  "suspicious_activity",
  "admin_enforcement",
] as const;

export type SecuritySignalType = (typeof SECURITY_SIGNAL_TYPES)[number];

export const SECURITY_SEVERITIES = [
  "info",
  "warning",
  "critical",
] as const;

export type SecuritySeverity = (typeof SECURITY_SEVERITIES)[number];

export type SecuritySignal = {
  id: string;
  type: SecuritySignalType;
  severity: SecuritySeverity;
  source: string;
  merchantId?: string | null;
  storeId?: string | null;
  actorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  descriptionFa: string;
  metadata?: Record<string, unknown>;
  traceId?: string | null;
  createdAt: Date;
};

export type SecurityMetricsSummary = {
  activeAlertsCount: number;
  criticalAlertsCount: number;
  warningAlertsCount: number;
  authFailures24h: number;
  otpAbuse24h: number;
  rateLimitViolations24h: number;
  suspiciousActivity24h: number;
  eventsBySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
};

export type SecurityMonitoringStore = {
  recordSignal(signal: SecuritySignal): Promise<void>;
  listSignals(filters?: {
    type?: SecuritySignalType;
    severity?: SecuritySeverity;
    merchantId?: string;
    limit?: number;
    offset?: number;
  }): Promise<SecuritySignal[]>;
  getMetricsSummary(): Promise<SecurityMetricsSummary>;
};
