import { describe, expect, it } from "vitest";
import {
  assertFeatureEnabled,
  evaluateFeatureFlag,
  getMerchantFeatureFlags,
} from "./application/feature-flags.js";
import {
  createMerchantSubscriptionAggregate,
  FEATURE_NAMES_FA,
  PLAN_NAMES_FA,
} from "./domain/subscription.js";

describe("ADR-153: Feature Flags Evaluator Service", () => {
  it("has correct Persian labels for plans and features (Iranian First)", () => {
    expect(PLAN_NAMES_FA.pilot).toBe("پایلوت رایگان");
    expect(PLAN_NAMES_FA.free).toBe("رایگان پایه");
    expect(PLAN_NAMES_FA.pro).toBe("حرفه‌ای");
    expect(PLAN_NAMES_FA.enterprise).toBe("سازمانی");

    expect(FEATURE_NAMES_FA.advanced_analytics).toBe("گزارش‌ها و تحلیل پیشرفته");
    expect(FEATURE_NAMES_FA.sms_campaigns).toBe("ارسال پیامک و کمپین‌های بازاریابی");
    expect(FEATURE_NAMES_FA.multi_store).toBe("مدیریت چندشعبه‌ای");
  });

  it("enables all features by default for pilot tier (Phase 1 Kerman Pilot)", () => {
    const subscription = createMerchantSubscriptionAggregate({
      id: "sub-1",
      merchantId: "m-1",
      planCode: "pilot",
    });

    expect(subscription.feeBps).toBe(0);
    expect(evaluateFeatureFlag(subscription, "advanced_analytics")).toBe(true);
    expect(evaluateFeatureFlag(subscription, "sms_campaigns")).toBe(true);
    expect(evaluateFeatureFlag(subscription, "multi_store")).toBe(true);
    expect(evaluateFeatureFlag(subscription, "loyalty_advanced")).toBe(true);
    expect(evaluateFeatureFlag(subscription, "custom_receipts")).toBe(true);
    expect(evaluateFeatureFlag(subscription, "accounting_sync")).toBe(true);
    expect(evaluateFeatureFlag(subscription, "inventory_valuation")).toBe(true);

    const allFlags = getMerchantFeatureFlags(subscription);
    expect(allFlags.advanced_analytics).toBe(true);
    expect(allFlags.sms_campaigns).toBe(true);
  });

  it("defaults to pilot features when subscription is null (Phase 1 default)", () => {
    expect(evaluateFeatureFlag(null, "advanced_analytics")).toBe(true);
    expect(evaluateFeatureFlag(null, "sms_campaigns")).toBe(true);
  });

  it("restricts premium features on free plan", () => {
    const subscription = createMerchantSubscriptionAggregate({
      id: "sub-2",
      merchantId: "m-2",
      planCode: "free",
    });

    expect(evaluateFeatureFlag(subscription, "custom_receipts")).toBe(true);
    expect(evaluateFeatureFlag(subscription, "advanced_analytics")).toBe(false);
    expect(evaluateFeatureFlag(subscription, "sms_campaigns")).toBe(false);
    expect(evaluateFeatureFlag(subscription, "multi_store")).toBe(false);
    expect(evaluateFeatureFlag(subscription, "accounting_sync")).toBe(false);
  });

  it("enables pro features on pro plan", () => {
    const subscription = createMerchantSubscriptionAggregate({
      id: "sub-3",
      merchantId: "m-3",
      planCode: "pro",
    });

    expect(evaluateFeatureFlag(subscription, "advanced_analytics")).toBe(true);
    expect(evaluateFeatureFlag(subscription, "sms_campaigns")).toBe(true);
    expect(evaluateFeatureFlag(subscription, "inventory_valuation")).toBe(true);
    // multi_store and accounting_sync are enterprise only
    expect(evaluateFeatureFlag(subscription, "multi_store")).toBe(false);
    expect(evaluateFeatureFlag(subscription, "accounting_sync")).toBe(false);
  });

  it("falls back to free tier when subscription has expired", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    const subscription = createMerchantSubscriptionAggregate({
      id: "sub-4",
      merchantId: "m-4",
      planCode: "enterprise",
      expiresAt: past,
    });

    expect(evaluateFeatureFlag(subscription, "advanced_analytics")).toBe(false);
    expect(evaluateFeatureFlag(subscription, "custom_receipts")).toBe(true);
  });

  it("throws MerchantDomainError when feature is not enabled", () => {
    const subscription = createMerchantSubscriptionAggregate({
      id: "sub-5",
      merchantId: "m-5",
      planCode: "free",
    });

    expect(() =>
      assertFeatureEnabled(subscription, "advanced_analytics"),
    ).toThrow("این قابلیت در طرح فعلی اشتراک فعال نیست.");
  });
});
