/**
 * NotificationRepository port (ADR-090). No Drizzle types across boundary.
 */

import type { Notification, NotificationType } from "./notification.js";
import type { NotificationChannel } from "../../../notifications-architecture/index.js";

export type ListNotificationsFilter = {
  merchantId: string;
  userId?: string | null;
  unreadOnly?: boolean;
  channel?: NotificationChannel;
  limit?: number;
};

export type NotificationRepository = {
  save(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  /**
   * Idempotency for outbox at-least-once: one row per source event + channel.
   */
  findBySourceEventId(
    sourceEventId: string,
    channel: NotificationChannel,
  ): Promise<Notification | null>;
  list(filter: ListNotificationsFilter): Promise<Notification[]>;
  countUnread(merchantId: string, userId?: string | null): Promise<number>;
};

export type { NotificationType };
