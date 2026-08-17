/**
 * Shared Zod schemas for common MerchantOS form fields (ADR-027).
 */

import { z } from "zod";
import { PERSIAN_FORM_ERRORS } from "./persian-errors.js";
import { iranianMobileSchema, toAsciiDigits } from "./phone.js";
import { positiveTomanSchema } from "./money.js";

/** Non-empty trimmed text (Persian product names, store notes, etc.). */
export const requiredTextSchema = z
  .string({ error: PERSIAN_FORM_ERRORS.required })
  .trim()
  .min(1, { error: PERSIAN_FORM_ERRORS.required });

/** SMS OTP - 4 to 8 ASCII digits (after Persian digit normalize). */
export const otpCodeSchema = z
  .string({ error: PERSIAN_FORM_ERRORS.otpRequired })
  .min(1, { error: PERSIAN_FORM_ERRORS.otpRequired })
  .transform((value, ctx) => {
    const digits = toAsciiDigits(value).replace(/\D/g, "");
    if (!/^\d{4,8}$/.test(digits)) {
      ctx.addIssue({
        code: "custom",
        message: PERSIAN_FORM_ERRORS.otpInvalid,
      });
      return z.NEVER;
    }
    return digits;
  });

/**
 * Example shared shape for POS phone capture + price line entry demos/tests.
 * Module DTOs live under src/modules/<context>/application/dto.
 */
export const posPhonePriceDraftSchema = z.object({
  phone: iranianMobileSchema,
  unitPriceToman: positiveTomanSchema,
  note: requiredTextSchema.optional(),
});

export type PosPhonePriceDraft = z.infer<typeof posPhonePriceDraftSchema>;

export { iranianMobileSchema, positiveTomanSchema };
