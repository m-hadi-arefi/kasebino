/**
 * Persian Notifications domain errors (ADR-090 Iranian First).
 */

export const NOTIFICATIONS_ERROR_CODES = [
  "INVALID_MERCHANT",
  "INVALID_TITLE",
  "INVALID_BODY",
  "NOTIFICATION_NOT_FOUND",
  "CROSS_TENANT_FORBIDDEN",
  "SMS_SEND_FAILED",
  "INVALID_PHONE",
] as const;

export type NotificationsErrorCode =
  (typeof NOTIFICATIONS_ERROR_CODES)[number];

export const NOTIFICATIONS_ERROR_MESSAGES_FA = {
  INVALID_MERCHANT: "فروشنده معتبر نیست.",
  INVALID_TITLE: "عنوان اعلان معتبر نیست.",
  INVALID_BODY: "متن اعلان معتبر نیست.",
  NOTIFICATION_NOT_FOUND: "اعلان پیدا نشد.",
  CROSS_TENANT_FORBIDDEN: "دسترسی به این اعلان مجاز نیست.",
  SMS_SEND_FAILED: "ارسال پیامک انجام نشد.",
  INVALID_PHONE: "شماره موبایل معتبر نیست.",
} as const satisfies Record<NotificationsErrorCode, string>;

export class NotificationsDomainError extends Error {
  readonly code: NotificationsErrorCode;
  readonly messageFa: string;

  constructor(code: NotificationsErrorCode) {
    const messageFa = NOTIFICATIONS_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "NotificationsDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isNotificationsDomainError(
  error: unknown,
): error is NotificationsDomainError {
  return error instanceof NotificationsDomainError;
}
