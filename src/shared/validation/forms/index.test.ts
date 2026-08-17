import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_FORM_PATTERNS,
  FORMS_VALIDATION_DECISION,
  FORMS_VALIDATION_LIBRARY,
  FORMS_VALIDATION_PATHS,
  FORMS_VALIDATION_STRATEGY,
  FORM_IRANIAN_RULES,
  PERSIAN_FORM_ERRORS,
  RIALS_PER_TOMAN,
  assertNotForbiddenFormPattern,
  assertPersianValidationMessage,
  createZodFormResolver,
  formatTomanFa,
  iranianMobileSchema,
  isForbiddenFormPattern,
  normalizeIranianMobile,
  otpCodeSchema,
  parseTomanInput,
  posPhonePriceDraftSchema,
  positiveTomanSchema,
  requiredTextSchema,
  rialMinorToToman,
  toE164IranianMobile,
  tomanToRialMinor,
  zodResolver,
} from "./index.js";

describe("ADR-027 Form and Validation Strategy", () => {
  it("locks RHF + Zod + API-boundary validation", () => {
    expect(FORMS_VALIDATION_DECISION.adr).toBe("ADR-027");
    expect(FORMS_VALIDATION_DECISION.reactHookForm).toBe(true);
    expect(FORMS_VALIDATION_DECISION.zod).toBe(true);
    expect(FORMS_VALIDATION_DECISION.zodResolver).toBe(true);
    expect(FORMS_VALIDATION_DECISION.zodAtApiBoundary).toBe(true);
    expect(FORMS_VALIDATION_DECISION.neverTrustClientAlone).toBe(true);
    expect(FORMS_VALIDATION_LIBRARY.schema).toBe("zod");
    expect(FORMS_VALIDATION_LIBRARY.form).toBe("react-hook-form");
    expect(FORMS_VALIDATION_LIBRARY.zodInstalled).toBe(true);
    expect(FORMS_VALIDATION_LIBRARY.rhfInstalled).toBe(true);
    expect(FORMS_VALIDATION_LIBRARY.resolversInstalled).toBe(true);
    expect(typeof zodResolver).toBe("function");
    expect(typeof createZodFormResolver).toBe("function");
    expect(FORMS_VALIDATION_PATHS.strategyRoot).toBe("src/shared/validation/forms");
    expect(FORMS_VALIDATION_STRATEGY.decision).toEqual(FORMS_VALIDATION_DECISION);
  });

  it("forbids client-only and Formik/yup-only patterns", () => {
    expect(FORBIDDEN_FORM_PATTERNS).toEqual(
      expect.arrayContaining([
        "client_only_validation_without_api_zod",
        "formik",
        "yup_only_without_zod",
        "ad_hoc_english_validation_messages",
      ]),
    );
    expect(isForbiddenFormPattern("formik")).toBe(true);
    expect(() => assertNotForbiddenFormPattern("formik")).toThrow(
      /Forbidden form\/validation pattern/,
    );
    expect(() =>
      assertNotForbiddenFormPattern("shared_zod_schema"),
    ).not.toThrow();
  });

  it("exposes Persian plain-language error catalog and RTL contract", () => {
    expect(FORM_IRANIAN_RULES.lang).toBe("fa");
    expect(FORM_IRANIAN_RULES.dir).toBe("rtl");
    expect(FORM_IRANIAN_RULES.displayCurrencyUnit).toBe("تومان");
    expect(FORM_IRANIAN_RULES.validationMessagesPersian).toBe(true);
    for (const message of Object.values(PERSIAN_FORM_ERRORS)) {
      assertPersianValidationMessage(message);
      expect(message).not.toMatch(/required|invalid|error/i);
    }
    expect(() => assertPersianValidationMessage("Required field")).toThrow(
      /Persian/,
    );
  });

  it("normalizes Iranian mobiles and rejects invalid with Persian message", () => {
    expect(normalizeIranianMobile("09123456789")).toBe("09123456789");
    expect(normalizeIranianMobile("9123456789")).toBe("09123456789");
    expect(normalizeIranianMobile("+989123456789")).toBe("09123456789");
    expect(normalizeIranianMobile("00989123456789")).toBe("09123456789");
    expect(normalizeIranianMobile("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(normalizeIranianMobile("02112345678")).toBeNull();
    expect(toE164IranianMobile("09123456789")).toBe("+989123456789");

    const ok = iranianMobileSchema.safeParse(" +98 912 345 6789 ");
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data).toBe("09123456789");

    const bad = iranianMobileSchema.safeParse("123");
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const msg = bad.error.issues[0]?.message ?? "";
      expect(msg).toBe(PERSIAN_FORM_ERRORS.phoneInvalid);
      assertPersianValidationMessage(msg);
    }

    const empty = iranianMobileSchema.safeParse("");
    expect(empty.success).toBe(false);
    if (!empty.success) {
      assertPersianValidationMessage(empty.error.issues[0]?.message ?? "");
    }
  });

  it("converts تومان ↔ rial minor and formats with تومان label", () => {
    expect(RIALS_PER_TOMAN).toBe(10n);
    expect(tomanToRialMinor(5_000)).toBe(50_000n);
    expect(rialMinorToToman(50_000n)).toBe(5_000);
    expect(parseTomanInput("۱۲٬۵۰۰")).toBe(12_500);
    expect(parseTomanInput("12500 تومان")).toBe(12_500);
    expect(parseTomanInput("abc")).toBeNull();

    const label = formatTomanFa(12_500);
    expect(label).toMatch(/تومان/);
    expect(label).toMatch(/۱۲/);

    const ok = positiveTomanSchema.safeParse("25000");
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data).toBe(25_000);

    const zero = positiveTomanSchema.safeParse("0");
    expect(zero.success).toBe(false);
    if (!zero.success) {
      expect(zero.error.issues[0]?.message).toBe(
        PERSIAN_FORM_ERRORS.moneyPositive,
      );
      assertPersianValidationMessage(zero.error.issues[0]?.message ?? "");
    }
  });

  it("validates OTP and required text with Persian messages", () => {
    expect(otpCodeSchema.safeParse("۱۲۳۴۵۶").success).toBe(true);
    const otpBad = otpCodeSchema.safeParse("12");
    expect(otpBad.success).toBe(false);
    if (!otpBad.success) {
      expect(otpBad.error.issues[0]?.message).toBe(
        PERSIAN_FORM_ERRORS.otpInvalid,
      );
      assertPersianValidationMessage(otpBad.error.issues[0]?.message ?? "");
    }

    expect(requiredTextSchema.safeParse("شیر").success).toBe(true);
    const empty = requiredTextSchema.safeParse("   ");
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.error.issues[0]?.message).toBe(PERSIAN_FORM_ERRORS.required);
      assertPersianValidationMessage(empty.error.issues[0]?.message ?? "");
    }
  });

  it("composes draft schema and creates RHF zodResolver", async () => {
    const parsed = posPhonePriceDraftSchema.safeParse({
      phone: "09121112233",
      unitPriceToman: "۵۰۰۰",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBe("09121112233");
      expect(parsed.data.unitPriceToman).toBe(5_000);
    }

    const resolver = createZodFormResolver(posPhonePriceDraftSchema);
    const failed = await resolver(
      { phone: "bad", unitPriceToman: "0" } as Record<string, unknown>,
      undefined,
      {
        criteriaMode: "all",
        fields: {},
        shouldUseNativeValidation: false,
      },
    );
    expect(failed.errors.phone?.message).toBe(PERSIAN_FORM_ERRORS.phoneInvalid);
    assertPersianValidationMessage(String(failed.errors.phone?.message));
    expect(failed.errors.unitPriceToman?.message).toMatch(/[\u0600-\u06FF]/);

    const ok = await resolver(
      { phone: "09123456789", unitPriceToman: "1000" } as Record<
        string,
        unknown
      >,
      undefined,
      {
        criteriaMode: "all",
        fields: {},
        shouldUseNativeValidation: false,
      },
    );
    expect(ok.errors).toEqual({});
    expect(ok.values.phone).toBe("09123456789");
    expect(ok.values.unitPriceToman).toBe(1000);
  });
});
