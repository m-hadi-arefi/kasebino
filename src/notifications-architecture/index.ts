/**
 * ADR-090 — Notification Architecture contract.
 *
 * In-app notifications persisted; SMS channel ports (campaigns later via credits);
 * outbox consumer off critical TX path. Persian templates by default.
 * OTP SMS must never log codes. Full center UI / HTTP → ARD-014 (+ uiuxpromax).
 *
 * Module: `src/modules/notifications/`. Normative: ADR-090, ARD-014.
 */

import { EVENT_UX_FA } from "../event-driven/index.js";
import { OTP_LOG_HYGIENE } from "../security-architecture/index.js";

/** ADR-090 Decision — binding notification stance. */
export const NOTIFICATIONS_DECISION = {
  adr: "ADR-090",
  pattern: "persisted_in_app_plus_sms_ports" as const,
  persistInApp: true,
  realtimeTopic: "notifications" as const,
  smsCampaigns: "later_via_credits" as const,
  smsCampaignsEnabled: false,
  neverBlockCoreTx: true,
  neverBlockCheckout: true,
  outboxConsumer: "notifications" as const,
  architecturePackage: "src/notifications-architecture/",
  modulePackage: "src/modules/notifications/",
  smsProviderAdr: "ADR-083",
  smsProviderDecisionStatus: "proposed" as const,
  apiDeferredTo: "ARD-014",
  centerUiDeferredTo: "ARD-014",
  uiuxpromaxRequiredForCenter: true,
  detailAdr: "ADR-090",
  eventDrivenAdr: "ADR-036",
  emqxAdr: "ADR-038",
} as const;

export const NOTIFICATION_CHANNELS = ["in_app", "sms"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_AUDIENCES = ["merchant", "customer"] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

/** MVP event → notification maps (expand with campaigns later). */
export const NOTIFICATION_MVP_EVENTS = [
  "OrderCreated",
  "OrderReadyForPickup",
  "InventoryLowDetected",
  "InventoryDepleted",
] as const;

export type NotificationMvpEvent = (typeof NOTIFICATION_MVP_EVENTS)[number];

/** Catalog aliases accepted by the consumer. */
export const NOTIFICATION_EVENT_ALIASES = {
  InventoryLow: "InventoryLowDetected",
  InventoryOutOfStock: "InventoryDepleted",
} as const;

export const NOTIFICATIONS_PLACEMENT = {
  package: "src/notifications-architecture/",
  module: "src/modules/notifications/",
  outboxConsumer: "notifications" as const,
  detailAdr: "ADR-090",
} as const;

/**
 * Iranian First — Persian defaults + RTL notification center contract.
 * Full drawer/center chrome → ARD-014.
 */
export const NOTIFICATIONS_UX_FA = {
  drawerTitle: EVENT_UX_FA.NOTIFICATION_DRAWER_TITLE,
  emptyState: "اعلانی وجود ندارد.",
  markRead: "خواندم",
  markAllRead: "خواندن همه",
  loadError: "بارگذاری اعلان‌ها ممکن نشد. دوباره تلاش کنید.",
  smsFailed: "ارسال پیامک انجام نشد. بعداً دوباره تلاش می‌کنیم.",
  dir: "rtl" as const,
  locale: "fa-IR" as const,
  lang: "fa" as const,
} as const;

/**
 * OTP / sensitive SMS log hygiene — never log OTP codes (ADR-076 + ADR-090).
 */
export const NOTIFICATION_OTP_LOG_POLICY = {
  neverLogOtpCodes: true as const,
  neverLogRawTokens: OTP_LOG_HYGIENE.neverLogRawTokens,
  redactionToken: "[کد حذف‌شده]" as const,
  /** Digits matching Iranian SMS OTP length (typically 6). */
  otpDigitPattern: /\b\d{4,8}\b/g,
} as const;

/**
 * Redact OTP-looking digit runs from SMS log lines.
 * Prefer category=`otp` callers so entire bodies are not echoed.
 */
export function redactOtpCodesForLogs(text: string): string {
  return text.replace(
    NOTIFICATION_OTP_LOG_POLICY.otpDigitPattern,
    NOTIFICATION_OTP_LOG_POLICY.redactionToken,
  );
}

export function assertNeverLogOtpCodes(logLine: string): void {
  if (/\b\d{4,8}\b/.test(logLine)) {
    throw new Error(
      "SMS/notification logs must never include OTP codes (ADR-090 / ADR-076).",
    );
  }
  if (!NOTIFICATION_OTP_LOG_POLICY.neverLogOtpCodes) {
    throw new Error(
      "NOTIFICATION_OTP_LOG_POLICY.neverLogOtpCodes must be true (ADR-090).",
    );
  }
}

export function assertNeverBlockCoreTx(blocksCoreTx: boolean): void {
  if (blocksCoreTx) {
    throw new Error(
      "Notifications must never block core TX / checkout (ADR-090); use outbox after commit.",
    );
  }
  if (!NOTIFICATIONS_DECISION.neverBlockCoreTx) {
    throw new Error(
      "NOTIFICATIONS_DECISION.neverBlockCoreTx must be true (ADR-090).",
    );
  }
}

/** Reserved HTTP contracts (ARD-014 Route Handlers). */
export const NOTIFICATIONS_API = {
  listPath: "/api/v1/notifications",
  markReadPathTemplate: "/api/v1/notifications/:id/read",
  methods: {
    list: "GET" as const,
    markRead: "POST" as const,
  },
} as const;

/** Optional short list cache — invalidate on new notification. */
export const NOTIFICATIONS_CACHE = {
  listTtlSeconds: 30,
  keyHint: "mos:{env}:{merchantId}:notifications:{userId}",
  neverSourceOfTruth: true,
} as const;

/** Metric name stubs — full observability → ADR-074. */
export const NOTIFICATION_METRICS = {
  inAppCreated: "notifications.in_app.created",
  inAppFailed: "notifications.in_app.failed",
  smsSent: "notifications.sms.sent",
  smsFailed: "notifications.sms.failed",
  otpCodeLoggedForbidden: "notifications.security.otp_code_logged",
} as const;

/** SMS campaigns reserved — credits later; do not spam. */
export const SMS_CAMPAIGN_STUB = {
  enabled: false as const,
  requiresCredits: true as const,
  deferredReason: "sms_campaigns_later_via_credits" as const,
} as const;

export const NOTIFICATIONS_ARCHITECTURE = {
  decision: NOTIFICATIONS_DECISION,
  channels: NOTIFICATION_CHANNELS,
  audiences: NOTIFICATION_AUDIENCES,
  mvpEvents: NOTIFICATION_MVP_EVENTS,
  eventAliases: NOTIFICATION_EVENT_ALIASES,
  placement: NOTIFICATIONS_PLACEMENT,
  uxFa: NOTIFICATIONS_UX_FA,
  otpLogPolicy: NOTIFICATION_OTP_LOG_POLICY,
  api: NOTIFICATIONS_API,
  cache: NOTIFICATIONS_CACHE,
  metrics: NOTIFICATION_METRICS,
  smsCampaigns: SMS_CAMPAIGN_STUB,
  redactOtpCodesForLogs,
  assertNeverLogOtpCodes,
  assertNeverBlockCoreTx,
} as const;
