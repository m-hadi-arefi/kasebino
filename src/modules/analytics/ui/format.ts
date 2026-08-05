import {
  formatTomanDisplay,
  moneyFromMinor,
} from "../../../shared/domain/money.js";

export function formatAnalyticsToman(minor: string | bigint): string {
  const value = typeof minor === "string" ? BigInt(minor) : minor;
  return formatTomanDisplay(moneyFromMinor(value));
}

export function formatAnalyticsJalaliDay(isoDay: string): string {
  const date = new Date(`${isoDay}T12:00:00+03:30`);
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
