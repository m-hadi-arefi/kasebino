/**
 * POS domain UI building blocks (ADR-114).
 * Import React widgets from `@/components/composites/*` in App Router pages.
 */

export {
  applyPhoneKeypadInput,
  formatJalaliFa,
  formatTomanFa,
  pasteIranianPhone,
  PHONE_LABEL_FA,
  PHONE_PLACEHOLDER_FA,
  statusLabelFa,
  STATUS_CHIP_LABELS_FA,
  TOMAN_SUFFIX_FA,
} from "../../composites/iranian-defaults.js";

export const POS_DOMAIN_COMPONENTS = [
  "PhoneKeypad",
  "TomanDisplay",
  "StatusChip",
  "JalaliDateText",
] as const;
