/**
 * ADR-103 customer portal presentation helpers (تومان / جلالی).
 */

export function formatPortalJalali(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export const ORDER_STATUS_LABEL_FA: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  preparing: "در حال آماده‌سازی",
  ready_for_pickup: "آمادهٔ تحویل",
  picked_up: "تحویل‌شده",
  completed: "تکمیل‌شده",
  cancelled: "لغو‌شده",
  refunded: "عودت‌شده",
};

export function orderStatusLabelFa(status: string): string {
  return ORDER_STATUS_LABEL_FA[status] ?? status;
}
