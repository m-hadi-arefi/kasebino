/**
 * Persian merchant-auth errors (ADR-031 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */

export const MERCHANT_AUTH_ERROR_CODES = [
  "INVALID_PHONE",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "OTP_MAX_ATTEMPTS",
  "OTP_NOT_FOUND",
  "RATE_LIMITED",
] as const;

export type MerchantAuthErrorCode =
  (typeof MERCHANT_AUTH_ERROR_CODES)[number];

export const MERCHANT_AUTH_ERROR_MESSAGES_FA = {
  INVALID_PHONE:
    "شماره موبایل معتبر نیست. لطفاً شماره را با ۰۹ وارد کنید.",
  OTP_INVALID: "کد تأیید نادرست است.",
  OTP_EXPIRED: "کد تأیید منقضی شده است. دوباره درخواست دهید.",
  OTP_MAX_ATTEMPTS:
    "تعداد تلاش‌ها بیش از حد مجاز است. دوباره کد درخواست کنید.",
  OTP_NOT_FOUND: "کد تأییدی یافت نشد. ابتدا درخواست کد دهید.",
  RATE_LIMITED:
    "تعداد درخواست‌های کد تأیید بیش از حد است. کمی بعد دوباره تلاش کنید.",
} as const satisfies Record<MerchantAuthErrorCode, string>;

/** Persian SMS body template — `{code}` replaced at send time. */
export const MERCHANT_OTP_SMS_TEMPLATE_FA =
  "کد ورود کسبینو: {code}\nاین کد را در اختیار دیگران قرار ندهید." as const;

export class MerchantAuthError extends Error {
  readonly code: MerchantAuthErrorCode;
  readonly messageFa: string;

  constructor(code: MerchantAuthErrorCode) {
    const messageFa = MERCHANT_AUTH_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "MerchantAuthError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isMerchantAuthError(error: unknown): error is MerchantAuthError {
  return error instanceof MerchantAuthError;
}
