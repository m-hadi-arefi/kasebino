import { describe, expect, it } from "vitest";

import {
  STORE_DOMAIN_DECISION,
  STORE_DOMAIN_EVENTS,
  STORE_LIFECYCLE,
  STORE_MAP_POLICY,
  STORE_PROFILE_CACHE,
  isStorePubliclyVisible,
  storefrontPathForSlug,
} from "./index.js";
import { buildStorefrontPath } from "../mvp-policies/index.js";

describe("ADR-006 Store Domain contract", () => {
  it("binds location, global slug, and static map policy", () => {
    expect(STORE_DOMAIN_DECISION.requireStructuredAddress).toBe(true);
    expect(STORE_DOMAIN_DECISION.requireLatLng).toBe(true);
    expect(STORE_DOMAIN_DECISION.slug.globallyUnique).toBe(true);
    expect(STORE_DOMAIN_DECISION.slug.storefrontPathPattern).toBe(
      "/s/{storeSlug}",
    );
    expect(STORE_DOMAIN_DECISION.mapPresentation).toBe(
      STORE_MAP_POLICY.presentation,
    );
    expect(STORE_DOMAIN_DECISION.interactiveEmbedMandatory).toBe(false);
    expect(STORE_DOMAIN_DECISION.navigateDeepLinks).toContain("neshan");
    expect(STORE_LIFECYCLE.initialOnCreate).toBe("active");
    expect(STORE_DOMAIN_EVENTS).toEqual(["StoreCreated", "StoreUpdated"]);
    expect(STORE_PROFILE_CACHE.ttlSeconds).toBe(300);
    expect(STORE_PROFILE_CACHE.storefrontInfoTtlSeconds).toBe(600);
    expect(isStorePubliclyVisible("active")).toBe(true);
    expect(isStorePubliclyVisible("inactive")).toBe(false);
  });

  it("aligns storefront path with buildStorefrontPath", () => {
    expect(storefrontPathForSlug("nanvai-ali")).toBe("/s/nanvai-ali");
    expect(storefrontPathForSlug("atina-kerman")).toBe(
      buildStorefrontPath("atina-kerman"),
    );
  });
});
