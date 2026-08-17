import { randomUUID } from "node:crypto";

import {
  NOTIFICATION_EVENT_ALIASES,
  NOTIFICATION_MVP_EVENTS,
  SMS_CAMPAIGN_STUB,
  type NotificationMvpEvent,
} from "../domain/contracts/index.js";
import type { EventEnvelope } from "../../../events/contracts/event-driven/index.js";
import {
  createNotification,
  markNotificationRead,
  type Notification,
  type NotificationRepository,
  type NotificationType,
  notificationCreatedEvent,
} from "../domain/index.js";
import { NotificationsDomainError } from "./errors.js";
import type { InAppNotificationChannelPort } from "./ports/in-app-channel.js";
import type { SmsNotificationChannelPort } from "./ports/sms-channel.js";
import {
  NOTIFICATION_TEMPLATES_FA,
  renderTemplate,
} from "./templates.js";

export type NotificationsUseCaseDeps = {
  notifications: NotificationRepository;
  inAppChannel: InAppNotificationChannelPort;
  smsChannel?: SmsNotificationChannelPort;
  now?: () => Date;
  idFactory?: () => string;
};

export type ListNotificationsInput = {
  merchantId: string;
  userId?: string | null;
  recipientUserIds?: string[];
  storeId?: string | null;
  audience?: "merchant" | "customer";
  unreadOnly?: boolean;
  limit?: number;
};

export type MarkReadInput = {
  merchantId: string;
  notificationId: string;
  /** When set, recipient or broadcast only (customer portal). */
  userId?: string | null;
  recipientUserIds?: string[];
  audience?: "merchant" | "customer";
};

export type SendOtpSmsInput = {
  toE164: string;
  code: string;
  merchantId?: string;
  storeId?: string | null;
};

export type CreateFromEventResult = {
  created: boolean;
  notification: Notification | null;
  smsSent: boolean;
  skipped: boolean;
  eventType: string;
};

type PayloadRecord = Record<string, unknown>;

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value;
  return null;
}

function resolveEventType(eventType: string): string {
  const aliases = NOTIFICATION_EVENT_ALIASES as Record<string, string>;
  return aliases[eventType] ?? eventType;
}

function isMvpEvent(eventType: string): eventType is NotificationMvpEvent {
  return (NOTIFICATION_MVP_EVENTS as readonly string[]).includes(eventType);
}

function mapEventToTemplate(
  eventType: NotificationMvpEvent,
): {
  type: NotificationType;
  titleFa: string;
  bodyFa: string;
  smsFa: string;
  audience: "merchant" | "customer";
  preferSms: boolean;
} {
  switch (eventType) {
    case "OrderCreated":
      return {
        ...NOTIFICATION_TEMPLATES_FA.order_created,
        audience: "merchant",
        preferSms: false,
      };
    case "OrderReadyForPickup":
      return {
        ...NOTIFICATION_TEMPLATES_FA.order_ready_for_pickup,
        audience: "customer",
        preferSms: true,
      };
    case "InventoryLowDetected":
      return {
        ...NOTIFICATION_TEMPLATES_FA.inventory_low,
        audience: "merchant",
        preferSms: false,
      };
    case "InventoryDepleted":
      return {
        ...NOTIFICATION_TEMPLATES_FA.inventory_depleted,
        audience: "merchant",
        preferSms: false,
      };
    default: {
      const _exhaustive: never = eventType;
      throw new Error(`Unhandled notification event: ${_exhaustive}`);
    }
  }
}

function mapDomainThrow(error: unknown): never {
  if (error instanceof NotificationsDomainError) throw error;
  if (error instanceof Error) {
    switch (error.message) {
      case "INVALID_MERCHANT":
        throw new NotificationsDomainError("INVALID_MERCHANT");
      case "INVALID_TITLE":
        throw new NotificationsDomainError("INVALID_TITLE");
      case "INVALID_BODY":
        throw new NotificationsDomainError("INVALID_BODY");
      default:
        break;
    }
  }
  throw error;
}

export type NotificationsUseCases = ReturnType<typeof createNotificationsUseCases>;

