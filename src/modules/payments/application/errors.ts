/**
 * Persian Payments domain errors (ADR-012 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */



export const PAYMENTS_ERROR_CODES = [
  "INVALID_MERCHANT",
  "INVALID_STORE",
  "INVALID_ORDER",
  "INVALID_AMOUNT",
  "IDEMPOTENCY_REQUIRED",
  "PAYMENT_NOT_FOUND",
  "INVALID_TRANSITION",
  "INVALID_PROVIDER_REF",
  "PAYMENT_NOT_CONFIRMED",
  "WEBHOOK_SIGNATURE_INVALID",
  "PROVIDER_NOT_AVAILABLE",
  "FEES_INACTIVE",
] as const;



export type PaymentsErrorCode = (typeof PAYMENTS_ERROR_CODES)[number];



export const PAYMENTS_ERROR_MESSAGES_FA = {
  INVALID_MERCHANT: "فروشنده معتبر نیست.",
  INVALID_STORE: "فروشگاه معتبر نیست.",
  INVALID_ORDER: "سفارش معتبر نیست.",
  INVALID_AMOUNT: "مبلغ پرداخت معتبر نیست.",
  IDEMPOTENCY_REQUIRED: "کلید تکرارناپذیری پرداخت الزامی است.",
  PAYMENT_NOT_FOUND: "پرداخت پیدا نشد.",
  INVALID_TRANSITION: "تغییر وضعیت این پرداخت مجاز نیست.",
  INVALID_PROVIDER_REF: "شناسه مرجع درگاه معتبر نیست.",
  PAYMENT_NOT_CONFIRMED: "پرداخت تأیید نشده است.",
  WEBHOOK_SIGNATURE_INVALID:
    "احراز هویت پیام درگاه نامعتبر است. پرداخت تأیید نشد.",
  PROVIDER_NOT_AVAILABLE:
    "درگاه پرداخت واقعی هنوز فعال نیست. از درگاه آزمایشی استفاده کنید.",
  FEES_INACTIVE:
    "در پایلوت کرمان کارمزد فعال نیست و مبلغ کارمزد صفر است.",
} as const satisfies Record<PaymentsErrorCode, string>;



export class PaymentsDomainError extends Error {
  readonly code: PaymentsErrorCode;
  readonly messageFa: string;



  constructor(code: PaymentsErrorCode) {
    const messageFa = PAYMENTS_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "PaymentsDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}



export function isPaymentsDomainError(
  error: unknown,
): error is PaymentsDomainError {
  return error instanceof PaymentsDomainError;
}
