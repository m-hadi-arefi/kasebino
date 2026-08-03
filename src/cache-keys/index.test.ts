import { describe, expect, it } from "vitest";

import { CACHE_TTL_CLASS_HINTS } from "../cache-aside/index.js";
import {
  CACHE_KEY_PATTERN,
  CACHE_KEYS,
  CACHE_RESOURCE_TTL,
  CACHE_TTL_SECONDS,
  assertMerchantIdInKey,
  assertMerchantIdPresent,
  assertPositiveTtl,
  buildBarcodeKey,
  buildCacheKey,
  buildDashboardOverviewKey,
  buildMembershipKey,
  buildProductKey,
  buildStoreKey,
  buildStorefrontCatalogKey,
  buildWalletKey,
  ttlForClass,
  ttlForResource,
} from "./index.js";

const ENV = "test";
const MERCHANT = "merchant-1";

describe("ADR-053 cache keys and TTL", () => {
  it("locks mos:{env}:m:{merchantId}:… pattern and tenant requirement", () => {
    expect(CACHE_KEY_PATTERN.prefix).toBe("mos");
    expect(CACHE_KEY_PATTERN.merchantSegment).toBe("m");
    expect(CACHE_KEY_PATTERN.pattern).toBe(
      "mos:{env}:m:{merchantId}:{domain}:{resource}:{id}",
    );
    expect(CACHE_KEY_PATTERN.merchantIdRequired).toBe(true);
    expect(CACHE_KEYS.placement.detailAdr).toBe("ADR-053");
    expect(CACHE_KEYS.unicode.keysRemainIdBased).toBe(true);
  });

  it("TTL table: store/product 300s, dashboard 60s, storefront 600s", () => {
    expect(CACHE_TTL_SECONDS.hotEntity).toBe(300);
    expect(CACHE_TTL_SECONDS.analytics).toBe(60);
    expect(CACHE_TTL_SECONDS.storefront).toBe(600);

    expect(CACHE_RESOURCE_TTL.store).toBe(300);
    expect(CACHE_RESOURCE_TTL.product).toBe(300);
    expect(CACHE_RESOURCE_TTL.dashboard).toBe(60);
    expect(CACHE_RESOURCE_TTL.analytics).toBe(60);
    expect(CACHE_RESOURCE_TTL.storefront).toBe(600);

    expect(ttlForResource("store")).toBe(300);
    expect(ttlForResource("product")).toBe(300);
    expect(ttlForResource("dashboard")).toBe(60);
    expect(ttlForClass("storefront")).toBe(600);
    expect(() => assertPositiveTtl(0)).toThrow(/TTL/i);
  });

  it("builds store/product/dashboard keys with tenant always present", () => {
    const store = buildStoreKey({
      env: ENV,
      merchantId: MERCHANT,
      storeId: "store-9",
    });
    expect(store).toBe("mos:test:m:merchant-1:store:store-9");
    assertMerchantIdInKey(store, MERCHANT);

    const product = buildProductKey({
      env: ENV,
      merchantId: MERCHANT,
      productId: "prod-3",
    });
    expect(product).toBe("mos:test:m:merchant-1:product:prod-3");
    assertMerchantIdInKey(product, MERCHANT);

    const dash = buildDashboardOverviewKey({
      env: ENV,
      merchantId: MERCHANT,
    });
    expect(dash).toBe("mos:test:m:merchant-1:analytics:overview");
    assertMerchantIdInKey(dash, MERCHANT);
  });

  it("rejects empty merchantId and keys missing tenant segment", () => {
    expect(() => assertMerchantIdPresent("")).toThrow(/merchantId/i);
    expect(() =>
      buildCacheKey({ env: ENV, merchantId: "  ", parts: ["store", "s1"] }),
    ).toThrow(/merchantId/i);

    expect(() =>
      assertMerchantIdInKey("mos:test:product:p1", MERCHANT),
    ).toThrow(/m:merchant-1/i);
    expect(() =>
      assertMerchantIdInKey("mos:test:m:other:store:s1", MERCHANT),
    ).toThrow(/m:merchant-1/i);
  });

  it("includes storeId on membership and wallet keys (store-first)", () => {
    const wallet = buildWalletKey({
      env: ENV,
      merchantId: MERCHANT,
      storeId: "store-a",
      customerId: "cust-b",
    });
    expect(wallet).toBe("mos:test:m:merchant-1:wallet:store-a:cust-b");
    assertMerchantIdInKey(wallet, MERCHANT);

    const membership = buildMembershipKey({
      env: ENV,
      merchantId: MERCHANT,
      storeId: "store-a",
      customerId: "cust-b",
    });
    expect(membership).toBe(
      "mos:test:m:merchant-1:membership:store-a:cust-b",
    );
  });

  it("builds barcode and storefront keys under the same tenant pattern", () => {
    expect(
      buildBarcodeKey({
        env: ENV,
        merchantId: MERCHANT,
        barcode: "6260123456789",
      }),
    ).toBe("mos:test:m:merchant-1:barcode:6260123456789");

    expect(
      buildStorefrontCatalogKey({
        env: ENV,
        merchantId: MERCHANT,
        pageHash: "p1",
      }),
    ).toBe("mos:test:m:merchant-1:sf:catalog:p1");
  });

  it("aligns cache-aside TTL class hints with canonical TTL table", () => {
    expect(CACHE_TTL_CLASS_HINTS.hotEntitySeconds).toBe(
      CACHE_TTL_SECONDS.hotEntity,
    );
    expect(CACHE_TTL_CLASS_HINTS.analyticsSeconds).toBe(
      CACHE_TTL_SECONDS.analytics,
    );
    expect(CACHE_TTL_CLASS_HINTS.storefrontSeconds).toBe(
      CACHE_TTL_SECONDS.storefront,
    );
    expect(CACHE_TTL_CLASS_HINTS.detailAdr).toBe("ADR-053");
  });
});
