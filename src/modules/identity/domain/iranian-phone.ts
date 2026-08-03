/**
 * Re-export Iranian phone helpers for the identity module surface (ADR-031).
 */

export {
  assertIranianMobile,
  normalizeIranianMobile,
  type IranianMobile,
  type IranianPhoneNormalizeResult,
} from "../../../shared/domain/iranian-phone.js";
