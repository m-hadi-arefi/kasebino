/**
 * Persian customer-auth errors (ADR-032 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */

export const CUSTOMER_AUTH_ERROR_CODES = [
  "INVALID_PHONE",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "OTP_MAX_ATTEMPTS",
  "OTP_NOT_FOUND",
  "RATE_LIMITED",
  "CONSENT_REQUIRED",
] as const;

export type CustomerAuthErrorCode =
  (typeof CUSTOMER_AUTH_ERROR_CODES)[number];

export const CUSTOMER_AUTH_ERROR_MESSAGES_FA = {
  INVALID_PHONE:
    "شماره موبایل معتبر نیست. لطفاً شماره را با ۰۹ وارد کنید.",
  OTP_INVALID: "کد تأیید نادرست است.",
  OTP_EXPIRED: "کد تأیید منقضی شده است. دوباره درخواست دهید.",
  OTP_MAX_ATTEMPTS:
    "تعداد تلاش‌ها بیش از حد مجاز است. دوباره کد درخواست کنید.",
  OTP_NOT_FOUND: "کد تأییدی یافت نشد. ابتدا درخواست کد دهید.",
  RATE_LIMITED:
    "تعداد درخواست‌های کد تأیید بیش از حد است. کمی بعد دوباره تلاش کنید.",
  CONSENT_REQUIRED:
    "برای ارسال کد تأیید، پذیرش ذخیره و استفاده از شماره الزامی است.",
} as const satisfies Record<CustomerAuthErrorCode, string>;

/** Persian SMS body template — `{code}` replaced at send time. */
export const CUSTOMER_OTP_SMS_TEMPLATE_FA =
  "کد ورود مشتری کسبینو: {code}\nاین کد را در اختیار دیگران قرار ندهید." as const;

export class CustomerAuthError extends Error {
  readonly code: CustomerAuthErrorCode;
  readonly messageFa: string;

  constructor(code: CustomerAuthErrorCode) {
    const messageFa = CUSTOMER_AUTH_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "CustomerAuthError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isCustomerAuthError(
  error: unknown,
): error is CustomerAuthError {
  return error instanceof CustomerAuthError;
}
