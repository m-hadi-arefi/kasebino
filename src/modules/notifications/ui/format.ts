/**
 * ADR-107 presentation — Jalali timestamps (Asia/Tehran).
 */

import { NOTIFICATIONS_UI_COPY_FA } from "./copy.js";

export function formatNotificationJalali(
  iso: string | null | undefined,
): string {
  if (!iso) return NOTIFICATIONS_UI_COPY_FA.noDate;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
