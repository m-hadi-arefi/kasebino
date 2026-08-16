import { describe, expect, it } from "vitest";
import { createSubscriptionUseCases } from "./application/subscription-use-cases.js";
import { createMerchantAggregate } from "./domain/merchant.js";
import {
  InMemoryMerchantCreditLedgerRepository,
  InMemoryMerchantSubscriptionRepository,
} from "./infrastructure/persistence/in-memory-subscription-repository.js";
import { InMemoryMerchantRepository } from "./infrastructure/persistence/in-memory-merchant-repository.js";

function setup() {
  const merchants = new InMemoryMerchantRepository();
  const subscriptions = new InMemoryMerchantSubscriptionRepository();
  const credits = new InMemoryMerchantCreditLedgerRepository();
  const useCases = createSubscriptionUseCases({
    merchants,
    subscriptions,
    credits,
  });
  return { merchants, subscriptions, credits, useCases };
}

describe("ADR-153: Merchant Subscription & Credit Ledger Use Cases", () => {
  it("creates and returns default pilot subscription with 0% fee rate", async () => {
    const { merchants, useCases } = setup();
    const merchant = createMerchantAggregate({
      id: "m-pilot-1",
      slug: "pilot-store",
      tradeName: "فروشگاه پایلوت کرمان",
      ownerUserId: "u-1",
    });
    await merchants.save(merchant);

    const summary = await useCases.getMerchantSubscription(merchant.id);
    expect(summary.subscription.planCode).toBe("pilot");
    expect(summary.planNameFa).toBe("پایلوت رایگان");
    expect(summary.feeBps).toBe(0);
    expect(summary.featureFlags.advanced_analytics).toBe(true);
    expect(summary.featureFlags.sms_campaigns).toBe(true);
  });

  it("assigns pro plan with custom fee percentage and feature flags", async () => {
    const { merchants, useCases } = setup();
    const merchant = createMerchantAggregate({
      id: "m-pro-1",
      slug: "pro-store",
      tradeName: "فروشگاه پرو",
      ownerUserId: "u-2",
    });
    await merchants.save(merchant);

    const updated = await useCases.assignMerchantPlan({
      merchantId: merchant.id,
      planCode: "pro",
      feeBps: 150, // 1.5%
    });

    expect(updated.subscription.planCode).toBe("pro");
    expect(updated.planNameFa).toBe("حرفه‌ای");
    expect(updated.feeBps).toBe(150);
    expect(updated.featureFlags.advanced_analytics).toBe(true);
    expect(updated.featureFlags.multi_store).toBe(false);
  });

  it("handles credit topups and balances formatted in Toman (Iranian First)", async () => {
    const { merchants, useCases } = setup();
    const merchant = createMerchantAggregate({
      id: "m-credit-1",
      slug: "credit-store",
      tradeName: "فروشگاه پیامکی",
      ownerUserId: "u-3",
    });
    await merchants.save(merchant);

    // Initial balance is 0
    let balance = await useCases.getCreditBalance(merchant.id);
    expect(balance.balanceMinor).toBe(0n);
    expect(balance.balanceToman).toBe(0n);
    expect(balance.formattedToman).toBe("۰ تومان");

    // Topup 500,000 IRR = 50,000 Tomans
    balance = await useCases.topupMerchantCredits({
      merchantId: merchant.id,
      amountMinor: 500000n,
      reason: "topup",
      referenceId: "tx-1234",
    });

    expect(balance.balanceMinor).toBe(500000n);
    expect(balance.balanceToman).toBe(50000n);
    expect(balance.formattedToman).toContain("۵۰٬۰۰۰ تومان");
  });

  it("deducts credits for SMS campaigns and throws on insufficient balance", async () => {
    const { merchants, useCases } = setup();
    const merchant = createMerchantAggregate({
      id: "m-credit-2",
      slug: "campaign-store",
      tradeName: "فروشگاه کمپین",
      ownerUserId: "u-4",
    });
    await merchants.save(merchant);

    // Topup 1,000,000 IRR (100,000 Tomans)
    await useCases.topupMerchantCredits({
      merchantId: merchant.id,
      amountMinor: 1000000n,
    });

    // Deduct 200,000 IRR (20,000 Tomans) for 100 SMS messages
    const balance = await useCases.deductMerchantCredits({
      merchantId: merchant.id,
      amountMinor: 200000n,
      reason: "sms_campaign",
      referenceId: "cmp-01",
    });

    expect(balance.balanceMinor).toBe(800000n);
    expect(balance.balanceToman).toBe(80000n);

    // Attempt to deduct more than balance (900,000 IRR > 800,000 IRR)
    await expect(
      useCases.deductMerchantCredits({
        merchantId: merchant.id,
        amountMinor: 900000n,
        reason: "sms_campaign",
      }),
    ).rejects.toThrow("اعتبار ناکافی است. لطفاً حساب خود را شارژ کنید.");
  });
});
