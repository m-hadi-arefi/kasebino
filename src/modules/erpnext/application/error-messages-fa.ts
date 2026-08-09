/**
 * Normalize ERPNext / transport errors to Persian MerchantOS messages (ADR-141).
 */

export function normalizeErpNextErrorFa(err: unknown): string {
  const raw =
    err instanceof Error
      ? `${err.name} ${err.message}`
      : typeof err === "string"
        ? err
        : JSON.stringify(err ?? "");
  const lower = raw.toLowerCase();

  if (
    lower.includes("duplicate") ||
    lower.includes("already exists") ||
    lower.includes("unique")
  ) {
    return "این سند قبلاً در دفتر مالی ثبت شده است.";
  }
  if (
    lower.includes("timeout") ||
    lower.includes("aborted") ||
    lower.includes("econnrefused") ||
    lower.includes("fetch failed") ||
    lower.includes("network")
  ) {
    return "ارتباط با دفتر مالی برقرار نشد. همگام‌سازی بعداً تکرار می‌شود.";
  }
  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("misconfigured")
  ) {
    return "پیکربندی دفتر مالی ناقص است. با پشتیبانی فنی تماس بگیرید.";
  }
  if (lower.includes("sale_lines_required")) {
    return "ثبت فاکتور مالی بدون اقلام فروش ممکن نیست.";
  }
  if (lower.includes("insufficient stock") || lower.includes("negative stock")) {
    return "موجودی دفتر مالی برای ثبت فاکتور کافی نیست.";
  }
  return "ثبت در دفتر مالی انجام نشد. عملیات فروش در کاسبینو ذخیره شده است.";
}
