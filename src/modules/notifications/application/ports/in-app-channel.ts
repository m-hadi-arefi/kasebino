/**
 * In-app notification delivery port (ADR-090).
 * Default adapter persists via NotificationRepository.
 * Realtime fan-out stays on EMQX `notifications` topic (ADR-038).
 */

import type { Notification } from "../../domain/notification.js";

export type InAppNotificationChannelPort = {
  deliver(notification: Notification): Promise<void>;
};
