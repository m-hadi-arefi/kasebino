/**
 * تومان helpers + money Zod schemas (ADR-027).
 *
 * OLTP / domain money is integer IRR minor units (rial).
 * Iranian UX display unit defaults to تومان (1 تومان = 10 ریال).
 */

import { z } from "zod";
import { PERSIAN_FORM_ERRORS } from "./persian-errors.js";
import { toAsciiDigits } from "./phone.js";

/** Canonical ratio used by POS/domain comments (rial minor ↔ تومان). */
export const RIALS_PER_TOMAN = 10n;

export function tomanToRialMinor(toman: number | bigint): bigint {
  if (typeof toman === "number") {
    if (!Number.isFinite(toman) || !Number.isInteger(toman)) {
      throw new Error(PERSIAN_FORM_ERRORS.moneyInvalid);
    }
    return BigInt(toman) * RIALS_PER_TOMAN;
  }
  return toman * RIALS_PER_TOMAN;
}

export function rialMinorToToman(minor: number | bigint): number {
  const value = typeof minor === "bigint" ? minor : BigInt(minor);
  if (value % RIALS_PER_TOMAN !== 0n) {
    // Allow non-multiples by truncating toward zero for display math; callers
    // storing domain money should keep exact rial. Presentation helper:
    return Number(value / RIALS_PER_TOMAN);
  }
  return Number(value / RIALS_PER_TOMAN);
}

/**
 * Format a تومان amount for Iranian UX (fa-IR grouping + explicit تومان).
 * Uses Western digits with locale grouping (common on Iranian retail POS).
 */
export function formatTomanFa(toman: number | bigint): string {
  const n = typeof toman === "bigint" ? Number(toman) : toman;
  if (!Number.isFinite(n)) {
    throw new Error(PERSIAN_FORM_ERRORS.moneyInvalid);
  }
  const formatted = new Intl.NumberFormat("fa-IR", {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(Math.trunc(n));
  return `${formatted} تومان`;
}

/**
 * Parse user money text (Persian/Arabic/Latin digits, separators) to integer تومان.
 * Returns null when empty/invalid.
 */
export function parseTomanInput(raw: string): number | null {
  const ascii = toAsciiDigits(raw)
    .trim()
    .replace(/[,\u066C\u060C\s]/g, "")
    .replace(/تومان|ریال|irr|toman/gi, "");
  if (!ascii) return null;
  if (!/^\d+$/.test(ascii)) return null;
  const n = Number(ascii);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

/** Positive integer تومان (merchant price entry). */
export const positiveTomanSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const parsed =
      typeof value === "number"
        ? Number.isInteger(value)
          ? value
          : null
        : parseTomanInput(value);
    if (parsed === null) {
      ctx.addIssue({
        code: "custom",
        message: PERSIAN_FORM_ERRORS.moneyInvalid,
      });
      return z.NEVER;
    }
    if (parsed <= 0) {
      ctx.addIssue({
        code: "custom",
        message: PERSIAN_FORM_ERRORS.moneyPositive,
      });
      return z.NEVER;
    }
    return parsed;
  });

export type PositiveToman = z.infer<typeof positiveTomanSchema>;
