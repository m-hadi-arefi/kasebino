import { describe, expect, it } from "vitest";
import {
  PRODUCT_ARCHITECTURE,
  assertCapabilityAllowed,
  assertPickupOnlyFulfillment,
  buildStorefrontPath,
  isAllowedFulfillmentMode,
  isForbiddenCapability,
} from "./index.js";

describe("ADR-001 product architecture", () => {
  it("is store-first with pickup-only fulfillment", () => {
    expect(PRODUCT_ARCHITECTURE.ownershipModel).toBe("store-first");
    expect(PRODUCT_ARCHITECTURE.allowedFulfillmentModes).toEqual(["pickup"]);
    expect(PRODUCT_ARCHITECTURE.defaultFulfillmentMode).toBe("pickup");
    expect(isAllowedFulfillmentMode("pickup")).toBe(true);
    expect(isAllowedFulfillmentMode("delivery")).toBe(false);
  });

  it("rejects non-pickup fulfillment", () => {
    expect(() => assertPickupOnlyFulfillment("delivery")).toThrow(/pickup/i);
    expect(() => assertPickupOnlyFulfillment("shipping")).toThrow(/not allowed/i);
    expect(() => assertPickupOnlyFulfillment("pickup")).not.toThrow();
  });

  it("forbids marketplace, delivery, and desktop offline suite capabilities", () => {
    expect(isForbiddenCapability("marketplace_browse")).toBe(true);
    expect(isForbiddenCapability("delivery")).toBe(true);
    expect(isForbiddenCapability("desktop_offline_suite")).toBe(true);
    expect(() => assertCapabilityAllowed("delivery")).toThrow(/non-goal/i);
    expect(() => assertCapabilityAllowed("pos_checkout")).not.toThrow();
  });

  it("splits OLTP and analytics planes", () => {
    expect(PRODUCT_ARCHITECTURE.dataPlanes.oltp).toBe("postgresql");
    expect(PRODUCT_ARCHITECTURE.dataPlanes.analytics).toBe("mongodb");
  });

  it("defaults to Iranian First locale settings", () => {
    expect(PRODUCT_ARCHITECTURE.localeDefaults).toMatchObject({
      language: "fa",
      locale: "fa-IR",
      dir: "rtl",
      calendar: "jalali",
      timeZone: "Asia/Tehran",
      moneyDisplayUnit: "toman",
      moneyStorageCurrency: "IRR",
    });
  });

  it("enables multi-store scoped to store (ADR-091)", () => {
    expect(PRODUCT_ARCHITECTURE.multiStore.enabledInMvp).toBe(true);
    expect(PRODUCT_ARCHITECTURE.multiStore.membershipScopedTo).toBe("store");
    expect(PRODUCT_ARCHITECTURE.multiStore.loyaltyWalletScopedTo).toBe(
      "store_membership",
    );
  });

  it("builds path-based storefront URLs", () => {
    expect(PRODUCT_ARCHITECTURE.storefrontUrl.pattern).toBe("/s/{storeSlug}");
    expect(buildStorefrontPath("atina-kerman")).toBe("/s/atina-kerman");
    expect(() => buildStorefrontPath("  ")).toThrow(/storeSlug/i);
  });

  it("names core retention loops", () => {
    expect(PRODUCT_ARCHITECTURE.retentionLoops).toEqual(
      expect.arrayContaining([
        "pos_phone_capture",
        "store_membership",
        "loyalty_wallet",
        "qr_acquisition",
        "store_pwa",
        "pickup_order",
      ]),
    );
  });
});
