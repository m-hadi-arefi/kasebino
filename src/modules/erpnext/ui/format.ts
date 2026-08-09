import { formatTomanDisplay, moneyFromMinor } from "../../../shared/domain/money.js";

export function formatFinanceJalali(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatFinanceToman(amountMinor: string | null | undefined): string {
  if (amountMinor == null) return "—";
  try {
    return formatTomanDisplay(moneyFromMinor(BigInt(amountMinor)));
  } catch {
    return "—";
  }
}

export function syncStatusLabelFa(status: string): string {
  switch (status) {
    case "synced":
      return "همگام";
    case "pending":
      return "در انتظار";
    case "failed":
      return "ناموفق";
    default:
      return "نامشخص";
  }
}
