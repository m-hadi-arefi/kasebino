/**
 * ADR-096 — Persian POS cash-register copy (uiuxpromax brief).
 */

import { POS_PHONE_CONSENT_NOTICE_FA } from "../../../crm-membership/index.js";
import { TENDER_LABELS_FA } from "../../../pos-sales/index.js";

export const POS_UI_COPY_FA = {
  brandHint: "کاسبینو",
  title: "صندوق فروش",
  subtitle: "بارکد، موبایل مشتری، جمع به تومان",
  searchLabel: "جستجوی کالا",
  searchPlaceholder: "نام کالا یا بارکد…",
  barcodeManualLabel: "ورود دستی بارکد",
  barcodePlaceholder: "بارکد را وارد کنید",
  scanCamera: "اسکن با دوربین",
  closeCamera: "بستن دوربین",
  cameraUnsupported:
    "دوربین بارکد روی این دستگاه پشتیبانی نمی‌شود. بارکد را دستی وارد کنید.",
  cameraPermissionDenied: "دسترسی به دوربین مجاز نیست.",
  scanning: "در حال اسکن…",
  cartEmpty: "سبد خالی است — بارکد بزنید یا جستجو کنید",
  cartRegion: "سبد فروش",
  quantity: "تعداد",
  removeLine: "حذف",
  total: "جمع",
  checkout: "تسویه",
  phoneStepTitle: "موبایل مشتری",
  phoneLabel: "شماره موبایل",
  phonePlaceholder: "0912…",
  consentNotice: POS_PHONE_CONSENT_NOTICE_FA,
  tenderTitle: "نوع پرداخت",
  tenderCash: TENDER_LABELS_FA.cash,
  tenderCard: TENDER_LABELS_FA.card_terminal,
  tenderMixed: TENDER_LABELS_FA.mixed,
  completeSale: "ثبت فروش",
  completing: "در حال ثبت فروش…",
  searching: "در حال جستجو…",
  successTitle: "فروش ثبت شد",
  receiptRef: "شماره رسید",
  viewReceipt: "مشاهده رسید",
  receiptPreparing: "رسید در حال آماده‌سازی است…",
  newSale: "فروش جدید",
  back: "بازگشت",
  unmatchedTitle: "کالا پیدا نشد",
  unmatchedBody: "این بارکد در فهرست کالا نیست.",
  unmatchedSearch: "جستجوی نام کالا",
  unmatchedCreateHint:
    "برای افزودن کالا به بخش کالاها بروید.",
  unmatchedCreateLink: "افزودن کالا",
  unmatchedCreateHref: "/products/new",
  noStore: "فروشگاهی برای این حساب تعریف نشده است.",
  loadingScope: "در حال آماده‌سازی صندوق…",
  networkError: "ارتباط برقرار نشد. دوباره تلاش کنید.",
  addToCart: "افزودن به سبد",
  redeemPoints: "اعمال امتیاز",
  redeemHint: "با شماره مشتری موجودی را ببینید و امتیاز کسر کنید",
  redeemPointsLabel: "تعداد امتیاز",
  redeemApply: "کسر امتیاز",
  redeeming: "در حال کسر…",
  redeemSuccess: "امتیاز کسر شد",
  redeemBalance: "موجودی امتیاز",
  redeemLookup: "مشاهده موجودی",
  pickupOnlyNote: "فروش حضوری — فقط تحویل در فروشگاه",
} as const;

export const POS_CONSENT_NOTICE_VERSION = "pos-consent-v1";
