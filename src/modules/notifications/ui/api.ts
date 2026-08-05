/**
 * ADR-107 notifications HTTP client (session cookies).
 */

import { csrfHeadersForBrowserFetch } from "../../../infrastructure/security/index.js";
import { NOTIFICATIONS_UI_COPY_FA } from "./copy.js";

export type NotificationDto = {
  id: string;
  merchantId: string;
  storeId: string | null;
  userId: string | null;
  audience: "merchant" | "customer";
  channel: string;
  type: string;
  titleFa: string;
  bodyFa: string;
  readAt: string | null;
  createdAt: string;
};

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string; messageFa?: string };
};

async function parseJson<T>(res: Response): Promise<Envelope<T>> {
  return (await res.json()) as Envelope<T>;
}

function errorMessage(body: Envelope<unknown>, fallback: string): string {
  return body.error?.messageFa ?? body.error?.message ?? fallback;
}

export async function fetchNotifications(input?: {
  unreadOnly?: boolean;
  storeId?: string;
}): Promise<{ notifications: NotificationDto[]; unreadCount: number }> {
  const params = new URLSearchParams();
  if (input?.unreadOnly) params.set("unreadOnly", "true");
  if (input?.storeId) params.set("storeId", input.storeId);
  const qs = params.toString();
  const res = await fetch(
    `/api/v1/notifications${qs ? `?${qs}` : ""}`,
    { credentials: "same-origin" },
  );
  const body = await parseJson<{
    notifications: NotificationDto[];
    unreadCount: number;
  }>(res);
  if (!res.ok) {
    throw new Error(
      errorMessage(body, NOTIFICATIONS_UI_COPY_FA.errorRetry),
    );
  }
  return {
    notifications: body.data?.notifications ?? [],
    unreadCount: body.data?.unreadCount ?? 0,
  };
}

export async function markNotificationRead(
  notificationId: string,
  input?: { storeId?: string },
): Promise<NotificationDto> {
  const params = new URLSearchParams();
  if (input?.storeId) params.set("storeId", input.storeId);
  const qs = params.toString();
  const res = await fetch(
    `/api/v1/notifications/${encodeURIComponent(notificationId)}/read${qs ? `?${qs}` : ""}`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        ...csrfHeadersForBrowserFetch(),
      },
      body: "{}",
    },
  );
  const body = await parseJson<{ notification: NotificationDto }>(res);
  if (!res.ok) {
    throw new Error(
      errorMessage(body, NOTIFICATIONS_UI_COPY_FA.errorRetry),
    );
  }
  if (!body.data?.notification) {
    throw new Error(NOTIFICATIONS_UI_COPY_FA.errorRetry);
  }
  return body.data.notification;
}
