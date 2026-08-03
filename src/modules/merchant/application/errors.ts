/**
 * Persian merchant-domain errors (ADR-005 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */

export const MERCHANT_ERROR_CODES = [
  "INVALID_TRADE_NAME",
  "INVALID_SLUG",
  "SLUG_TAKEN",
  "INVALID_PHONE",
  "MERCHANT_NOT_FOUND",
  "ALREADY_ACTIVE",
  "SUSPENDED_CANNOT_ACTIVATE",
  "INVALID_STATUS_TRANSITION",
  "NO_CHANGES",
] as const;

export type MerchantErrorCode = (typeof MERCHANT_ERROR_CODES)[number];

export const MERCHANT_ERROR_MESSAGES_FA = {
  INVALID_TRADE_NAME: "نام فروشگاه معتبر نیست. لطفاً نام تجاری را وارد کنید.",
  INVALID_SLUG:
    "شناسه آدرس معتبر نیست. فقط حروف انگلیسی کوچک، عدد و خط تیره مجاز است.",
  SLUG_TAKEN: "این شناسه آدرس قبلاً استفاده شده است. شناسه دیگری انتخاب کنید.",
  INVALID_PHONE:
    "شماره موبایل معتبر نیست. لطفاً شماره را با ۰۹ وارد کنید.",
  MERCHANT_NOT_FOUND: "فروشنده یافت نشد.",
  ALREADY_ACTIVE: "حساب فروشنده از قبل فعال است.",
  SUSPENDED_CANNOT_ACTIVATE:
    "حساب فروشنده تعلیق شده است و نمی‌توان آن را فعال کرد.",
  INVALID_STATUS_TRANSITION: "تغییر وضعیت فروشنده مجاز نیست.",
  NO_CHANGES: "تغییری برای ذخیره وجود ندارد.",
} as const satisfies Record<MerchantErrorCode, string>;

export class MerchantDomainError extends Error {
  readonly code: MerchantErrorCode;
  readonly messageFa: string;

  constructor(code: MerchantErrorCode) {
    const messageFa = MERCHANT_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "MerchantDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isMerchantDomainError(
  error: unknown,
): error is MerchantDomainError {
  return error instanceof MerchantDomainError;
}
