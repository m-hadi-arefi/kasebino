/**
 * Persian realtime UX helpers (ADR-039 / ADR-124 Iranian First).
 * Keep free of Node built-ins — imported by client components.
 */

import type { MerchantTopicChannel } from "../emqx-realtime/channels.js";
import type { RealtimeUxKey } from "./client.js";

/**
 * Iranian First — user-visible realtime connection toasts (fa-IR + RTL).
 * Wire schemas English; presenters render these strings.
 * Strings aligned with EVENT_UX_FA / EMQX_UX_FA without importing those barrels.
 */
export const REALTIME_CLIENT_UX_FA = {
  SALE_COMPLETED_TOAST: "فروش با موفقیت ثبت شد.",
  INVENTORY_LOW_TOAST: "موجودی کالا کم شده است.",
  INVENTORY_DEPLETED_TOAST: "موجودی کالا تمام شده است.",
  PICKUP_ORDER_PAID_TOAST: "سفارش حضوری پرداخت شد و آماده آماده‌سازی است.",
  MEMBERSHIP_CREATED_TOAST: "عضویت مشتری ثبت شد.",
  REALTIME_RECONNECTING: "در حال اتصال مجدد…",
  REALTIME_OFFLINE: "اتصال لحظه‌ای قطع است. داده‌ها به‌زودی به‌روز می‌شوند.",
  NOTIFICATION_DRAWER_TITLE: "اعلان‌ها",
  dir: "rtl" as const,
  locale: "fa-IR" as const,
  notificationDrawerRtl: true,
  CONNECTED: "اتصال لحظه‌ای برقرار شد.",
  POLL_FALLBACK:
    "اتصال لحظه‌ای قطع است؛ به‌روزرسانی دوره‌ای فعال شد.",
  RECONNECTING: "در حال اتصال مجدد…",
  OFFLINE: "اتصال لحظه‌ای قطع است. داده‌ها به‌زودی به‌روز می‌شوند.",
  NEW_ORDER: "سفارش جدید",
  MQTT_DISABLED_POLL:
    "به‌روزرسانی دوره‌ای فعال است (اتصال لحظه‌ای خاموش).",
} as const;

export type RealtimeClientUxKey = keyof Pick<
  typeof REALTIME_CLIENT_UX_FA,
  | "CONNECTED"
  | "POLL_FALLBACK"
  | "RECONNECTING"
  | "OFFLINE"
  | "NEW_ORDER"
  | "MQTT_DISABLED_POLL"
>;

export function resolveRealtimeUxMessage(key: RealtimeUxKey): string {
  switch (key) {
    case "connected":
      return REALTIME_CLIENT_UX_FA.CONNECTED;
    case "poll_fallback":
      return REALTIME_CLIENT_UX_FA.POLL_FALLBACK;
    case "reconnecting":
    case "connecting":
      return REALTIME_CLIENT_UX_FA.RECONNECTING;
    case "offline":
      return REALTIME_CLIENT_UX_FA.OFFLINE;
    case "idle":
    default:
      return REALTIME_CLIENT_UX_FA.OFFLINE;
  }
}

export function toastMessageForChannel(
  channel: MerchantTopicChannel,
): string | null {
  switch (channel) {
    case "orders":
      return REALTIME_CLIENT_UX_FA.NEW_ORDER;
    case "sales":
      return REALTIME_CLIENT_UX_FA.SALE_COMPLETED_TOAST;
    case "inventory":
      return REALTIME_CLIENT_UX_FA.INVENTORY_LOW_TOAST;
    case "notifications":
      return null;
    default:
      return null;
  }
}

export function assertPersianRealtimeClientCopy(): void {
  if (
    REALTIME_CLIENT_UX_FA.dir !== "rtl" ||
    REALTIME_CLIENT_UX_FA.locale !== "fa-IR"
  ) {
    throw new Error(
      "Realtime client UX must be fa-IR + rtl (ADR-039 Iranian First).",
    );
  }
  for (const msg of [
    REALTIME_CLIENT_UX_FA.CONNECTED,
    REALTIME_CLIENT_UX_FA.POLL_FALLBACK,
    REALTIME_CLIENT_UX_FA.RECONNECTING,
    REALTIME_CLIENT_UX_FA.OFFLINE,
    REALTIME_CLIENT_UX_FA.NEW_ORDER,
    REALTIME_CLIENT_UX_FA.NOTIFICATION_DRAWER_TITLE,
  ]) {
    if (!/[\u0600-\u06FF]/.test(msg)) {
      throw new Error(
        "Realtime client user-visible copy must include Persian script (ADR-039).",
      );
    }
  }
}
