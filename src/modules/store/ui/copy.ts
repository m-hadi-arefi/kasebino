/**
 * ADR-104 merchant store location + QR print — Persian copy.
 */

export const STORE_LOCATION_UI_COPY_FA = {
  locationTitle: "موقعیت فروشگاه",
  locationSubtitle: "آدرس فارسی و مختصات جغرافیایی برای ویترین و مسیریابی",
  line1Label: "آدرس (خیابان و پلاک)",
  line2Label: "توضیح تکمیلی (اختیاری)",
  cityLabel: "شهر",
  provinceLabel: "استان",
  postalCodeLabel: "کد پستی (اختیاری)",
  latitudeLabel: "عرض جغرافیایی",
  longitudeLabel: "طول جغرافیایی",
  saveCta: "ذخیره موقعیت",
  saving: "در حال ذخیره…",
  saveSuccess: "موقعیت ذخیره شد.",
  loadError: "بارگذاری فروشگاه ممکن نشد.",
  networkError: "ارتباط برقرار نشد. دوباره تلاش کنید.",
  invalidGeo: "مختصات جغرافیایی معتبر نیست.",
  qrNav: "چاپ QR ویترین",
  backDashboard: "بازگشت به داشبورد",
} as const;

export const STORE_BRANDING_UI_COPY_FA = {
  logoUpload: "بارگذاری لوگو",
  uploading: "در حال بارگذاری…",
  uploadSuccess: "لوگو ذخیره شد.",
  uploadError: "بارگذاری لوگو ناموفق بود.",
  logoHint: "PNG، JPEG، WebP یا GIF — حداکثر ۲ مگابایت (بدون SVG)",
} as const;

export const STORE_QR_PRINT_UI_COPY_FA = {
  title: "چاپ QR فروشگاه",
  subtitle: "برچسب ویترین و پیشخوان — اسکن به ویترین فروشگاه",
  printCta: "چاپ",
  downloadHint: "برای چاپ روی A4 یا برچسب، دکمهٔ چاپ را بزنید.",
  targetLabel: "مقصد QR",
  stickerWindow: "برچسب را روی ویترین در ارتفاع دید مشتری بچسبانید.",
  stickerCounter: "یک نسخه روی پیشخوان نزدیک صندوق نگه دارید.",
  stickerCta: "اسکن کنید — عضویت و سفارش حضوری",
  loadError: "بارگذاری QR ممکن نشد.",
  loading: "در حال آماده‌سازی QR…",
  backLocation: "موقعیت فروشگاه",
  backDashboard: "داشبورد",
} as const;

export const STORE_HOURS_UI_COPY_FA = {
  title: "ساعات کاری",
  subtitle: "هفتهٔ ایرانی از شنبه تا جمعه · زمان به وقت تهران",
  saveCta: "ذخیره ساعات",
  saving: "در حال ذخیره…",
  saveSuccess: "ساعات کاری ذخیره شد.",
  loadError: "بارگذاری ساعات ممکن نشد.",
  networkError: "ارتباط برقرار نشد. دوباره تلاش کنید.",
  closed: "بسته",
  openLabel: "ساعت باز شدن",
  closeLabel: "ساعت بسته شدن",
  dayOpen: "باز است",
  backStores: "فروشگاه‌ها",
  weekday: {
    saturday: "شنبه",
    sunday: "یکشنبه",
    monday: "دوشنبه",
    tuesday: "سه‌شنبه",
    wednesday: "چهارشنبه",
    thursday: "پنجشنبه",
    friday: "جمعه",
  },
} as const;

export const STORE_LOCATION_UIUX_GATE = {
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
