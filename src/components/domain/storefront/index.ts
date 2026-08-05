/**
 * Storefront domain UI building blocks (ADR-114).
 */

export {
  formatJalaliFa,
  formatTomanFa,
  statusLabelFa,
  STATUS_CHIP_LABELS_FA,
  TOMAN_SUFFIX_FA,
} from "../../composites/iranian-defaults.js";

export const STOREFRONT_DOMAIN_COMPONENTS = [
  "TomanDisplay",
  "StatusChip",
  "JalaliDateText",
] as const;
