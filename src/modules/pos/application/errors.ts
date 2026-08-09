/**
 * Persian POS / sales domain errors (ADR-009 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */

export const POS_ERROR_CODES = [
  "INVALID_MERCHANT",
  "INVALID_STORE",
  "EMPTY_CART",
  "INVALID_LINE",
  "INVALID_QUANTITY",
  "INVALID_PRICE",
  "INVALID_TENDER",
  "PHONE_REQUIRED",
  "IDEMPOTENCY_KEY_REQUIRED",
  "OUTBOX_REQUIRED",
  "SALE_NOT_FOUND",
] as const;

export type PosErrorCode = (typeof POS_ERROR_CODES)[number];

export const POS_ERROR_MESSAGES_FA = {
  INVALID_MERCHANT: "فروشنده معتبر نیست.",
  INVALID_STORE: "فروشگاه معتبر نیست.",
  EMPTY_CART: "سبد خرید خالی است. حداقل یک کالا اضافه کنید.",
  INVALID_LINE: "سطر فروش معتبر نیست.",
  INVALID_QUANTITY: "تعداد کالا باید عدد صحیح مثبت باشد.",
  INVALID_PRICE: "قیمت کالا معتبر نیست.",
  INVALID_TENDER:
    "نوع پرداخت معتبر نیست. نقد، کارت‌خوان یا ترکیبی را انتخاب کنید.",
  PHONE_REQUIRED:
    "شماره موبایل مشتری الزامی است. لطفاً شماره را با ۰۹ وارد کنید.",
  IDEMPOTENCY_KEY_REQUIRED:
    "کلید یکتایی (Idempotency-Key) برای تکمیل فروش الزامی است.",
  OUTBOX_REQUIRED:
    "صندوق خروجی رویداد برای تکمیل فروش در حالت تراکنشی الزامی است.",
  SALE_NOT_FOUND: "فروش یافت نشد.",
} as const satisfies Record<PosErrorCode, string>;

export class PosDomainError extends Error {
  readonly code: PosErrorCode;
  readonly messageFa: string;

  constructor(code: PosErrorCode) {
    const messageFa = POS_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "PosDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isPosDomainError(error: unknown): error is PosDomainError {
  return error instanceof PosDomainError;
}
