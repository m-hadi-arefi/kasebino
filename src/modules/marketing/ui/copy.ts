/**
 * ADR-122 — Persian marketing landing copy (fa-IR).
 * Pricing stance: پایلوت رایگان کرمان (ADR-091) — no invented fee tables.
 */

export const MARKETING_BRAND_FA = "کاسبینو" as const;

export const MARKETING_CTA = {
  /** Merchant OTP login (ADR-095). No `/register` route yet. */
  primaryHref: "/login?callbackUrl=/onboarding",
  secondaryHref: "/login",
} as const;

export const MARKETING_SEO_FA = {
  title: "کاسبینو | سیستم‌عامل خرده‌فروشی ایرانی",
  description:
    "صندوق، باشگاه مشتریان، ویترین سفارش حضوری و وفاداری برای مغازه‌های محلی. پایلوت رایگان کرمان.",
  ogTitle: "کاسبینو",
  ogDescription:
    "سیستم‌عامل خرده‌فروشی ایرانی — از صندوق تا مشتری وفادار، بدون پیچیدگی ERP.",
} as const;

export const MARKETING_COPY_FA = {
  skipToContent: "پریدن به محتوا",
  navFeatures: "امکانات",
  navPricing: "قیمت",
  navFaq: "سوالات",
  navLogin: "ورود",
  navStart: "شروع رایگان",

  brand: MARKETING_BRAND_FA,
  heroHeadline: "هر فروش، یک مشتری وفادار",
  heroSupport:
    "صندوق سریع، ویترین سفارش حضوری و باشگاه مشتریان برای مغازه‌های محلی ایران.",
  heroCtaPrimary: "شروع رایگان",
  heroCtaSecondary: "ورود فروشندگان",

  featuresEyebrow: "امکانات",
  featuresHeadline: "همان ابزاری که پای صندوق نیاز دارید",
  featuresSupport: "ساده، موبایلی، و هماهنگ با کار روزمرهٔ مغازه.",
  features: [
    {
      id: "pos",
      title: "صندوق موبایلی",
      body: "فروش سریع با ثبت موبایل مشتری؛ مناسب ترافیک لحظه‌ای مغازه.",
    },
    {
      id: "crm",
      title: "باشگاه مشتریان فروشگاهی",
      body: "عضویت با شماره موبایل؛ تاریخچه و وفاداری مالِ همان فروشگاه.",
    },
    {
      id: "storefront",
      title: "ویترین سفارش حضوری",
      body: "لینک و QR ویترین؛ مشتری آنلاین سفارش می‌دهد و حضوری تحویل می‌گیرد.",
    },
    {
      id: "loyalty",
      title: "امتیاز و پاداش",
      body: "قوانین وفاداری ساده تا خرید بعدی را برای مشتری معنادار کنید.",
    },
    {
      id: "orders",
      title: "تابلوی سفارش‌ها",
      body: "آماده‌سازی و تحویل حضوری را روی یک بورد شفاف مدیریت کنید.",
    },
    {
      id: "analytics",
      title: "نگاه به بازگشت مشتری",
      body: "ببینید چه کسانی برمی‌گردند — نه فقط چقدر فروخته‌اید.",
    },
  ],

  benefitsEyebrow: "چرا کاسبینو",
  benefitsHeadline: "برای مغازه‌دار ساخته شده، نه برای تیم IT",
  benefitsSupport: "زبان روزمرهٔ خرده‌فروشی؛ بدون پیچیدگی ERP.",
  benefits: [
    {
      title: "شروع با پیامک",
      body: "ورود با OTP؛ بدون رمز پیچیده یا ایمیل اجباری.",
    },
    {
      title: "تمرکز روی مشتری حضوری",
      body: "هر فروش حضوری می‌تواند عضویت و بازگشت بسازد.",
    },
    {
      title: "بدون پیک در فاز اول",
      body: "سفارش آنلاین فقط برای تحویل در مغازه — مسیر ساده و قابل اعتماد.",
    },
  ],

  howEyebrow: "مسیر راهاندازی",
  howHeadline: "از ثبت‌نام تا اولین فروش",
  howSupport: "چهار گام کوتاه تا صندوق زنده شود.",
  howSteps: [
    {
      step: "۱",
      title: "ورود با پیامک",
      body: "با شماره موبایل وارد شوید و کسب‌وکارتان را بسازید.",
    },
    {
      step: "۲",
      title: "مغازه و ویترین",
      body: "آدرس، برند و لینک ویترین را آماده کنید؛ QR را چاپ کنید.",
    },
    {
      step: "۳",
      title: "محصول و موجودی",
      body: "کالاهای پرفروش را اضافه کنید تا صندوق و ویترین یکی شوند.",
    },
    {
      step: "۴",
      title: "اولین فروش با موبایل مشتری",
      body: "فروش را ثبت کنید؛ عضو جدید و امتیاز از همان لحظه شروع می‌شود.",
    },
  ],

  shotsEyebrow: "نمای محصول",
  shotsHeadline: "از صندوق تا سفارش حضوری",
  shotsSupport: "تجربهٔ موبایلی برای صندوقدار و مشتری مغازه.",
  shots: [
    {
      id: "pos",
      title: "صندوق",
      alt: "نمای سادهٔ صندوق موبایلی کاسبینو",
      src: "/marketing/frame-pos.svg",
    },
    {
      id: "loyalty",
      title: "باشگاه مشتریان",
      alt: "نمای کیف امتیاز و وفاداری مشتری",
      src: "/marketing/frame-loyalty.svg",
    },
    {
      id: "orders",
      title: "سفارش حضوری",
      alt: "نمای تابلوی آماده‌سازی سفارش حضوری",
      src: "/marketing/frame-orders.svg",
    },
  ],

  pricingEyebrow: "قیمت",
  pricingHeadline: "پایلوت رایگان کرمان",
  pricingBody:
    "در فاز پایلوت کرمان، استفاده از کاسبینو برای فروشندگان پایلوت رایگان است؛ بدون جدول تعرفهٔ ساختگی و بدون اجبار به پلن پولی در این مرحله. پس از یادگیری واحدهای اقتصادی، مدل قیمت‌گذاری بعدی اعلام می‌شود.",
  pricingNote: "فعلاً فقط پایلوت — نه بسته‌های پولی اختراع‌شده.",

  faqEyebrow: "سوالات متداول",
  faqHeadline: "قبل از شروع",
  faq: [
    {
      q: "کاسبینو برای چه مغازه‌هایی است؟",
      a: "خرده‌فروشی محلی — به‌ویژه مغازه‌های کرمان در فاز پایلوت — که می‌خواهند مشتری را بعد از فروش حضوری نگه دارند.",
    },
    {
      q: "آیا ارسال با پیک دارید؟",
      a: "خیر. در نسخهٔ فعلی سفارش آنلاین فقط برای تحویل حضوری در مغازه است.",
    },
    {
      q: "ورود فروشنده چطور است؟",
      a: "با پیامک OTP روی موبایل؛ سپس راه‌اندازی فروشگاه و صندوق.",
    },
    {
      q: "قیمت بعد از پایلوت چیست؟",
      a: "هنوز قفل نشده. پایلوت رایگان کرمان برای یادگیری واقعی است؛ جداول تعرفهٔ ساختگی منتشر نمی‌کنیم.",
    },
  ],

  finalCtaHeadline: "مغازه‌تان را به سیستم‌عامل خرده‌فروشی متصل کنید",
  finalCtaSupport: "پایلوت رایگان کرمان — همین امروز با پیامک شروع کنید.",
  finalCtaPrimary: "شروع رایگان",
  finalCtaSecondary: "ورود",

  footerTagline: "سیستم‌عامل خرده‌فروشی ایرانی",
  footerProduct: "محصول",
  footerCompany: "کاسبینو",
  footerLogin: "ورود فروشندگان",
  footerFeatures: "امکانات",
  footerPricing: "قیمت",
  footerFaq: "سوالات",
  footerRights: "همهٔ حقوق محفوظ است.",
} as const;

export const MARKETING_SECTION_IDS = [
  "hero",
  "features",
  "benefits",
  "how-it-works",
  "screenshots",
  "pricing",
  "faq",
  "cta",
  "footer",
] as const;

export type MarketingSectionId = (typeof MARKETING_SECTION_IDS)[number];

/** uiuxpromax gate evidence for ADR-122 marketing landing. */
export const MARKETING_UIUX_GATE = {
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
