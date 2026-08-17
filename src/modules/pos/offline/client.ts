/**
 * Client-safe POS offline constants (no node:crypto).
 * Use from `"use client"` App Router components.
 */

/** Service worker policy — staff POS shell only. */
export const POS_OFFLINE_SERVICE_WORKER = {
  scriptUrl: "/sw-staff.js",
  scope: "/" as const,
  precache: [
    "/pos",
    "/staff/manifest.webmanifest",
    "/icons/staff-pwa-default.svg",
  ] as const,
  audience: "staff" as const,
  sharedWithStoreCustomerForbidden: true,
  backgroundSyncTag: "mos-staff-sale-queue",
  /** Runtime CompleteSale path used by SW / browser flush (ADR-105). */
  completeSalePath: "/api/v1/pos/sales",
} as const;

/** IndexedDB / client persistence policy. */
export const POS_OFFLINE_IDB = {
  dbName: "mos-staff-pos",
  storeName: "sale_drafts",
  draftModel: "SaleDraft" as const,
  secretsForbidden: true,
  jwtPlaintextForbidden: true,
  inMemoryAdapterForTests: true,
} as const;

/** Persian shop-floor copy (staff POS). */
export const POS_OFFLINE_COPY_FA = {
  online: "صندوق آنلاین آماده است.",
  offlineQueued: "اتصال قطع است — فروش در صف آفلاین ذخیره شد.",
  offlineEmpty: "آفلاین هستید؛ هنوز فروشی در صف نیست.",
  syncing: "در حال همگام‌سازی صف فروش…",
  synced: "صف آفلاین با موفقیت همگام شد.",
  stockRejected:
    "به‌خاطر کمبود موجودی، فروش آفلاین رد شد و برای بررسی نگه داشته شد.",
  syncFailed: "همگام‌سازی صف ناموفق بود. دوباره تلاش کنید.",
  duplicateApplied: "این فروش قبلاً ثبت شده است.",
  reviewQueueCta: "بررسی صف",
  retrySyncCta: "همگام‌سازی دوباره",
  closeReviewCta: "بستن",
  rejectedHeading: "فروش‌های نیازمند بررسی",
  emptyRejected: "مورد ردشده‌ای برای بررسی نیست.",
  queuedHeading: "در صف همگام‌سازی",
  tomanNote: "مبالغ صف به‌صورت تومان در صندوق نمایش داده می‌شود.",
  regionLabel: "وضعیت اتصال و صف آفلاین صندوق",
  saleQueuedSuccess: "فروش در صف آفلاین ذخیره شد و پس از اتصال همگام می‌شود.",
} as const;

export const POS_OFFLINE_INSTALL_UX = {
  minTouchTargetPx: 44,
  lang: "fa" as const,
  dir: "rtl" as const,
  copyFa: POS_OFFLINE_COPY_FA,
} as const;

export function bannerForConnectivity(input: {
  online: boolean;
  queuedCount: number;
  syncing?: boolean;
  rejectedCount?: number;
}): string {
  if (input.syncing) return POS_OFFLINE_COPY_FA.syncing;
  if ((input.rejectedCount ?? 0) > 0) return POS_OFFLINE_COPY_FA.stockRejected;
  if (input.online) {
    return input.queuedCount > 0
      ? POS_OFFLINE_COPY_FA.syncing
      : POS_OFFLINE_COPY_FA.online;
  }
  return input.queuedCount > 0
    ? POS_OFFLINE_COPY_FA.offlineQueued
    : POS_OFFLINE_COPY_FA.offlineEmpty;
}

export function requireSyncKey(syncKey: string): string {
  const trimmed = syncKey.trim();
  if (!trimmed) {
    throw new Error(
      "Offline sale syncKey (idempotency) is required (ADR-024).",
    );
  }
  return trimmed;
}
