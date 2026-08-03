/**
 * Notification aggregate (ADR-090) — persisted in-app alert (+ optional SMS audit).
 * Titles/bodies are Persian (`fa-IR`) by default.
 */

import type {
  NotificationAudience,
  NotificationChannel,
} from "../../../notifications-architecture/index.js";

export type NotificationType =
  | "order_created"
  | "order_ready_for_pickup"
  | "inventory_low"
  | "inventory_depleted"
  | "otp"
  | "generic";

export type Notification = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string | null;
  /** Staff/customer recipient; null = merchant/store broadcast. */
  readonly userId: string | null;
  readonly audience: NotificationAudience;
  readonly channel: NotificationChannel;
  readonly type: NotificationType;
  readonly titleFa: string;
  readonly bodyFa: string;
  readonly sourceEventId: string | null;
  readonly sourceEventType: string | null;
  readAt: Date | null;
  readonly createdAt: Date;
};

export type CreateNotificationInput = {
  id: string;
  merchantId: string;
  storeId?: string | null;
  userId?: string | null;
  audience: NotificationAudience;
  channel: NotificationChannel;
  type: NotificationType;
  titleFa: string;
  bodyFa: string;
  sourceEventId?: string | null;
  sourceEventType?: string | null;
  now?: Date;
};

export function createNotification(input: CreateNotificationInput): Notification {
  if (!input.merchantId.trim()) throw new Error("INVALID_MERCHANT");
  if (!input.titleFa.trim()) throw new Error("INVALID_TITLE");
  if (!input.bodyFa.trim()) throw new Error("INVALID_BODY");

  const now = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    userId: input.userId ?? null,
    audience: input.audience,
    channel: input.channel,
    type: input.type,
    titleFa: input.titleFa,
    bodyFa: input.bodyFa,
    sourceEventId: input.sourceEventId ?? null,
    sourceEventType: input.sourceEventType ?? null,
    readAt: null,
    createdAt: now,
  };
}

export function markNotificationRead(
  notification: Notification,
  at: Date = new Date(),
): void {
  if (notification.readAt !== null) return; // idempotent
  notification.readAt = at;
}

export function isNotificationUnread(notification: Notification): boolean {
  return notification.readAt === null;
}
