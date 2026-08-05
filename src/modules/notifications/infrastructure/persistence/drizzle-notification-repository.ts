/**
 * Drizzle NotificationRepository (ADR-093 / ADR-090).
 */

import { and, desc, eq, isNull, or } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { notifications } from "../../../../infrastructure/database/schema/notifications.js";
import { assertMerchantId } from "../../../../infrastructure/persistence/helpers.js";
import type {
  NotificationAudience,
  NotificationChannel,
} from "../../../../notifications-architecture/index.js";
import type { Notification, NotificationType } from "../../domain/notification.js";
import type {
  ListNotificationsFilter,
  NotificationRepository,
} from "../../domain/repositories.js";

type Row = typeof notifications.$inferSelect;

function toNotification(row: Row): Notification {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    userId: row.userId,
    audience: row.audience as NotificationAudience,
    channel: row.channel as NotificationChannel,
    type: row.type as NotificationType,
    titleFa: row.titleFa,
    bodyFa: row.bodyFa,
    sourceEventId: row.sourceEventId,
    sourceEventType: row.sourceEventType,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleNotificationRepository implements NotificationRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(notification: Notification): Promise<void> {
    await this.db.insert(notifications).values({
      id: notification.id,
      merchantId: notification.merchantId,
      storeId: notification.storeId,
      userId: notification.userId,
      audience: notification.audience,
      channel: notification.channel,
      type: notification.type,
      titleFa: notification.titleFa,
      bodyFa: notification.bodyFa,
      sourceEventId: notification.sourceEventId,
      sourceEventType: notification.sourceEventType,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    });
  }

  async update(notification: Notification): Promise<void> {
    await this.db
      .update(notifications)
      .set({
        readAt: notification.readAt,
      })
      .where(
        and(
          eq(notifications.id, notification.id),
          eq(notifications.merchantId, notification.merchantId),
        ),
      );
  }

  async findById(id: string): Promise<Notification | null> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return rows[0] ? toNotification(rows[0]) : null;
  }

  async findBySourceEventId(
    sourceEventId: string,
    channel: NotificationChannel,
  ): Promise<Notification | null> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.sourceEventId, sourceEventId),
          eq(notifications.channel, channel),
        ),
      )
      .limit(1);
    return rows[0] ? toNotification(rows[0]) : null;
  }

  async list(filter: ListNotificationsFilter): Promise<Notification[]> {
    assertMerchantId(filter.merchantId);
    const limit = filter.limit ?? 50;
    const conditions = [eq(notifications.merchantId, filter.merchantId)];
    if (filter.channel !== undefined) {
      conditions.push(eq(notifications.channel, filter.channel));
    }
    if (filter.audience !== undefined) {
      conditions.push(eq(notifications.audience, filter.audience));
    }
    if (filter.storeId !== undefined) {
      if (filter.storeId === null) {
        conditions.push(isNull(notifications.storeId));
      } else {
        conditions.push(
          or(
            isNull(notifications.storeId),
            eq(notifications.storeId, filter.storeId),
          )!,
        );
      }
    }
    if (filter.recipientUserIds !== undefined) {
      const ids = filter.recipientUserIds.filter((id) => id.trim() !== "");
      if (ids.length === 0) {
        conditions.push(isNull(notifications.userId));
      } else {
        conditions.push(
          or(
            isNull(notifications.userId),
            ...ids.map((id) => eq(notifications.userId, id)),
          )!,
        );
      }
    } else if (filter.userId !== undefined) {
      if (filter.userId === null) {
        conditions.push(isNull(notifications.userId));
      } else {
        conditions.push(
          or(
            isNull(notifications.userId),
            eq(notifications.userId, filter.userId),
          )!,
        );
      }
    }
    if (filter.unreadOnly) {
      conditions.push(isNull(notifications.readAt));
    }
    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return rows.map(toNotification);
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
      ...(audience !== undefined ? { audience } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(options?.recipientUserIds !== undefined
        ? { recipientUserIds: options.recipientUserIds }
        : {}),
      ...(options?.storeId !== undefined ? { storeId: options.storeId } : {}),
    });
    return rows.length;
  }
}
