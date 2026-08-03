import { describe, expect, it } from "vitest";

import {
  STORE_DOMAIN_DECISION,
  storefrontPathForSlug,
} from "../../store-domain/index.js";
import {
  STORE_ERROR_MESSAGES_FA,
  StoreDomainError,
  InMemoryStoreRepository,
  createStoreUseCases,
  defaultIranRetailHours,
  emptyStoreHours,
} from "./index.js";

function kermanAddress(overrides: Record<string, unknown> = {}) {
  return {
    line1: "خیابان شریعتی، پلاک ۱۲",
    city: "کرمان",
    province: "کرمان",
    postalCode: "7613643111",
    latitude: 30.2839,
    longitude: 57.0834,
    ...overrides,
  };
}

function createHarness() {
  const stores = new InMemoryStoreRepository();
  let n = 0;
  const useCases = createStoreUseCases({
    stores,
    idFactory: () => `s-${++n}`,
    now: (() => {
      let t = 1_700_000_000_000;
      return () => new Date(t++);
    })(),
  });
  return { stores, useCases };
}

describe("ADR-006 Store Domain", () => {
  it("contract: global slug path and static map policy", () => {
    expect(STORE_DOMAIN_DECISION.slug.globallyUnique).toBe(true);
    expect(storefrontPathForSlug("shop-one")).toBe("/s/shop-one");
    expect(STORE_DOMAIN_DECISION.mapPresentation).toBe(
      "static_map_image_plus_navigate",
    );
  });

  it("creates store with Persian branding/address and StoreCreated", async () => {
    const { useCases } = createHarness();
    const { store, event } = await useCases.createStore({
      merchantId: "merchant-1",
      slug: "nanvai-aftab",
      displayName: "نانوایی آفتاب",
      address: kermanAddress(),
    });

    expect(store.status).toBe("active");
    expect(store.merchantId).toBe("merchant-1");
    expect(store.branding.displayName).toBe("نانوایی آفتاب");
    expect(store.address.city).toBe("کرمان");
    expect(store.address.displayAddress).toMatch(/کرمان/);
    expect(store.address.latitude).toBeCloseTo(30.2839);
    expect(store.qrAssetRef).toBeNull();
    expect(store.hours.saturday).toEqual({ open: "09:00", close: "21:00" });
    expect(storefrontPathForSlug(store.slug)).toBe("/s/nanvai-aftab");
    expect(event.eventName).toBe("StoreCreated");
    expect(event.payload.slug).toBe("nanvai-aftab");
    expect(event.payload.displayName).toBe("نانوایی آفتاب");
    expect(event.payload.merchantId).toBe("merchant-1");
  });

  it("enforces global slug uniqueness and Persian validation errors", async () => {
    const { useCases } = createHarness();
    await useCases.createStore({
      merchantId: "m1",
      slug: "taken-slug",
      displayName: "یکی",
      address: kermanAddress(),
    });

    await expect(
      useCases.createStore({
        merchantId: "m2",
        slug: "taken-slug",
        displayName: "دو",
        address: kermanAddress({ latitude: 30.29 }),
      }),
    ).rejects.toMatchObject({
      code: "SLUG_TAKEN",
      messageFa: STORE_ERROR_MESSAGES_FA.SLUG_TAKEN,
    });

    await expect(
      useCases.createStore({
        merchantId: "m3",
        slug: "Bad_Slug",
        displayName: "خوب",
        address: kermanAddress(),
      }),
    ).rejects.toMatchObject({ code: "INVALID_SLUG" });

    await expect(
      useCases.createStore({
        merchantId: "m4",
        slug: "ok-slug",
        displayName: "   ",
        address: kermanAddress(),
      }),
    ).rejects.toMatchObject({ code: "INVALID_DISPLAY_NAME" });

    await expect(
      useCases.createStore({
        merchantId: "m5",
        slug: "ok-slug-2",
        displayName: "خوب",
        address: kermanAddress({ city: "" }),
      }),
    ).rejects.toMatchObject({
      code: "INVALID_ADDRESS",
      messageFa: STORE_ERROR_MESSAGES_FA.INVALID_ADDRESS,
    });

    await expect(
      useCases.createStore({
        merchantId: "m6",
        slug: "ok-slug-3",
        displayName: "خوب",
        address: kermanAddress({ latitude: 120 }),
      }),
    ).rejects.toMatchObject({
      code: "INVALID_GEO",
      messageFa: STORE_ERROR_MESSAGES_FA.INVALID_GEO,
    });

    expect(STORE_ERROR_MESSAGES_FA.INVALID_GEO).toMatch(/[\u0600-\u06FF]/);
  });

  it("updates branding and emits StoreUpdated", async () => {
    const { useCases } = createHarness();
    const created = await useCases.createStore({
      merchantId: "m1",
      slug: "omid-market",
      displayName: "سوپر امید",
      address: kermanAddress(),
    });

    const { store, event } = await useCases.updateBranding({
      storeId: created.store.id,
      displayName: "سوپرمارکت امید",
      primaryColor: "#1a6b4a",
      logoObjectKey: "logos/omid.png",
    });

    expect(store.branding.displayName).toBe("سوپرمارکت امید");
    expect(store.branding.primaryColor).toBe("#1a6b4a");
    expect(store.branding.logoObjectKey).toBe("logos/omid.png");
    expect(event.eventName).toBe("StoreUpdated");
    expect(event.payload.changedFields).toContain("branding.displayName");
    expect(event.payload.changedFields).toContain("branding.primaryColor");

    await expect(
      useCases.updateBranding({
        storeId: created.store.id,
        primaryColor: "blue",
      }),
    ).rejects.toMatchObject({ code: "INVALID_PRIMARY_COLOR" });
  });

  it("updates hours and emits StoreUpdated", async () => {
    const { useCases } = createHarness();
    const created = await useCases.createStore({
      merchantId: "m1",
      slug: "hours-shop",
      displayName: "ساعات",
      address: kermanAddress(),
      hours: defaultIranRetailHours(),
    });

    const next = {
      ...emptyStoreHours(),
      saturday: { open: "08:00", close: "20:00" },
      sunday: { open: "08:00", close: "20:00" },
    };

    const { store, event } = await useCases.updateHours({
      storeId: created.store.id,
      hours: next,
    });

    expect(store.hours.saturday).toEqual({ open: "08:00", close: "20:00" });
    expect(store.hours.friday).toBeNull();
    expect(event.eventName).toBe("StoreUpdated");
    expect(event.payload.changedFields).toEqual(["hours"]);

    await expect(
      useCases.updateHours({
        storeId: created.store.id,
        hours: {
          ...emptyStoreHours(),
          monday: { open: "25:00", close: "10:00" },
        },
      }),
    ).rejects.toBeInstanceOf(StoreDomainError);
  });

  it("round-trips via in-memory repository and lists by merchant", async () => {
    const { useCases, stores } = createHarness();
    const a = await useCases.createStore({
      merchantId: "merchant-a",
      slug: "store-a1",
      displayName: "الف یک",
      address: kermanAddress(),
    });
    await useCases.createStore({
      merchantId: "merchant-a",
      slug: "store-a2",
      displayName: "الف دو",
      address: kermanAddress({ latitude: 30.3 }),
    });
    await useCases.createStore({
      merchantId: "merchant-b",
      slug: "store-b1",
      displayName: "ب یک",
      address: kermanAddress({ longitude: 57.1 }),
    });

    expect(await stores.findBySlug("store-a1")).toMatchObject({
      id: a.store.id,
      branding: { displayName: "الف یک" },
    });
    const forA = await stores.listByMerchantId("merchant-a");
    expect(forA).toHaveLength(2);
    expect(forA.map((s) => s.slug).sort()).toEqual(["store-a1", "store-a2"]);
  });
});
