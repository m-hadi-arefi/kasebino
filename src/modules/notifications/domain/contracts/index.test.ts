/**
 * ADR-090 Notifications architecture contract tests.
 */

import { describe, expect, it } from "vitest";

import { OUTBOX_CONSUMERS } from "../../../../events/contracts/event-driven/index.js";

import {
  NOTIFICATIONS_ARCHITECTURE,
  NOTIFICATIONS_API,
  NOTIFICATIONS_DECISION,
  NOTIFICATIONS_PLACEMENT,
  NOTIFICATIONS_UX_FA,
  NOTIFICATION_MVP_EVENTS,
  NOTIFICATION_OTP_LOG_POLICY,
  SMS_CAMPAIGN_STUB,
  assertNeverBlockCoreTx,
  assertNeverLogOtpCodes,
  redactOtpCodesForLogs,
} from "./index.js";

describe("ADR-090 Notification Architecture contract", () => {
  it("locks persisted in-app + SMS ports; campaigns later; never block TX", () => {
    expect(NOTIFICATIONS_DECISION.pattern).toBe(
      "persisted_in_app_plus_sms_ports",
    );
    expect(NOTIFICATIONS_DECISION.persistInApp).toBe(true);
    expect(NOTIFICATIONS_DECISION.smsCampaignsEnabled).toBe(false);
    expect(NOTIFICATIONS_DECISION.smsCampaigns).toBe("later_via_credits");
    expect(NOTIFICATIONS_DECISION.neverBlockCoreTx).toBe(true);
    expect(NOTIFICATIONS_DECISION.neverBlockCheckout).toBe(true);
    expect(NOTIFICATIONS_DECISION.outboxConsumer).toBe("notifications");
    expect(NOTIFICATIONS_DECISION.detailAdr).toBe("ADR-090");
    expect(SMS_CAMPAIGN_STUB.enabled).toBe(false);
    expect(SMS_CAMPAIGN_STUB.requiresCredits).toBe(true);

    expect(() => assertNeverBlockCoreTx(false)).not.toThrow();
    expect(() => assertNeverBlockCoreTx(true)).toThrow(/never block/i);
  });

  it("aligns outbox consumer placement with event-driven spine", () => {
    expect(NOTIFICATIONS_PLACEMENT.outboxConsumer).toBe("notifications");
    expect(NOTIFICATIONS_PLACEMENT.package).toBe(
      "src/modules/notifications/domain/contracts/",
    );
    expect(NOTIFICATIONS_PLACEMENT.module).toBe("src/modules/notifications/");
    expect(OUTBOX_CONSUMERS.notifications.onCriticalPath).toBe(false);
    expect(OUTBOX_CONSUMERS.notifications.spineFeed).toBe("notifications");
    expect(NOTIFICATION_MVP_EVENTS).toEqual([
      "OrderCreated",
      "OrderReadyForPickup",
      "InventoryLowDetected",
      "InventoryDepleted",
    ]);
    expect(NOTIFICATIONS_ARCHITECTURE.placement.detailAdr).toBe("ADR-090");
  });

  it("ships Persian RTL UX contract and API path reserves", () => {
    expect(NOTIFICATIONS_UX_FA.locale).toBe("fa-IR");
    expect(NOTIFICATIONS_UX_FA.dir).toBe("rtl");
    expect(NOTIFICATIONS_UX_FA.drawerTitle).toMatch(/[\u0600-\u06FF]/);
    expect(NOTIFICATIONS_UX_FA.emptyState).toMatch(/[\u0600-\u06FF]/);
    expect(NOTIFICATIONS_API.listPath).toBe("/api/v1/notifications");
    expect(NOTIFICATIONS_API.markReadPathTemplate).toBe(
      "/api/v1/notifications/:id/read",
    );
  });

  it("never logs OTP codes — redacts digit runs", () => {
    expect(NOTIFICATION_OTP_LOG_POLICY.neverLogOtpCodes).toBe(true);
    const raw = "کد تأیید کسبینو: 123456";
    const redacted = redactOtpCodesForLogs(raw);
    expect(redacted).not.toMatch(/\d{4,8}/);
    expect(redacted).toContain(NOTIFICATION_OTP_LOG_POLICY.redactionToken);
    expect(() => assertNeverLogOtpCodes(redacted)).not.toThrow();
    expect(() => assertNeverLogOtpCodes(raw)).toThrow(/OTP/i);
  });
});
