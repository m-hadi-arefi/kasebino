/**
 * Cross-cutting Iranian First + app composites (ADR-114 / ADR-125).
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

/** React building blocks available under this folder (Iranian First). */
export const COMPOSITE_REACT_MODULES = [
  "phone-keypad",
  "toman-display",
  "status-chip",
  "jalali-date-text",
] as const;

/** ADR-125 shared UI composites. */
export const APP_COMPOSITE_MODULES = [
  "page-header",
  "section-header",
  "empty-state",
  "error-state",
  "loading-state",
  "stat-card",
  "confirm-dialog",
  "filter-bar",
  "search-input",
  "form-section",
] as const;
