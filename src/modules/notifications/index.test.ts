/**
 * ADR-090 Notifications module tests.
 */

import { describe, expect, it } from "vitest";

import { createEventEnvelope } from "../../event-driven/index.js";
import {
  InMemoryOutboxStore,
  InMemoryProcessedSet,
  createOutboxWorker,
} from "../../outbox/index.js";

import {
  ConsoleSmsNotificationChannel,
  InMemoryNotificationRepository,
  MockSmsNotificationChannel,
  NOTIFICATION_TEMPLATES_FA,
  NOTIFICATIONS_DECISION,
  NOTIFICATIONS_ERROR_MESSAGES_FA,
  NotificationsDomainError,
  PersistInAppNotificationChannel,
  SMS_LENGTH_BUDGET,
  assertNeverLogOtpCodes,
  createNotificationsOutboxHandler,
  createNotificationsUseCases,
  isSmsLengthConscious,
  redactOtpCodesForLogs,
} from "./index.js";

function createHarness() {
  const notifications = new InMemoryNotificationRepository();
  const sms = new MockSmsNotificationChannel();
  const inApp = new PersistInAppNotificationChannel(notifications);
  let seq = 0;
  const useCases = createNotificationsUseCases({
    notifications,
    inAppChannel: inApp,
    smsChannel: sms,
    idFactory: () => `ntf-${++seq}`,
  });
  return { notifications, sms, useCases };
}

function envelope(input: {
  eventType: string;
  eventId?: string;
  merchantId?: string;
  storeId?: string | null;
  payload?: Record<string, unknown>;
}) {
  return createEventEnvelope({
    eventType: input.eventType,
    eventId: input.eventId ?? `evt-${input.eventType}-${Math.random()}`,
    merchantId: input.merchantId ?? "m1",
    storeId: input.storeId ?? "s1",
    payload: input.payload ?? {},
    payloadVersion: 1,
    occurredAt: new Date("2026-08-03T12:00:00.000Z"),
  });
}

