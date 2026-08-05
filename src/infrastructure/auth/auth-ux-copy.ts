/**
 * Client-safe Persian auth copy (no Node / uiux gate imports).
 */

export const AUTH_UX_COPY_FA = {
  merchantTitle: "ورود فروشنده",
  merchantHint: "با شماره موبایل پیامک بگیرید و وارد داشبورد شوید.",
  customerTitle: "ورود مشتری",
  customerHint: "عضویت همین فروشگاه — ورود با پیامک",
  phoneLabel: "شماره موبایل",
  phonePlaceholder: "09123456789",
  otpLabel: "کد تأیید",
  otpPlaceholder: "۶ رقم",
  requestOtp: "دریافت کد",
  verifyOtp: "ورود",
  consentLabel:
    "می‌پذیرم که فروشگاه شماره موبایلم را برای عضویت و پیام‌های مرتبط ذخیره کند.",
  loading: "لطفاً صبر کنید…",
  successOtpSent: "کد تأیید ارسال شد.",
  errorGeneric: "لطفاً دوباره تلاش کنید.",
  pickupOnlyNote: "فقط پیکاپ حضوری — بدون ارسال یا پیک",
} as const;
