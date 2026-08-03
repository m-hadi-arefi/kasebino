/**
 * Persian Loyalty domain errors (ADR-010 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */

export const LOYALTY_ERROR_CODES = [
  "INVALID_MERCHANT",
  "INVALID_STORE",
  "INVALID_MEMBERSHIP",
  "INVALID_POINTS",
  "INSUFFICIENT_BALANCE",
  "WALLET_NOT_FOUND",
  "RULE_NOT_FOUND",
  "NEGATIVE_BALANCE_FORBIDDEN",
] as const;

export type LoyaltyErrorCode = (typeof LOYALTY_ERROR_CODES)[number];

export const LOYALTY_ERROR_MESSAGES_FA = {
  INVALID_MERCHANT: "فروشنده معتبر نیست.",
  INVALID_STORE: "فروشگاه معتبر نیست.",
  INVALID_MEMBERSHIP: "عضویت مشتری برای این فروشگاه معتبر نیست.",
  INVALID_POINTS: "تعداد امتیاز معتبر نیست.",
  INSUFFICIENT_BALANCE:
    "امتیاز کافی نیست. موجودی کیف امتیاز شما کمتر از مقدار درخواستی است.",
  WALLET_NOT_FOUND: "کیف امتیاز یافت نشد.",
  RULE_NOT_FOUND: "قانون امتیاز این فروشگاه تنظیم نشده است.",
  NEGATIVE_BALANCE_FORBIDDEN: "موجودی امتیاز نمی‌تواند منفی شود.",
} as const satisfies Record<LoyaltyErrorCode, string>;

export class LoyaltyDomainError extends Error {
  readonly code: LoyaltyErrorCode;
  readonly messageFa: string;

  constructor(code: LoyaltyErrorCode) {
    const messageFa = LOYALTY_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "LoyaltyDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isLoyaltyDomainError(
  error: unknown,
): error is LoyaltyDomainError {
  return error instanceof LoyaltyDomainError;
}
