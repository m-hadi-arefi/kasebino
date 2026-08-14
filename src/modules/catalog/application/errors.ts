/**
 * Persian catalog-domain errors (ADR-008 Iranian First).
 * Shop-floor vocabulary — not ERP jargon.
 */

export const CATALOG_ERROR_CODES = [
  "INVALID_PRODUCT_NAME",
  "INVALID_SKU",
  "INVALID_BARCODE",
  "INVALID_PRICE",
  "BARCODE_TAKEN",
  "SKU_TAKEN",
  "PRODUCT_NOT_FOUND",
  "CATEGORY_NOT_FOUND",
  "INVALID_CATEGORY_NAME",
  "PRODUCT_ALREADY_DELETED",
  "CATEGORY_ALREADY_DELETED",
  "INVALID_IMAGE_TYPE",
  "IMAGE_TOO_LARGE",
  "OBJECT_STORAGE_NOT_CONFIGURED",
] as const;

export type CatalogErrorCode = (typeof CATALOG_ERROR_CODES)[number];

export const CATALOG_ERROR_MESSAGES_FA = {
  INVALID_PRODUCT_NAME:
    "نام کالا معتبر نیست. لطفاً نام محصول را وارد کنید.",
  INVALID_SKU: "کد کالا (SKU) معتبر نیست.",
  INVALID_BARCODE: "بارکد معتبر نیست. بارکد را دوباره بررسی کنید.",
  INVALID_PRICE: "قیمت معتبر نیست. مبلغ نمی‌تواند منفی باشد.",
  BARCODE_TAKEN: "این بارکد قبلاً برای کالای دیگری ثبت شده است.",
  SKU_TAKEN: "این کد کالا قبلاً استفاده شده است.",
  PRODUCT_NOT_FOUND: "کالا یافت نشد.",
  CATEGORY_NOT_FOUND: "دسته‌بندی یافت نشد.",
  INVALID_CATEGORY_NAME:
    "نام دسته‌بندی معتبر نیست. لطفاً نام دسته را وارد کنید.",
  PRODUCT_ALREADY_DELETED: "این کالا قبلاً حذف شده است.",
  CATEGORY_ALREADY_DELETED: "این دسته‌بندی قبلاً حذف شده است.",
  INVALID_IMAGE_TYPE:
    "فرمت تصویر معتبر نیست. لطفاً تصویر PNG، JPEG یا WebP انتخاب کنید.",
  IMAGE_TOO_LARGE: "حجم تصویر بیشتر از حد مجاز است (حداکثر ۵ مگابایت).",
  OBJECT_STORAGE_NOT_CONFIGURED: "سامانه ذخیره‌سازی فایل پیکربندی نشده است.",
} as const satisfies Record<CatalogErrorCode, string>;

export class CatalogDomainError extends Error {
  readonly code: CatalogErrorCode;
  readonly messageFa: string;

  constructor(code: CatalogErrorCode) {
    const messageFa = CATALOG_ERROR_MESSAGES_FA[code];
    super(messageFa);
    this.name = "CatalogDomainError";
    this.code = code;
    this.messageFa = messageFa;
  }
}

export function isCatalogDomainError(
  error: unknown,
): error is CatalogDomainError {
  return error instanceof CatalogDomainError;
}
