/**
 * Notifications bounded context — ADR-090 Notification Architecture.
 * Persist in-app alerts via outbox consumer; SMS channel ports (campaigns later).
 * Center UI / HTTP list-read → ARD-014 (+ uiuxpromax). Provider → ADR-083.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
export {
  NOTIFICATIONS_ARCHITECTURE,
  NOTIFICATIONS_API,
  NOTIFICATIONS_CACHE,
  NOTIFICATIONS_DECISION,
  NOTIFICATIONS_PLACEMENT,
  NOTIFICATIONS_UX_FA,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_METRICS,
  NOTIFICATION_MVP_EVENTS,
  NOTIFICATION_OTP_LOG_POLICY,
  SMS_CAMPAIGN_STUB,
  assertNeverBlockCoreTx,
  assertNeverLogOtpCodes,
  redactOtpCodesForLogs,
} from "./domain/contracts/index.js";
