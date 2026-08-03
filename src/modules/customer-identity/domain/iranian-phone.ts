/**
 * Re-export Iranian phone helpers for customer-identity (ADR-032).
 */

export {
  assertIranianMobile,
  normalizeIranianMobile,
  type IranianMobile,
  type IranianPhoneNormalizeResult,
} from "../../../shared/domain/iranian-phone.js";
