/**
 * Persian UI message catalog for frontend errors (ADR-028).
 * Maps stable API / domain codes → plain-language fa-IR UX copy.
 */

import {
  API_ERROR_CODES,
  API_ERROR_FALLBACK_FA,
  API_ERROR_MESSAGES_FA,
  type ApiErrorCode,
} from "../api-standards/index.js";
import { SEARCH_MESSAGES_FA } from "../search-barcode/index.js";

/** Extra UI/domain codes beyond ADR-030 wire codes. */
export const UI_ERROR_CODES = [
  "NETWORK_ERROR",
  "TIMEOUT",
  "BARCODE_NOT_FOUND",
  "BARCODE_SCAN_FAILED",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "OTP_RATE_LIMITED",
  "UNKNOWN",
] as const;

export type UiErrorCode = (typeof UI_ERROR_CODES)[number];

export type FrontendErrorCode = ApiErrorCode | UiErrorCode;

export const UI_ERROR_MESSAGES_FA = {
  NETWORK_ERROR: "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.",
  TIMEOUT: "پاسخ سرور دیر رسید. لطفاً دوباره تلاش کنید.",
  BARCODE_NOT_FOUND: SEARCH_MESSAGES_FA.PRODUCT_NOT_FOUND,
  BARCODE_SCAN_FAILED: SEARCH_MESSAGES_FA.SCAN_FAILED,
  /** Never include OTP digits — invite user to retry request only. */
  OTP_INVALID: "کد تأیید نادرست است. دوباره تلاش کنید.",
  OTP_EXPIRED: "کد تأیید منقضی شده است. کد جدید درخواست کنید.",
  OTP_RATE_LIMITED:
    "تعداد درخواست کد تأیید زیاد است. کمی بعد دوباره تلاش کنید.",
  UNKNOWN: API_ERROR_FALLBACK_FA,
} as const satisfies Record<UiErrorCode, string>;

/** Full frontend map: ADR-030 codes + UI domain codes. */
export const FRONTEND_ERROR_MESSAGES_FA = {
  ...API_ERROR_MESSAGES_FA,
  ...UI_ERROR_MESSAGES_FA,
} as const satisfies Record<FrontendErrorCode, string>;

export const ERROR_UX_FALLBACK_FA = API_ERROR_FALLBACK_FA;

export function isApiErrorCode(code: string): code is ApiErrorCode {
  return (API_ERROR_CODES as readonly string[]).includes(code);
}

export function isUiErrorCode(code: string): code is UiErrorCode {
  return (UI_ERROR_CODES as readonly string[]).includes(code);
}

export function isFrontendErrorCode(code: string): code is FrontendErrorCode {
  return isApiErrorCode(code) || isUiErrorCode(code);
}

/**
 * Map a stable machine code to Persian UI copy.
 * Unknown codes → safe generic Persian (never echo raw English).
 */
export function mapApiCodeToUiMessage(code: string): string {
  if (isFrontendErrorCode(code)) {
    return FRONTEND_ERROR_MESSAGES_FA[code];
  }
  return ERROR_UX_FALLBACK_FA;
}

/** Assert UI copy is Persian plain language (Arabic script; no EN jargon). */
export function assertPersianUiErrorMessage(message: string): void {
  if (!/[\u0600-\u06FF]/.test(message)) {
    throw new Error(
      `Error UX message must be Persian (ADR-028 Iranian First): got "${message}"`,
    );
  }
  if (/\b(required|invalid|error|exception|stack|must be|failed)\b/i.test(message)) {
    throw new Error(
      `Error UX must not expose English jargon (ADR-028): got "${message}"`,
    );
  }
}
