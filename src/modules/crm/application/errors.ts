/**
 * Persian CRM / membership domain errors (ADR-007 Iranian First).
 * Stable English `code`; human `messageFa` for API envelope / clients.
 */

export const CRM_ERROR_CODES = [
  "INVALID_PHONE",
  "INVALID_STORE",
  "INVALID_MERCHANT",
  "CONSENT_REQUIRED",
  "INVALID_SOURCE",
  "MEMBERSHIP_NOT_FOUND",
  "MEMBERSHIP_SUSPENDED",
] as const;

export type CrmErrorCode = (typeof CRM_ERROR_CODES)[number];

export const CRM_ERROR_MESSAGES_FA = {
  INVALID_PHONE:
    "شماره موبایل معتبر نیست. لطفاً شماره را با ۰۹ وارد کنید.",
  INVALID_STORE: "فروشگاه معتبر نیست.",
  INVALID_MERCHANT: "فروشنده معتبر نیست.",
  CONSENT_REQUIRED:
    "برای عضویت باید گزینهٔ پذیرش ذخیره و استفاده از شماره را تأیید کنید.",
  INVALID_SOURCE: "منبع عضویت معتبر نیست.",
  MEMBERSHIP_NOT_FOUND: "عضویت مشتری یافت نشد.",
  MEMBERSHIP_SUSPENDED: "عضویت مشتری تعلیق شده است.",
} as const satisfies Record<CrmErrorCode, string>;

export class CrmDomainError extends Error {
  readonly code: CrmErrorCode;
  readonly messageFa: string;

  constructor(code: CrmErrorCode) {
    const messageFa = CRM_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "CrmDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isCrmDomainError(error: unknown): error is CrmDomainError {
  return error instanceof CrmDomainError;
}
