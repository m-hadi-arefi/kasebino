import { describe, expect, it } from "vitest";
import { MULTI_STORE, STOREFRONT_URL } from "../../architecture/product/index.js";
import {
  LOYALTY_EXPIRY_POLICY,
  MONETIZATION_POLICY,
  MVP_POLICIES,
  OFFLINE_CONFLICT_POLICY,
  PHONE_CONSENT_POLICY,
  PICKUP_TIMER_POLICY,
  POS_TENDER_POLICY,
  STORE_MAP_POLICY,
  STOREFRONT_URL_POLICY,
  VENDOR_POLICY,
  assertCustomerOtpConsent,
  assertPosTenderType,
  buildStorefrontPath,
  readyHoldShouldExpire,
  unpaidOrderShouldAutoCancel,
} from "./index.js";

describe("ADR-091 MVP product policies", () => {
  it("enables full multi-store with store-scoped inventory/membership/loyalty", () => {
    expect(MVP_POLICIES.multiStore.enabledInMvp).toBe(true);
    expect(MVP_POLICIES.multiStore).toMatchObject(MULTI_STORE);
    expect(MVP_POLICIES.multiStore.inventoryScopedTo).toBe("store");
    expect(MVP_POLICIES.multiStore.membershipScopedTo).toBe("store");
  });

  it("defaults loyalty expiry to 12 months after last earn", () => {
    expect(LOYALTY_EXPIRY_POLICY.defaultMonthsAfterLastEarn).toBe(12);
    expect(LOYALTY_EXPIRY_POLICY.ledgerAppendOnly).toBe(true);
    expect(LOYALTY_EXPIRY_POLICY.expiryEventName).toBe("PointsExpired");
  });

  it("uses POS notice-continue consent and explicit PWA checkbox", () => {
    expect(PHONE_CONSENT_POLICY.pos.mandatoryCheckbox).toBe(false);
    expect(PHONE_CONSENT_POLICY.pos.noticeLanguage).toBe("fa");
    expect(PHONE_CONSENT_POLICY.customerDigital.mandatoryCheckbox).toBe(true);
    expect(() => assertCustomerOtpConsent({ checkboxAccepted: true })).not.toThrow();
    expect(() => assertCustomerOtpConsent({ checkboxAccepted: false })).toThrow(
      /checkbox/i,
    );
  });

  it("records POS tender as cash | card_terminal | mixed with Persian labels", () => {
    expect(POS_TENDER_POLICY.allowed).toEqual(["cash", "card_terminal", "mixed"]);
    expect(POS_TENDER_POLICY.cardAcquiringInScope).toBe(false);
    expect(POS_TENDER_POLICY.persianLabels.cash).toBe("نقد");
    expect(POS_TENDER_POLICY.persianLabels.card_terminal).toBe("کارت‌خوان");
    expect(() => assertPosTenderType("cash")).not.toThrow();
    expect(() => assertPosTenderType("crypto")).toThrow(/Unknown POS tender/i);
  });

  it("applies pickup unpaid 30m and ready-hold 24h timers without silent refund", () => {
    expect(PICKUP_TIMER_POLICY.unpaidPendingPaymentTimeoutMinutes).toBe(30);
    expect(PICKUP_TIMER_POLICY.readyForPickupHoldHours).toBe(24);
    expect(PICKUP_TIMER_POLICY.noShowSilentRefund).toBe(false);
    expect(unpaidOrderShouldAutoCancel(29)).toBe(false);
    expect(unpaidOrderShouldAutoCancel(30)).toBe(true);
    expect(readyHoldShouldExpire(23)).toBe(false);
    expect(readyHoldShouldExpire(24)).toBe(true);
  });

  it("uses path-based storefront URLs only in MVP", () => {
    expect(STOREFRONT_URL_POLICY.strategy).toBe(STOREFRONT_URL.strategy);
    expect(STOREFRONT_URL_POLICY.subdomainsInMvp).toBe(false);
    expect(buildStorefrontPath("nanvai-ali")).toBe("/s/nanvai-ali");
  });

  it("presents static map plus navigate deep links", () => {
    expect(STORE_MAP_POLICY.presentation).toBe("static_map_image_plus_navigate");
    expect(STORE_MAP_POLICY.interactiveEmbedMandatory).toBe(false);
    expect(STORE_MAP_POLICY.navigateDeepLinks).toContain("neshan");
  });

  it("keeps SMS/PSP Proposed as ports and mocks only", () => {
    expect(VENDOR_POLICY.decisionStatus).toBe("proposed");
    expect(VENDOR_POLICY.implementationAllowed).toBe("ports_and_mocks_only");
  });

  it("keeps Kerman pilot free with Persian pilot copy", () => {
    expect(MONETIZATION_POLICY.chargeSaasFeeInPilot).toBe(false);
    expect(MONETIZATION_POLICY.chargeTxFeeInPilot).toBe(false);
    expect(MONETIZATION_POLICY.persianPilotCopy).toBe("پایلوت رایگان کرمان");
  });

  it("restates offline stock conflicts as reject-and-review", () => {
    expect(OFFLINE_CONFLICT_POLICY.stockShortageConflict).toBe("reject_and_review");
    expect(OFFLINE_CONFLICT_POLICY.idempotentSyncKeys).toBe(true);
  });
});
