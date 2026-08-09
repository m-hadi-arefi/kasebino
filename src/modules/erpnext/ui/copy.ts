/**
 * Persian copy — ERPNext finance UI (ADR-141).
 */

export const ERPNEXT_FINANCE_UI_COPY_FA = {
  navTitle: "مالی",
  pageTitle: "مالی",
  pageDescription:
    "خلاصه درآمد و وضعیت اسناد مالی از دفتر مالی · مبلغ به تومان · تاریخ شمسی",
  syncTitle: "وضعیت همگام‌سازی",
  syncDescription: "فاکتورها و پرداخت‌های ارسال‌شده به دفتر مالی",
  todaySales: "فروش امروز",
  monthRevenue: "درآمد ماه",
  receivables: "مطالبات",
  payables: "بدهی‌ها",
  profit: "سود تقریبی",
  invoicesSynced: "فاکتور همگام",
  paymentsSynced: "پرداخت همگام",
  pending: "در انتظار",
  failed: "ناموفق",
  synced: "همگام",
  unknown: "نامشخص",
  sourceErpnext: "منبع: دفتر مالی",
  sourceFake: "منبع: آزمایشی",
  sourceUnavailable: "دفتر مالی در دسترس نیست — صندوق همچنان کار می‌کند",
  emptyInvoices: "هنوز سند مالی همگام نشده است",
  emptyHint: "پس از فروش در صندوق، فاکتور به‌صورت خودکار ساخته می‌شود",
  loading: "در حال بارگذاری خلاصه مالی…",
  networkError: "خطا در دریافت اطلاعات مالی",
  invoiceNumber: "شماره سند",
  saleRef: "ارجاع فروش",
  customerFinanceTitle: "نمای مالی",
  customerFinanceHint: "جدا از امتیاز وفاداری و پروفایل ارتباط با مشتری",
  outstanding: "مانده بدهی",
  creditStatus: "وضعیت اعتباری",
  invoices: "فاکتورها",
  payments: "پرداخت‌ها",
  noFinanceAccess: "دسترسی به بخش مالی ندارید",
} as const;

export const ERPNEXT_UIUX_GATE = {
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