describe("ADR-090 Notifications module", () => {
  it("creates in-app notification from OrderCreated via outbox consumer", async () => {
    const { useCases, notifications } = createHarness();
    const store = new InMemoryOutboxStore();
    const processed = new InMemoryProcessedSet();
    const worker = createOutboxWorker({
      store,
      processed,
      handlers: {
        notifications: createNotificationsOutboxHandler({ useCases }),
      },
      consumers: ["notifications"],
    });

    const env = envelope({
      eventType: "OrderCreated",
      eventId: "evt-order-1",
      payload: { orderId: "ord-1", storeId: "s1" },
    });
    await store.enqueue({ envelope: env, aggregateId: "ord-1" });
    const result = await worker.dispatchOnce();

    expect(result.published).toBe(1);
    const listed = await useCases.list({ merchantId: "m1" });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.type).toBe("order_created");
    expect(listed[0]?.titleFa).toMatch(/[\u0600-\u06FF]/);
    expect(listed[0]?.bodyFa).toMatch(/[\u0600-\u06FF]/);
    expect(listed[0]?.channel).toBe("in_app");
    expect(listed[0]?.sourceEventId).toBe("evt-order-1");
    expect(notifications).toBeTruthy();
    expect(NOTIFICATIONS_DECISION.neverBlockCoreTx).toBe(true);
  });

  it("is idempotent for the same sourceEventId (at-least-once)", async () => {
    const { useCases } = createHarness();
    const env = envelope({
      eventType: "InventoryLowDetected",
      eventId: "evt-low-1",
      payload: { productId: "p1", quantity: 2, reorderLevel: 5 },
    });
    const first = await useCases.createFromEnvelope(env);
    const second = await useCases.createFromEnvelope(env);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.notification?.id).toBe(first.notification?.id);
    const listed = await useCases.list({ merchantId: "m1" });
    expect(listed).toHaveLength(1);
  });

  it("maps InventoryLow catalog alias and OrderReadyForPickup SMS when phone present", async () => {
    const { useCases, sms } = createHarness();

    // Catalog alias may appear on the wire without past-tense mint (resolve in consumer).
    const aliasEnvelope = {
      eventId: "evt-alias-1",
      eventType: "InventoryLow",
      occurredAt: "2026-08-03T12:00:00.000Z",
      merchantId: "m1",
      storeId: "s1",
      actorId: null,
      correlationId: "corr-alias-1",
      causationId: null,
      payloadVersion: 1,
      payload: { productId: "p2" },
    };
    const alias = await useCases.createFromEnvelope(aliasEnvelope);
    expect(alias.created).toBe(true);
    expect(alias.eventType).toBe("InventoryLowDetected");
    expect(alias.notification?.type).toBe("inventory_low");

    const ready = await useCases.createFromEnvelope(
      envelope({
        eventType: "OrderReadyForPickup",
        eventId: "evt-ready-1",
        payload: {
          orderId: "ord-2",
          phoneE164: "+989121234567",
          customerId: "c1",
        },
      }),
    );
    expect(ready.created).toBe(true);
    expect(ready.smsSent).toBe(true);
    expect(sms.sent).toHaveLength(1);
    expect(sms.last()?.bodyFa).toMatch(/[\u0600-\u06FF]/);
    expect(sms.last()?.category).toBe("transactional");
    expect(isSmsLengthConscious(sms.last()!.bodyFa)).toBe(true);
    expect(
      NOTIFICATION_TEMPLATES_FA.order_ready_for_pickup.smsFa.length,
    ).toBeLessThanOrEqual(SMS_LENGTH_BUDGET.hardWarnChars);
  });

  it("lists and marks read with tenant isolation", async () => {
    const { useCases } = createHarness();
    await useCases.createFromEnvelope(
      envelope({
        eventType: "InventoryDepleted",
        eventId: "evt-dep-1",
        payload: { productId: "p3" },
      }),
    );
    const listed = await useCases.list({ merchantId: "m1", unreadOnly: true });
    expect(listed).toHaveLength(1);
    const marked = await useCases.markRead({
      merchantId: "m1",
      notificationId: listed[0]!.id,
    });
    expect(marked.readAt).not.toBeNull();
    expect(await useCases.countUnread("m1")).toBe(0);

    await expect(
      useCases.markRead({
        merchantId: "other-merchant",
        notificationId: listed[0]!.id,
      }),
    ).rejects.toMatchObject({
      code: "CROSS_TENANT_FORBIDDEN",
      messageFa: NOTIFICATIONS_ERROR_MESSAGES_FA.CROSS_TENANT_FORBIDDEN,
    });
    expect(() => {
      throw new NotificationsDomainError("NOTIFICATION_NOT_FOUND");
    }).toThrow(/پیدا نشد/);
  });

  it("OTP SMS console adapter never logs codes", async () => {
    const lines: string[] = [];
    const consoleSms = new ConsoleSmsNotificationChannel((line) => {
      lines.push(line);
    });
    const notifications = new InMemoryNotificationRepository();
    const useCases = createNotificationsUseCases({
      notifications,
      inAppChannel: new PersistInAppNotificationChannel(notifications),
      smsChannel: consoleSms,
    });

    await useCases.sendOtpSms({
      toE164: "+989121234567",
      code: "654321",
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("category=otp");
    expect(lines[0]).not.toContain("654321");
    expect(lines[0]).toContain(redactOtpCodesForLogs("654321"));
    expect(() => assertNeverLogOtpCodes(lines[0]!)).not.toThrow();
    expect(NOTIFICATION_TEMPLATES_FA.otp.smsFa).toContain("{code}");
    expect(NOTIFICATION_TEMPLATES_FA.otp.smsFa).toMatch(/[\u0600-\u06FF]/);
  });

  it("skips unmapped events without creating rows", async () => {
    const { useCases } = createHarness();
    const result = await useCases.createFromEnvelope(
      envelope({ eventType: "SaleCompleted", eventId: "evt-sale-1" }),
    );
    expect(result.skipped).toBe(true);
    expect(result.created).toBe(false);
    expect(await useCases.list({ merchantId: "m1" })).toHaveLength(0);
  });
});
