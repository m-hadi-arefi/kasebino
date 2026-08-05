/**
 * ADR-106 admin UI copy (Persian).
 */

export const ADMIN_UI_COPY_FA = {
  merchantsTitle: "فهرست فروشندگان",
  merchantsLead: "مشاهده، فعال‌سازی و تعلیق فروشندگان",
  loading: "در حال بارگذاری فروشندگان…",
  empty: "هنوز فروشنده‌ای ثبت نشده.",
  error: "بارگذاری فهرست ناموفق بود.",
  activate: "فعال‌سازی فروشنده",
  suspend: "تعلیق فروشنده",
  confirmSuspend: "آیا از تعلیق این فروشنده مطمئن هستید؟",
  confirmActivate: "آیا این فروشنده فعال شود؟",
  statusActive: "فعال",
  statusDraft: "پیش‌نویس",
  statusSuspended: "تعلیق‌شده",
  privilegeHint:
    "تعلیق فروشنده دسترسی به صندوق و ویترین را قطع می‌کند. با دقت اقدام کنید.",
  auditTitle: "گزارش حسابرسی",
  auditLoading: "در حال بارگذاری حسابرسی…",
  auditEmpty: "هنوز رویداد حسابرسی برای نمایش نیست.",
  auditError: "بارگذاری حسابرسی ناموفق بود.",
  actionCol: "اقدام",
  merchantCol: "فروشنده",
  resultCol: "نتیجه",
  timeCol: "زمان",
} as const;

export function merchantStatusLabelFa(status: string): string {
  switch (status) {
    case "active":
      return ADMIN_UI_COPY_FA.statusActive;
    case "draft":
      return ADMIN_UI_COPY_FA.statusDraft;
    case "suspended":
      return ADMIN_UI_COPY_FA.statusSuspended;
    default:
      return status;
  }
}
