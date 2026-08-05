/**
 * In-memory NotificationRepository for unit tests / local wiring until Drizzle.
 */

import type { Notification } from "../../domain/notification.js";
import type {
  ListNotificationsFilter,
  NotificationRepository,
} from "../../domain/repositories.js";
import type {
  NotificationAudience,
  NotificationChannel,
} from "../../../../notifications-architecture/index.js";

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly byId = new Map<string, Notification>();

  private sourceKey(sourceEventId: string, channel: NotificationChannel): string {
    return `${channel}::${sourceEventId}`;
  }

  async save(notification: Notification): Promise<void> {
    this.byId.set(notification.id, notification);
  }

  async update(notification: Notification): Promise<void> {
    this.byId.set(notification.id, notification);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySourceEventId(
    sourceEventId: string,
    channel: NotificationChannel,
  ): Promise<Notification | null> {
    const key = this.sourceKey(sourceEventId, channel);
    for (const row of this.byId.values()) {
      if (
        row.sourceEventId === sourceEventId &&
        row.channel === channel
      ) {
        void key;
        return row;
      }
    }
    return null;
  }

  async list(filter: ListNotificationsFilter): Promise<Notification[]> {
    const limit = filter.limit ?? 50;
    const rows = [...this.byId.values()]
      .filter((n) => {
        if (n.merchantId !== filter.merchantId) return false;
        if (filter.channel !== undefined && n.channel !== filter.channel) {
          return false;
        }
        if (filter.audience !== undefined && n.audience !== filter.audience) {
          return false;
        }
        if (filter.storeId !== undefined) {
          if (
            n.storeId !== null &&
            filter.storeId !== null &&
            n.storeId !== filter.storeId
          ) {
            return false;
          }
        }
        if (filter.recipientUserIds !== undefined) {
          if (
            n.userId !== null &&
            !filter.recipientUserIds.includes(n.userId)
          ) {
            return false;
          }
        } else if (filter.userId !== undefined) {
          // Include broadcast (null userId) + exact recipient matches.
          if (n.userId !== null && n.userId !== filter.userId) return false;
        }
        if (filter.unreadOnly && n.readAt !== null) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return rows.slice(0, limit);
  }

  async countUnread(
    merchantId: string,
    userId?: string | null,
    audience?: NotificationAudience,
    options?: {
      recipientUserIds?: string[];
      storeId?: string | null;
    },
  ): Promise<number> {
    const rows = await this.list({
      merchantId,
      unreadOnly: true,
      channel: "in_app",
      limit: 10_000,
      ...(userId !== undefined ? { userId } : {}),
      ...(audience !== undefined ? { audience } : {}),
      ...(options?.recipientUserIds !== undefined
        ? { recipientUserIds: options.recipientUserIds }
        : {}),
      ...(options?.storeId !== undefined ? { storeId: options.storeId } : {}),
    });
    return rows.length;
  }

  clear(): void {
    this.byId.clear();
  }
}
