/**
 * ADR-107 — Persian notifications center copy (uiuxpromax brief).
 */

export const NOTIFICATIONS_UI_COPY_FA = {
  brand: "کاسبینو",
  merchantTitle: "اعلان‌ها",
  merchantSubtitle: "سفارش، موجودی و هشدارهای مغازه",
  customerTitle: "اعلان‌های من",
  customerSubtitle: "خبرهای همین فروشگاه — پیکاپ حضوری",
  backToDashboard: "داشبورد",
  backToPortal: "پنل من",
  loading: "در حال بارگذاری اعلان‌ها…",
  empty: "اعلانی نیست",
  errorRetry: "بارگذاری ناموفق بود. دوباره تلاش کنید.",
  markRead: "علامت به‌عنوان خوانده",
  marking: "در حال به‌روزرسانی…",
  markedRead: "خوانده شد",
  unreadBadge: "خوانده‌نشده",
  unreadCountLabel: "خوانده‌نشده",
  filterAll: "همه",
  filterUnread: "خوانده‌نشده",
  jalaliHint: "تاریخ‌ها به تقویم شمسی (تهران)",
  noDate: "—",
  navLink: "اعلان‌ها",
} as const;

export type NotificationsUiCopyKey = keyof typeof NOTIFICATIONS_UI_COPY_FA;
