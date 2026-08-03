/**
 * Persian store-domain errors (ADR-006 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */

export const STORE_ERROR_CODES = [
  "INVALID_DISPLAY_NAME",
  "INVALID_SLUG",
  "SLUG_TAKEN",
  "INVALID_ADDRESS",
  "INVALID_GEO",
  "INVALID_HOURS",
  "INVALID_PRIMARY_COLOR",
  "STORE_NOT_FOUND",
  "NO_CHANGES",
] as const;

export type StoreErrorCode = (typeof STORE_ERROR_CODES)[number];

export const STORE_ERROR_MESSAGES_FA = {
  INVALID_DISPLAY_NAME:
    "نام فروشگاه معتبر نیست. لطفاً نام نمایشی را وارد کنید.",
  INVALID_SLUG:
    "شناسه آدرس معتبر نیست. فقط حروف انگلیسی کوچک، عدد و خط تیره مجاز است.",
  SLUG_TAKEN:
    "این شناسه آدرس قبلاً استفاده شده است. شناسه دیگری انتخاب کنید.",
  INVALID_ADDRESS:
    "آدرس فروشگاه کامل نیست. خیابان، شهر و استان را وارد کنید.",
  INVALID_GEO:
    "موقعیت جغرافیایی معتبر نیست. عرض و طول جغرافیایی را بررسی کنید.",
  INVALID_HOURS:
    "ساعات کاری معتبر نیست. زمان را به صورت ساعت:دقیقه وارد کنید.",
  INVALID_PRIMARY_COLOR:
    "رنگ برند معتبر نیست. از کد رنگ هگزادسیمال استفاده کنید.",
  STORE_NOT_FOUND: "فروشگاه یافت نشد.",
  NO_CHANGES: "تغییری برای ذخیره وجود ندارد.",
} as const satisfies Record<StoreErrorCode, string>;

export class StoreDomainError extends Error {
  readonly code: StoreErrorCode;
  readonly messageFa: string;

  constructor(code: StoreErrorCode) {
    const messageFa = STORE_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "StoreDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isStoreDomainError(
  error: unknown,
): error is StoreDomainError {
  return error instanceof StoreDomainError;
}