export function createNotificationsUseCases(deps: NotificationsUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  async function createFromEnvelope(
    envelope: EventEnvelope,
  ): Promise<CreateFromEventResult> {
    const resolved = resolveEventType(envelope.eventType);
    if (!isMvpEvent(resolved)) {
      return {
        created: false,
        notification: null,
        smsSent: false,
        skipped: true,
        eventType: envelope.eventType,
      };
    }

    const existing = await deps.notifications.findBySourceEventId(
      envelope.eventId,
      "in_app",
    );
    if (existing) {
      return {
        created: false,
        notification: existing,
        smsSent: false,
        skipped: false,
        eventType: resolved,
      };
    }

    const mapped = mapEventToTemplate(resolved);
    const payload = envelope.payload as PayloadRecord;
    const storeId =
      asString(payload.storeId) ?? envelope.storeId ?? null;
    const userId = asString(payload.userId) ?? asString(payload.customerId);

    let notification: Notification;
    try {
      notification = createNotification({
        id: idFactory(),
        merchantId: envelope.merchantId,
        storeId,
        userId,
        audience: mapped.audience,
        channel: "in_app",
        type: mapped.type,
        titleFa: mapped.titleFa,
        bodyFa: mapped.bodyFa,
        sourceEventId: envelope.eventId,
        sourceEventType: resolved,
        now: now(),
      });
    } catch (error) {
      mapDomainThrow(error);
    }

    await deps.inAppChannel.deliver(notification);

    let smsSent = false;
    const phoneE164 = asString(payload.phoneE164) ?? asString(payload.toE164);
    if (
      mapped.preferSms &&
      phoneE164 &&
      deps.smsChannel &&
      !SMS_CAMPAIGN_STUB.enabled
    ) {
      await deps.smsChannel.send({
        toE164: phoneE164,
        bodyFa: mapped.smsFa,
        category: "transactional",
        merchantId: envelope.merchantId,
        storeId,
      });
      smsSent = true;
    }

    void notificationCreatedEvent({
      notificationId: notification.id,
      merchantId: notification.merchantId,
      storeId: notification.storeId,
      userId: notification.userId,
      type: notification.type,
      channel: "in_app",
      occurredAt: notification.createdAt,
    });

    return {
      created: true,
      notification,
      smsSent,
      skipped: false,
      eventType: resolved,
    };
  }

  return {
    async list(input: ListNotificationsInput): Promise<Notification[]> {
      if (!input.merchantId.trim()) {
        throw new NotificationsDomainError("INVALID_MERCHANT");
      }
      return deps.notifications.list({
        merchantId: input.merchantId,
        channel: "in_app",
        limit: input.limit ?? 50,
        ...(input.userId !== undefined ? { userId: input.userId } : {}),
        ...(input.recipientUserIds !== undefined
          ? { recipientUserIds: input.recipientUserIds }
          : {}),
        ...(input.storeId !== undefined ? { storeId: input.storeId } : {}),
        ...(input.audience !== undefined ? { audience: input.audience } : {}),
        ...(input.unreadOnly !== undefined
          ? { unreadOnly: input.unreadOnly }
          : {}),
      });
    },

    async markRead(input: MarkReadInput): Promise<Notification> {
      if (!input.merchantId.trim()) {
        throw new NotificationsDomainError("INVALID_MERCHANT");
      }
      const row = await deps.notifications.findById(input.notificationId);
      if (!row) throw new NotificationsDomainError("NOTIFICATION_NOT_FOUND");
      if (row.merchantId !== input.merchantId) {
        throw new NotificationsDomainError("CROSS_TENANT_FORBIDDEN");
      }
      if (input.audience !== undefined && row.audience !== input.audience) {
        throw new NotificationsDomainError("CROSS_TENANT_FORBIDDEN");
      }
      const allowedRecipients =
        input.recipientUserIds ??
        (input.userId !== undefined && input.userId !== null
          ? [input.userId]
          : undefined);
      if (
        allowedRecipients !== undefined &&
        row.userId !== null &&
        !allowedRecipients.includes(row.userId)
      ) {
        throw new NotificationsDomainError("CROSS_TENANT_FORBIDDEN");
      }
      markNotificationRead(row, now());
      await deps.notifications.update(row);
      return row;
    },

    async countUnread(
      merchantId: string,
      userId?: string | null,
      audience?: "merchant" | "customer",
      options?: {
        recipientUserIds?: string[];
        storeId?: string | null;
      },
    ): Promise<number> {
      if (!merchantId.trim()) {
        throw new NotificationsDomainError("INVALID_MERCHANT");
      }
      return deps.notifications.countUnread(
        merchantId,
        userId,
        audience,
        options,
      );
    },

    /**
     * OTP SMS helper — sends via SMS port; callers must not log `code`.
     * Body uses Persian OTP template; console adapters redact digits.
     */
    async sendOtpSms(input: SendOtpSmsInput): Promise<void> {
      if (!deps.smsChannel) {
        throw new NotificationsDomainError("SMS_SEND_FAILED");
      }
      if (!input.toE164.trim() || !input.code.trim()) {
        throw new NotificationsDomainError("INVALID_PHONE");
      }
      const bodyFa = renderTemplate(NOTIFICATION_TEMPLATES_FA.otp.smsFa, {
        code: input.code,
      });
      await deps.smsChannel.send({
        toE164: input.toE164,
        bodyFa,
        category: "otp",
        storeId: input.storeId ?? null,
        ...(input.merchantId !== undefined
          ? { merchantId: input.merchantId }
          : {}),
      });
    },

    createFromEnvelope,
  };
}
