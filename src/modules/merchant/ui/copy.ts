/**
 * ADR-121 — Merchant onboarding + multi-store — Persian copy.
 */

export const ONBOARDING_UI_COPY_FA = {
  title: "راه‌اندازی کسب‌وکار",
  subtitle: "چند گام کوتاه تا ویترین و صندوق فروش",
  stepMerchant: "کسب‌وکار",
  stepStore: "فروشگاه",
  stepBranding: "برند",
  stepReady: "آماده",
  tradeNameLabel: "نام تجاری",
  tradeNameHint: "نامی که مشتری روی ویترین می‌بیند",
  merchantSlugLabel: "شناسه آدرس کسب‌وکار",
  merchantSlugHint:
    "فقط حروف انگلیسی کوچک، عدد و خط تیره — بعد از انتشار قابل تغییر نیست",
  contactPhoneLabel: "موبایل تماس (اختیاری)",
  storeDisplayNameLabel: "نام فروشگاه",
  storeSlugLabel: "شناسه آدرس فروشگاه (ویترین)",
  storeSlugHint: "آدرس ویترین: /s/{slug} — پس از انتشار ثابت می‌ماند",
  primaryColorLabel: "رنگ اصلی برند",
  primaryColorHint: "مثلاً #0f766e",
  logoLabel: "لوگوی فروشگاه",
  skipLogo: "فعلاً بدون لوگو ادامه بده",
  nextCta: "ادامه",
  backCta: "قبلی",
  finishCta: "تکمیل راه‌اندازی",
  finishing: "در حال تکمیل…",
  saving: "در حال ذخیره…",
  loading: "در حال بارگذاری…",
  loadError: "بارگذاری وضعیت راه‌اندازی ممکن نشد.",
  networkError: "ارتباط برقرار نشد. دوباره تلاش کنید.",
  storefrontLabel: "آدرس ویترین",
  qrCta: "چاپ برچسب QR ویترین",
  productsCta: "افزودن کالا",
  posCta: "رفتن به صندوق",
  checklistTitle: "مسیر فعال‌سازی",
  checkMerchant: "ثبت کسب‌وکار",
  checkGeo: "آدرس و موقعیت فروشگاه",
  checkBranding: "برند (رنگ یا لوگو)",
  checkStorefront: "ویترین آماده",
  checkFirstSale: "اولین فروش با موبایل مشتری",
  resumeHint: "ادامه از جایی که توقف کردید",
  invalidSlug: "شناسه آدرس معتبر نیست.",
  invalidColor: "رنگ باید به صورت #RGB یا #RRGGBB باشد.",
} as const;

export const STORE_SWITCHER_UI_COPY_FA = {
  label: "فروشگاه فعال",
  empty: "هنوز فروشگاهی ثبت نشده است.",
  switching: "در حال تغییر فروشگاه…",
  switchError: "تغییر فروشگاه ممکن نشد.",
  createStore: "فروشگاه جدید",
  manageStores: "مدیریت فروشگاه‌ها",
  cartWarn:
    "با تغییر فروشگاه، سبد صندوق پاک می‌شود. ادامه می‌دهید؟",
} as const;

export const STORE_CREATE_UI_COPY_FA = {
  title: "فروشگاه جدید",
  subtitle: "هر فروشگاه موجودی و عضویت جدا دارد",
  submit: "ایجاد فروشگاه",
  submitting: "در حال ایجاد…",
  success: "فروشگاه ایجاد شد.",
  back: "بازگشت به فهرست",
} as const;

export const ONBOARDING_UIUX_GATE = {
  gatePassed: true,
  skillPresent: true,
  docsPresent: true,
  uiInScope: true,
  brief: {
    persian: true,
    rtl: true,
    faIrPersona: true,
    mobile390: true,
    iranianRetailContext: true,
    screenListDocumented: true,
    statesDocumented: true,
    a11yNotes: true,
  },
} as const;

/** Store slug immutable after first publish (storefront live). */
export const STORE_SLUG_POLICY = {
  immutableAfterPublish: true,
  documentedIn: "docs/execution/plans/ADR-121.md",
} as const;
