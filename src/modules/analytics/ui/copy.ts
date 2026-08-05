/**
 * ADR-106 merchant analytics UI copy + API client (Persian RTL).
 */

export const ANALYTICS_UI_COPY_FA = {
  overviewTitle: "نمای کلی",
  revenueTitle: "درآمد",
  customersTitle: "مشتریان",
  retentionTitle: "بازماندگی",
  northStarTitle: "مشتریان بازمانده ماهانه",
  salesCount: "تعداد فروش",
  revenueToman: "درآمد (تومان)",
  activeMemberships: "عضویت‌های فعال",
  newMemberships: "عضویت‌های جدید",
  returningCustomers: "مشتریان بازگشتی",
  loading: "در حال بارگذاری داشبورد…",
  empty: "هنوز فروشی ثبت نشده.",
  emptyCustomers: "هنوز مشتری‌ای ثبت نشده.",
  error: "بارگذاری داشبورد ناموفق بود. دوباره تلاش کنید.",
  cacheHint: "به‌روزرسانی کش حدود هر ۶۰ ثانیه",
  jalaliHint: "مبالغ به تومان · بازهٔ تاریخ‌ها به تقویم شمسی (تهران)",
  rangeLabel: "بازهٔ شمسی",
} as const;

export type AnalyticsUiCopyKey = keyof typeof ANALYTICS_UI_COPY_FA;
