import { describe, expect, it } from "vitest";

import {
  MERCHANT_DOMAIN,
  MERCHANT_DOMAIN_DECISION,
  MERCHANT_DOMAIN_EVENTS,
  MERCHANT_LIFECYCLE,
  MERCHANT_PROFILE_CACHE,
  MERCHANT_STATUSES,
  assertMerchantStatus,
  isMerchantActive,
  merchantGatesOperations,
} from "./index.js";

describe("ADR-005 merchant-domain contract", () => {
  it("encodes multi-store MVP and Persian defaults", () => {
    expect(MERCHANT_DOMAIN_DECISION.isTenantRoot).toBe(true);
    expect(MERCHANT_DOMAIN_DECISION.multiStore.enabledInMvp).toBe(true);
    expect(MERCHANT_DOMAIN_DECISION.multiStore.merchantUiMustSupport).toContain(
      "switch",
    );
    expect(MERCHANT_DOMAIN_DECISION.persianTradeNames).toBe(true);
    expect(MERCHANT_DOMAIN_DECISION.defaultLocale).toBe("fa-IR");
    expect(MERCHANT_DOMAIN_DECISION.defaultTimezone).toBe("Asia/Tehran");
    expect(MERCHANT_DOMAIN.decision).toBe(MERCHANT_DOMAIN_DECISION);
  });

  it("defines lifecycle draft→active→suspended and gates", () => {
    expect(MERCHANT_STATUSES).toEqual(["draft", "active", "suspended"]);
    expect(MERCHANT_LIFECYCLE.initial).toBe("draft");
    expect(MERCHANT_LIFECYCLE.activationFrom).toBe("draft");
    expect(MERCHANT_LIFECYCLE.activationTo).toBe("active");
    expect(MERCHANT_LIFECYCLE.adminActivateFrom).toEqual(["draft", "suspended"]);
    expect(MERCHANT_DOMAIN_DECISION.activationGates).toEqual([
      "pos",
      "storefront",
    ]);
    expect(isMerchantActive("active")).toBe(true);
    expect(merchantGatesOperations("draft")).toBe(false);
    expect(() => assertMerchantStatus("bogus")).toThrow(/Invalid merchant status/);
    expect(() => assertMerchantStatus("draft")).not.toThrow();
  });

  it("lists Merchant* domain events and cache TTL policy", () => {
    expect(MERCHANT_DOMAIN_EVENTS).toContain("MerchantCreated");
    expect(MERCHANT_DOMAIN_EVENTS).toContain("MerchantActivated");
    expect(MERCHANT_DOMAIN_EVENTS).toContain("MerchantUpdated");
    expect(MERCHANT_DOMAIN_EVENTS).toContain("MerchantSuspended");
    expect(MERCHANT_PROFILE_CACHE.ttlSeconds).toBe(300);
  });
});
