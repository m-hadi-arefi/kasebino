/**
 * Persian Ordering domain errors (ADR-011 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */

export const ORDERING_ERROR_CODES = [
  "INVALID_MERCHANT",
  "INVALID_STORE",
  "INVALID_LINES",
  "INVALID_QUANTITY",
  "INVALID_PRICE",
  "IDEMPOTENCY_REQUIRED",
  "ORDER_NOT_FOUND",
  "INVALID_TRANSITION",
  "DELIVERY_FORBIDDEN",
  "PAYMENT_NOT_CONFIRMED",
  "REFUND_REQUIRES_PAYMENT",
] as const;

export type OrderingErrorCode = (typeof ORDERING_ERROR_CODES)[number];

export const ORDERING_ERROR_MESSAGES_FA = {
  INVALID_MERCHANT: "فروشنده معتبر نیست.",
  INVALID_STORE: "فروشگاه معتبر نیست.",
  INVALID_LINES: "سفارش باید حداقل یک قلم کالا داشته باشد.",
  INVALID_QUANTITY: "تعداد کالا معتبر نیست.",
  INVALID_PRICE: "مبلغ کالا معتبر نیست.",
  IDEMPOTENCY_REQUIRED: "کلید تکرارناپذیری سفارش الزامی است.",
  ORDER_NOT_FOUND: "سفارش پیدا نشد.",
  INVALID_TRANSITION: "تغییر وضعیت این سفارش مجاز نیست.",
  DELIVERY_FORBIDDEN:
    "ارسال با پیک در این نسخه پشتیبانی نمی‌شود. فقط دریافت حضوری.",
  PAYMENT_NOT_CONFIRMED: "پرداخت سفارش تأیید نشده است.",
  REFUND_REQUIRES_PAYMENT:
    "بازپرداخت فقط برای سفارش پرداخت‌شده امکان‌پذیر است.",
} as const satisfies Record<OrderingErrorCode, string>;

export class OrderingDomainError extends Error {
  readonly code: OrderingErrorCode;
  readonly messageFa: string;

  constructor(code: OrderingErrorCode) {
    const messageFa = ORDERING_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "OrderingDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isOrderingDomainError(
  error: unknown,
): error is OrderingDomainError {
  return error instanceof OrderingDomainError;
}
