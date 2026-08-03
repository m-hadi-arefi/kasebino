/**
 * Iranian mobile phone normalize + Zod schema (ADR-027).
 * Accepts 09…, +98…, 0098…; stores/emits national 09xxxxxxxxx.
 */

import { z } from "zod";
import { PERSIAN_FORM_ERRORS } from "./persian-errors.js";

const PERSIAN_DIGIT_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

/** Convert Persian/Arabic-Indic digits to ASCII 0-9. */
export function toAsciiDigits(raw: string): string {
  return [...raw]
    .map((ch) => PERSIAN_DIGIT_MAP[ch] ?? ch)
    .join("");
}

/**
 * Normalize Iranian mobile to national form `09xxxxxxxxx`.
 * Returns null when the input is not a valid Iranian mobile.
 */
export function normalizeIranianMobile(raw: string): string | null {
  const ascii = toAsciiDigits(raw).trim();
  const digits = ascii.replace(/[^\d+]/g, "");

  let national: string | null = null;

  if (/^\+98/.test(digits) || /^0098/.test(digits)) {
    const rest = digits.replace(/^(?:\+98|0098)/, "");
    national = rest.startsWith("9") ? `0${rest}` : rest;
  } else if (/^98\d{10}$/.test(digits)) {
    national = `0${digits.slice(2)}`;
  } else if (/^9\d{9}$/.test(digits)) {
    national = `0${digits}`;
  } else if (/^09\d{9}$/.test(digits)) {
    national = digits;
  }

  if (!national || !/^09\d{9}$/.test(national)) {
    return null;
  }
  // Iranian mobile operator prefixes start with 09 followed by 1–5 typically;
  // reject obvious landline-looking after length check for MVP: 09xxxxxxxxx with second digit 0–9.
  return national;
}

/** E.164 from national `09xxxxxxxxx` → `+989xxxxxxxxx`. */
export function toE164IranianMobile(national: string): string {
  const n = normalizeIranianMobile(national);
  if (!n) {
    throw new Error(PERSIAN_FORM_ERRORS.phoneInvalid);
  }
  return `+98${n.slice(1)}`;
}

/** Zod schema: coerce raw input → normalized national mobile. */
export const iranianMobileSchema = z
  .string({ error: PERSIAN_FORM_ERRORS.phoneRequired })
  .min(1, { error: PERSIAN_FORM_ERRORS.phoneRequired })
  .transform((value, ctx) => {
    const normalized = normalizeIranianMobile(value);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: PERSIAN_FORM_ERRORS.phoneInvalid,
      });
      return z.NEVER;
    }
    return normalized;
  });

export type IranianMobile = z.infer<typeof iranianMobileSchema>;
