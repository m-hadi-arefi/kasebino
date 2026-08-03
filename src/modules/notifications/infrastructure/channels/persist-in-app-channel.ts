/**
 * In-app channel adapter — persists via NotificationRepository (ADR-090).
 */

import type { Notification } from "../../domain/notification.js";
import type { NotificationRepository } from "../../domain/repositories.js";
import type { InAppNotificationChannelPort } from "../../application/ports/in-app-channel.js";

export class PersistInAppNotificationChannel
  implements InAppNotificationChannelPort
{
  constructor(private readonly notifications: NotificationRepository) {}

  async deliver(notification: Notification): Promise<void> {
    await this.notifications.save(notification);
  }
}
