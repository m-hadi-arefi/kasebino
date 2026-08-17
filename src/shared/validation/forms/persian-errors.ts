/**
 * Persian validation / form error catalog (ADR-027).
 * Plain-language merchant/customer copy — not English technical jargon.
 */

export const PERSIAN_FORM_ERRORS = {
  required: "این فیلد الزامی است",
  invalidType: "مقدار وارد شده نامعتبر است",
  tooShort: "متن وارد‌شده کوتاه است",
  tooLong: "متن وارد‌شده خیلی بلند است",
  phoneRequired: "شماره موبایل را وارد کنید",
  phoneInvalid: "شماره موبایل ایران نامعتبر است",
  otpInvalid: "کد تأیید نامعتبر است",
  otpRequired: "کد تأیید را وارد کنید",
  moneyInvalid: "مبلغ نامعتبر است",
  moneyPositive: "مبلغ باید بیشتر از صفر باشد",
  moneyNonNegative: "مبلغ نمی‌تواند منفی باشد",
} as const;

export type PersianFormErrorKey = keyof typeof PERSIAN_FORM_ERRORS;

/** RTL / locale contract for form surfaces (capacity until product UI). */
export const FORM_IRANIAN_RULES = {
  dir: "rtl" as const,
  lang: "fa" as const,
  locale: "fa-IR" as const,
  displayCurrencyUnit: "تومان" as const,
  validationMessagesPersian: true,
  plainLanguageErrors: true,
  noEnglishUxJargon: true,
  inlineErrorsAboveKeyboard: true,
  rtlFieldOrder: true,
} as const;

/** Assert a Zod issue message is Persian (Arabic script present). */
export function assertPersianValidationMessage(message: string): void {
  if (!/[\u0600-\u06FF]/.test(message)) {
    throw new Error(
      `Validation message must be Persian (ADR-027 Iranian First): got "${message}"`,
    );
  }
  if (/\b(required|invalid|error|must be)\b/i.test(message)) {
    throw new Error(
      `Validation UX must not expose English jargon (ADR-027): got "${message}"`,
    );
  }
}
