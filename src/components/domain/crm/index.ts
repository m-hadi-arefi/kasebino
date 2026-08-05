/**
 * CRM domain UI building blocks (ADR-114).
 */

export {
  applyPhoneKeypadInput,
  formatJalaliFa,
  pasteIranianPhone,
  PHONE_LABEL_FA,
  PHONE_PLACEHOLDER_FA,
  statusLabelFa,
  STATUS_CHIP_LABELS_FA,
} from "../../composites/iranian-defaults.js";

export const CRM_DOMAIN_COMPONENTS = [
  "PhoneKeypad",
  "StatusChip",
  "JalaliDateText",
] as const;
