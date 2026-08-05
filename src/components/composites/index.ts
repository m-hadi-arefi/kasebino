/**
 * Cross-cutting Iranian First composite helpers (ADR-114).
 * React components live in sibling `*.tsx` files — import those directly from app routes
 * (contracts typecheck is `.ts`-only and must not pull `.tsx`).
 */

export {
  applyPhoneKeypadInput,
  formatJalaliFa,
  formatTomanFa,
  normalizeIranianMobile,
  parseTomanInput,
  pasteIranianPhone,
  PHONE_LABEL_FA,
  PHONE_PLACEHOLDER_FA,
  statusLabelFa,
  STATUS_CHIP_LABELS_FA,
  TOMAN_PLACEHOLDER_FA,
  TOMAN_SUFFIX_FA,
  type StatusChipKey,
} from "./iranian-defaults.js";

/** React building blocks available under this folder. */
export const COMPOSITE_REACT_MODULES = [
  "phone-keypad",
  "toman-display",
  "status-chip",
  "jalali-date-text",
] as const;
