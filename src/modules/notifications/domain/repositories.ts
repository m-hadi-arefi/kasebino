/**
 * NotificationRepository port (ADR-090). No Drizzle types across boundary.
 */

import type { Notification, NotificationType } from "./notification.js";
import type {
  NotificationAudience,
  NotificationChannel,
} from "../../../notifications-architecture/index.js";

export type ListNotificationsFilter = {
  merchantId: string;
  userId?: string | null;
  /**
   * When set, include broadcast (null userId) OR any matching recipient id
   * (customer identity id and/or store membership.customerId).
   */
  recipientUserIds?: string[];
  /** When set, only that audience (merchant | customer). */
  audience?: NotificationAudience;
  /** Optional store scope for multi-store merchants / customer portal. */
  storeId?: string | null;
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
  countUnread(
    merchantId: string,
    userId?: string | null,
    audience?: NotificationAudience,
    options?: {
      recipientUserIds?: string[];
      storeId?: string | null;
    },
  ): Promise<number>;
};

export type { NotificationType };
