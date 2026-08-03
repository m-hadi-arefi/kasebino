import { createDomainEvent } from "../../../shared/ddd/index.js";
import type { NotificationType } from "./notification.js";

export function notificationCreatedEvent(input: {
  notificationId: string;
  merchantId: string;
  storeId: string | null;
  userId: string | null;
  type: NotificationType;
  channel: "in_app" | "sms";
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "NotificationCreated",
    aggregateId: input.notificationId,
    aggregateType: "Notification",
    payload: {
      notificationId: input.notificationId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      userId: input.userId,
      type: input.type,
      channel: input.channel,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
