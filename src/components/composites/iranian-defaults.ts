/**
 * Shared Iranian First defaults for MerchantOS UI composites (ADR-114).
 * Pure helpers — unit-testable without DOM/React runtime.
 */

import {
  formatTomanFa,
  normalizeIranianMobile,
  parseTomanInput,
  toAsciiDigits,
} from "../../shared/validation/forms/index.js";

export const PHONE_PLACEHOLDER_FA = "۰۹۱۲۳۴۵۶۷۸۹";
export const PHONE_LABEL_FA = "شماره موبایل";
export const TOMAN_SUFFIX_FA = "تومان";
export const TOMAN_PLACEHOLDER_FA = "مبلغ به تومان";

export const STATUS_CHIP_LABELS_FA = {
  active: "فعال",
  suspended: "معلق",
  pending: "در انتظار",
  cancelled: "لغو شده",
  ready: "آماده",
  preparing: "در حال آماده‌سازی",
  completed: "تکمیل‌شده",
} as const;

export type StatusChipKey = keyof typeof STATUS_CHIP_LABELS_FA;

/** Format user-facing Jalali datetime in Iran TZ. */
export function formatJalaliFa(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function statusLabelFa(status: StatusChipKey | string): string {
  if (status in STATUS_CHIP_LABELS_FA) {
    return STATUS_CHIP_LABELS_FA[status as StatusChipKey];
  }
  return status;
}

/** Apply a keypad digit / backspace / clear to a national phone draft. */
export function applyPhoneKeypadInput(
  current: string,
  key: string,
): string {
  const ascii = toAsciiDigits(current).replace(/\D/g, "");
  if (key === "backspace") {
    return ascii.slice(0, -1);
  }
  if (key === "clear") {
    return "";
  }
  if (!/^\d$/.test(key)) {
    return ascii;
  }
  if (ascii.length >= 11) {
    return ascii;
  }
  return `${ascii}${key}`;
}

export function pasteIranianPhone(raw: string): string {
  const normalized = normalizeIranianMobile(raw);
  if (normalized) return normalized;
  return toAsciiDigits(raw).replace(/\D/g, "").slice(0, 11);
}

export {
  formatTomanFa,
  normalizeIranianMobile,
  parseTomanInput,
  toAsciiDigits,
};
