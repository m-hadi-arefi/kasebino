/**
 * ADR-098 CRM presentation — تومان + Jalali (Asia/Tehran).
 */

import {
  formatTomanDisplay,
  moneyFromMinor,
} from "../../../shared/domain/money.js";
import type { CrmSegment } from "../domain/segments.js";
import { CRM_UI_COPY_FA } from "./copy.js";

export function formatCrmToman(
  amountMinor: string | number | bigint,
): string {
  const minor =
    typeof amountMinor === "bigint"
      ? amountMinor
      : BigInt(String(amountMinor));
  return formatTomanDisplay(moneyFromMinor(minor));
}

export function formatCrmJalali(iso: string | null | undefined): string {
  if (!iso) return CRM_UI_COPY_FA.noDate;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function segmentLabelFa(segment: CrmSegment): string {
  switch (segment) {
    case "new":
      return CRM_UI_COPY_FA.segmentNew;
    case "returning":
      return CRM_UI_COPY_FA.segmentReturning;
    case "lapsed":
      return CRM_UI_COPY_FA.segmentLapsed;
    case "active":
      return "فعال";
    case "inactive":
      return "غیرفعال";
    case "high_value":
      return "پرخرید / VIP";
    case "frequent":
      return "خرید مکرر";
    case "debtors":
      return "دارای بدهی";
    default: {
      const _exhaustive: never = segment;
      return _exhaustive;
    }
  }
}


export function sourceLabelFa(source: string): string {
  switch (source) {
    case "pos":
      return CRM_UI_COPY_FA.sourcePos;
    case "qr":
      return CRM_UI_COPY_FA.sourceQr;
    case "storefront":
      return CRM_UI_COPY_FA.sourceStorefront;
    case "pickup":
      return CRM_UI_COPY_FA.sourcePickup;
    default:
      return source;
  }
}

export function statusLabelFa(status: string): string {
  switch (status) {
    case "active":
      return CRM_UI_COPY_FA.statusActive;
    case "inactive":
      return CRM_UI_COPY_FA.statusInactive;
    case "suspended":
      return CRM_UI_COPY_FA.statusSuspended;
    default:
      return status;
  }
}
