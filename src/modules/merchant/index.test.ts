import { describe, expect, it } from "vitest";

import {
  MERCHANT_DOMAIN_DECISION,
  MERCHANT_DOMAIN_EVENTS,
  MERCHANT_LIFECYCLE,
  MERCHANT_PROFILE_CACHE,
  merchantGatesOperations,
} from "./domain/contracts/index.js";
import {
  MERCHANT_ERROR_MESSAGES_FA,
  MerchantDomainError,
  InMemoryMerchantRepository,
  createMerchantUseCases,
} from "./index.js";

function createHarness() {
  const merchants = new InMemoryMerchantRepository();
  let n = 0;
  const useCases = createMerchantUseCases({
    merchants,
    idFactory: () => `m-${++n}`,
    now: (() => {
      let t = 1_700_000_000_000;
      return () => new Date(t++);
    })(),
  });
  return { merchants, useCases };
}

describe("ADR-005 Merchant Domain", () => {
  it("contract: multi-store MVP, lifecycle, activation gates", () => {
    expect(MERCHANT_DOMAIN_DECISION.multiStore.enabledInMvp).toBe(true);
    expect(MERCHANT_DOMAIN_DECISION.activationGates).toEqual([
      "pos",
      "storefront",
    ]);
    expect(MERCHANT_LIFECYCLE.initial).toBe("draft");
    expect(MERCHANT_LIFECYCLE.activationTo).toBe("active");
    expect(MERCHANT_DOMAIN_EVENTS).toEqual([
      "MerchantCreated",
      "MerchantActivated",
      "MerchantUpdated",
      "MerchantSuspended",
    ]);
    expect(MERCHANT_PROFILE_CACHE.ttlSeconds).toBe(300);
    expect(merchantGatesOperations("draft")).toBe(false);
    expect(merchantGatesOperations("active")).toBe(true);
    expect(merchantGatesOperations("suspended")).toBe(false);
  });

  it("creates merchant in draft with MerchantCreated and Persian trade name", async () => {
    const { useCases } = createHarness();
    const { merchant, event } = await useCases.createMerchant({
      tradeName: "قصابی رضایی",
      slug: "rezaei-meat",
      ownerUserId: "user-1",
      contactPhone: "09123456789",
    });

    expect(merchant.status).toBe("draft");
    expect(merchant.tradeName).toBe("قصابی رضایی");
    expect(merchant.multiStoreEnabled).toBe(true);
    expect(merchant.contactPhoneE164).toBe("+989123456789");
    expect(merchant.settings.localeDefault).toBe("fa-IR");
    expect(event.eventName).toBe("MerchantCreated");
    expect(event.payload.name).toBe("قصابی رضایی");
    expect(event.payload.slug).toBe("rezaei-meat");
    expect(event.payload.ownerUserId).toBe("user-1");
  });

  it("activates draft merchant and emits MerchantActivated", async () => {
    const { useCases } = createHarness();
    const created = await useCases.createMerchant({
      tradeName: "نانوایی آفتاب",
      slug: "aftab-bakery",
      ownerUserId: "user-2",
    });

    const { merchant, event } = await useCases.activateMerchant({
      merchantId: created.merchant.id,
    });

    expect(merchant.status).toBe("active");
    expect(merchant.activatedAt).toBeInstanceOf(Date);
    expect(event.eventName).toBe("MerchantActivated");
    expect(event.payload.merchantId).toBe(merchant.id);
    expect(event.payload.activatedAt).toMatch(/^\d{4}-/);
  });

  it("rejects invalid activation with Persian messages", async () => {
    const { useCases, merchants } = createHarness();
    const created = await useCases.createMerchant({
      tradeName: "تست",
      slug: "test-shop",
      ownerUserId: "user-3",
    });
    await useCases.activateMerchant({ merchantId: created.merchant.id });

    await expect(
      useCases.activateMerchant({ merchantId: created.merchant.id }),
    ).rejects.toMatchObject({
      code: "ALREADY_ACTIVE",
      messageFa: MERCHANT_ERROR_MESSAGES_FA.ALREADY_ACTIVE,
    });

    const suspended = await merchants.findById(created.merchant.id);
    expect(suspended).not.toBeNull();
    if (suspended) {
      suspended.status = "suspended";
      await merchants.update(suspended);
    }
    await expect(
      useCases.activateMerchant({ merchantId: created.merchant.id }),
    ).rejects.toBeInstanceOf(MerchantDomainError);
    try {
      await useCases.activateMerchant({ merchantId: created.merchant.id });
    } catch (e) {
      expect(e).toBeInstanceOf(MerchantDomainError);
      if (e instanceof MerchantDomainError) {
        expect(e.code).toBe("SUSPENDED_CANNOT_ACTIVATE");
        expect(e.messageFa).toMatch(/[\u0600-\u06FF]/);
      }
    }
  });

  it("updates settings/profile and emits MerchantUpdated", async () => {
    const { useCases } = createHarness();
    const created = await useCases.createMerchant({
      tradeName: "سوپر مارکت امید",
      slug: "omid-market",
      ownerUserId: "user-4",
    });

    const { merchant, event } = await useCases.updateSettings({
      merchantId: created.merchant.id,
      tradeName: "سوپرمارکت امید",
      contactPhone: "+989121112233",
    });

    expect(merchant.tradeName).toBe("سوپرمارکت امید");
    expect(merchant.contactPhoneNational).toBe("09121112233");
    expect(event.eventName).toBe("MerchantUpdated");
    expect(event.payload.changedFields).toContain("tradeName");
    expect(event.payload.changedFields).toContain("contactPhoneNational");
  });

  it("enforces slug uniqueness and Persian validation errors", async () => {
    const { useCases } = createHarness();
    await useCases.createMerchant({
      tradeName: "یکی",
      slug: "taken-slug",
      ownerUserId: "u1",
    });

    await expect(
      useCases.createMerchant({
        tradeName: "دو",
        slug: "taken-slug",
        ownerUserId: "u2",
      }),
    ).rejects.toMatchObject({
      code: "SLUG_TAKEN",
      messageFa: MERCHANT_ERROR_MESSAGES_FA.SLUG_TAKEN,
    });

    await expect(
      useCases.createMerchant({
        tradeName: "   ",
        slug: "ok-slug",
        ownerUserId: "u3",
      }),
    ).rejects.toMatchObject({ code: "INVALID_TRADE_NAME" });

    await expect(
      useCases.createMerchant({
        tradeName: "خوب",
        slug: "Bad_Slug",
        ownerUserId: "u4",
      }),
    ).rejects.toMatchObject({ code: "INVALID_SLUG" });

    await expect(
      useCases.createMerchant({
        tradeName: "خوب",
        slug: "ok-slug-2",
        ownerUserId: "u5",
        contactPhone: "02188776655",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_PHONE",
      messageFa: MERCHANT_ERROR_MESSAGES_FA.INVALID_PHONE,
    });

    expect(MERCHANT_ERROR_MESSAGES_FA.INVALID_TRADE_NAME).toMatch(
      /[\u0600-\u06FF]/,
    );
  });

  it("round-trips via in-memory repository", async () => {
    const { useCases, merchants } = createHarness();
    const { merchant } = await useCases.createMerchant({
      tradeName: "لوازم خانگی پارس",
      slug: "pars-home",
      ownerUserId: "owner",
    });
    const found = await merchants.findBySlug("pars-home");
    expect(found?.id).toBe(merchant.id);
    expect(await merchants.findById(merchant.id)).toMatchObject({
      tradeName: "لوازم خانگی پارس",
      status: "draft",
      multiStoreEnabled: true,
    });
    expect(await merchants.findByOwnerUserId("owner")).toMatchObject({
      id: merchant.id,
    });
  });

  it("rejects second merchant for the same owner (AUTH-06)", async () => {
    const { useCases } = createHarness();
    await useCases.createMerchant({
      tradeName: "اولی",
      slug: "owner-first",
      ownerUserId: "same-owner",
    });
    await expect(
      useCases.createMerchant({
        tradeName: "دومی",
        slug: "owner-second",
        ownerUserId: "same-owner",
      }),
    ).rejects.toMatchObject({
      code: "OWNER_ALREADY_HAS_MERCHANT",
      messageFa: MERCHANT_ERROR_MESSAGES_FA.OWNER_ALREADY_HAS_MERCHANT,
    });
  });
});
