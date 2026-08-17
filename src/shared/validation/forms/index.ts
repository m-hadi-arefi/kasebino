/**
 * ADR-027 — Form and Validation Strategy.
 *
 * React Hook Form + Zod for form UIs; Zod also at API boundary.
 * Never trust client-only validation. Persian error copy + Iranian phone/تومان.
 */

import { z } from "zod";
import {
  FORM_IRANIAN_RULES,
  PERSIAN_FORM_ERRORS,
} from "./persian-errors.js";

export const FORMS_VALIDATION_LIBRARY = {
  schema: "zod",
  form: "react-hook-form",
  resolverPackage: "@hookform/resolvers",
  resolver: "zodResolver",
  zodInstalled: true,
  rhfInstalled: true,
  resolversInstalled: true,
  adr: "ADR-027",
} as const;

/**
 * Binding Decision (ADR-027).
 */
export const FORMS_VALIDATION_DECISION = {
  adr: "ADR-027",
  reactHookForm: true,
  zod: true,
  zodResolver: true,
  zodAtApiBoundary: true,
  neverTrustClientAlone: true,
  shareSchemasWherePractical: true,
  persianErrorMessagesRequired: true,
  rejectedAlternatives: ["formik", "yup_only"] as const,
  rationale: "type_safe_ux_plus_security_boundary",
} as const;

/** Filesystem placement. */
export const FORMS_VALIDATION_PATHS = {
  strategyRoot: "src/shared/validation/forms",
  moduleDtoGlob: "src/modules/*/application/dto",
  moduleUiFormsGlob: "src/modules/*/ui/forms",
} as const;

export const FORBIDDEN_FORM_PATTERNS = [
  "client_only_validation_without_api_zod",
  "formik",
  "yup_only_without_zod",
  "ad_hoc_english_validation_messages",
  "loose_z_any_on_critical_inputs",
] as const;

export type ForbiddenFormPattern = (typeof FORBIDDEN_FORM_PATTERNS)[number];

export function isForbiddenFormPattern(
  name: string,
): name is ForbiddenFormPattern {
  return (FORBIDDEN_FORM_PATTERNS as readonly string[]).includes(name);
}

export function assertNotForbiddenFormPattern(name: string): void {
  if (isForbiddenFormPattern(name)) {
    throw new Error(
      `Forbidden form/validation pattern "${name}" (ADR-027). Use React Hook Form + Zod with Persian messages; never trust client alone.`,
    );
  }
}

/**
 * Apply Zod's built-in fa locale as a baseline for unmapped issues.
 * Prefer explicit PERSIAN_FORM_ERRORS on product schemas.
 */
export function applyPersianZodLocale(): void {
  z.config(z.locales.fa());
}

export const FORMS_VALIDATION_STRATEGY = {
  decision: FORMS_VALIDATION_DECISION,
  library: FORMS_VALIDATION_LIBRARY,
  paths: FORMS_VALIDATION_PATHS,
  forbidden: FORBIDDEN_FORM_PATTERNS,
  iranian: FORM_IRANIAN_RULES,
  errors: PERSIAN_FORM_ERRORS,
} as const;

export {
  PERSIAN_FORM_ERRORS,
  FORM_IRANIAN_RULES,
  assertPersianValidationMessage,
  type PersianFormErrorKey,
} from "./persian-errors.js";

export {
  toAsciiDigits,
  normalizeIranianMobile,
  toE164IranianMobile,
  iranianMobileSchema,
  type IranianMobile,
} from "./phone.js";

export {
  RIALS_PER_TOMAN,
  tomanToRialMinor,
  rialMinorToToman,
  formatTomanFa,
  parseTomanInput,
  positiveTomanSchema,
  type PositiveToman,
} from "./money.js";

export {
  requiredTextSchema,
  otpCodeSchema,
  posPhonePriceDraftSchema,
  type PosPhonePriceDraft,
} from "./schemas.js";

export { zodResolver, createZodFormResolver } from "./resolver.js";
