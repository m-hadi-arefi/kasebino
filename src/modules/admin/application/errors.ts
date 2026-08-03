/**
 * Persian Admin domain errors (ADR-013 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */

export const ADMIN_ERROR_CODES = [
  "FORBIDDEN_NOT_PLATFORM_ADMIN",
  "ADMIN_USER_NOT_FOUND",
  "ADMIN_USER_DISABLED",
  "MERCHANT_NOT_FOUND",
  "ALREADY_ACTIVE",
  "ALREADY_SUSPENDED",
  "INVALID_ACTIVATE_TRANSITION",
  "INVALID_SUSPEND_TRANSITION",
  "INVALID_REASON",
] as const;

export type AdminErrorCode = (typeof ADMIN_ERROR_CODES)[number];

export const ADMIN_ERROR_MESSAGES_FA = {
  FORBIDDEN_NOT_PLATFORM_ADMIN:
    "این بخش فقط برای مدیران پلتفرم است و شما اجازه دسترسی ندارید.",
  ADMIN_USER_NOT_FOUND: "کاربر مدیر پلتفرم یافت نشد.",
  ADMIN_USER_DISABLED: "حساب مدیر پلتفرم غیرفعال است.",
  MERCHANT_NOT_FOUND: "فروشنده یافت نشد.",
  ALREADY_ACTIVE: "این فروشنده از قبل فعال است.",
  ALREADY_SUSPENDED: "این فروشنده از قبل تعلیق شده است.",
  INVALID_ACTIVATE_TRANSITION:
    "فعال‌سازی این فروشنده در وضعیت فعلی مجاز نیست.",
  INVALID_SUSPEND_TRANSITION:
    "تعلیق فقط برای فروشنده فعال مجاز است.",
  INVALID_REASON: "دلیل اقدام معتبر نیست.",
} as const satisfies Record<AdminErrorCode, string>;

export class AdminDomainError extends Error {
  readonly code: AdminErrorCode;
  readonly messageFa: string;

  constructor(code: AdminErrorCode) {
    const messageFa = ADMIN_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "AdminDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isAdminDomainError(
  error: unknown,
): error is AdminDomainError {
  return error instanceof AdminDomainError;
}
