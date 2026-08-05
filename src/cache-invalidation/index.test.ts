import { describe, expect, it } from "vitest";

import {
  createInMemoryCacheAside,
  serializeCacheValue,
} from "../cache-aside/index.js";
import type { CacheAsideStorePort } from "../cache-aside/port.js";
import {
  buildBarcodeKey,
  buildDashboardOverviewKey,
  buildMembershipKey,
  buildProductKey,
  buildStockKey,
  buildStoreKey,
  buildStorefrontProductKey,
  buildWalletKey,
} from "../cache-keys/index.js";
import { OUTBOX_CONSUMERS } from "../event-driven/index.js";
import { DEFERRED_PLACEMENT } from "../redis-architecture/index.js";

import {
  CACHE_INVALIDATION,
  CACHE_INVALIDATION_DECISION,
  CACHE_INVALIDATION_MVP_EVENTS,
  CACHE_INVALIDATION_PLACEMENT,
  CACHE_INVALIDATION_UNICODE,
  assertNeverFlushDb,
  assertPreferExplicitDeletes,
  buildStorefrontStoreInfoKey,
  invalidateOnEvent,
  isMappedInvalidationEvent,
  keysForEvent,
} from "./index.js";

const env = "test";
const merchantId = "m-1";
const storeId = "s-1";
const productId = "p-1";
const customerId = "c-1";

describe("ADR-054 Cache Invalidation via Domain Events", () => {
  it("locks event-driven key delete (never FLUSHDB; rebuild on next read)", () => {
    expect(CACHE_INVALIDATION_DECISION.pattern).toBe("event_driven_key_delete");
    expect(CACHE_INVALIDATION_DECISION.ttlOnlyTooStaleForPos).toBe(true);
    expect(CACHE_INVALIDATION_DECISION.rebuildOnNextRead).toBe(true);
    expect(CACHE_INVALIDATION_DECISION.neverFlushDb).toBe(true);
    expect(CACHE_INVALIDATION_DECISION.preferExplicitDeletes).toBe(true);
    expect(CACHE_INVALIDATION_DECISION.detailAdr).toBe("ADR-054");
    expect(CACHE_INVALIDATION_PLACEMENT.package).toBe("src/cache-invalidation/");
    expect(CACHE_INVALIDATION_PLACEMENT.outboxConsumer).toBe(
      "cache_invalidation",
    );
    expect(CACHE_INVALIDATION_MVP_EVENTS).toEqual([
      "SaleCompleted",
      "ProductUpdated",
      "ProductCreated",
      "ProductDeleted",
      "InventoryChanged",
      "StoreUpdated",
    ]);
    expect(CACHE_INVALIDATION_UNICODE.keysRemainIdBased).toBe(true);
    expect(CACHE_INVALIDATION.placement.package).toBe(
      "src/cache-invalidation/",
    );

    expect(() => assertNeverFlushDb(false)).not.toThrow();
    expect(() => assertNeverFlushDb(true)).toThrow(/FLUSHDB/i);
    expect(() => assertPreferExplicitDeletes(true)).not.toThrow();
    expect(() => assertPreferExplicitDeletes(false)).toThrow(/explicit/i);
  });

  it("aligns with outbox cache_invalidation consumer and redis placement", () => {
    expect(OUTBOX_CONSUMERS.cache_invalidation.purpose).toBe(
      "delete_redis_keys",
    );
    expect(DEFERRED_PLACEMENT.cacheInvalidationPackage).toBe(
      "src/cache-invalidation/",
    );
    expect(DEFERRED_PLACEMENT.invalidationAdr).toBe("ADR-054");
  });

  it("maps StoreUpdated → store + storefront info keys with tenant segment", () => {
    const keys = keysForEvent({
      env,
      eventType: "StoreUpdated",
      payload: { merchantId, storeId },
    });
    expect(keys).toContain(buildStoreKey({ env, merchantId, storeId }));
    expect(keys).toContain(
      buildStorefrontStoreInfoKey({ env, merchantId, storeId }),
    );
    for (const key of keys) {
      expect(key).toContain(`:m:${merchantId}:`);
      expect(key.startsWith("mos:")).toBe(true);
    }
    expect(isMappedInvalidationEvent("StoreUpdated")).toBe(true);
  });

  it("maps ProductUpdated → product + storefront; barcode only when provided", () => {
    const withoutBarcode = keysForEvent({
      env,
      eventType: "ProductUpdated",
      payload: { merchantId, productId },
    });
    expect(withoutBarcode).toEqual(
      expect.arrayContaining([
        buildProductKey({ env, merchantId, productId }),
        buildStorefrontProductKey({ env, merchantId, productId }),
      ]),
    );
    expect(
      withoutBarcode.some((k) => k.includes(":barcode:")),
    ).toBe(false);

    const withBarcode = keysForEvent({
      env,
      eventType: "ProductUpdated",
      payload: { merchantId, productId, barcode: "6261234567890" },
    });
    expect(withBarcode).toContain(
      buildBarcodeKey({
        env,
        merchantId,
        barcode: "6261234567890",
      }),
    );
  });

  it("maps SaleCompleted → dashboard, wallet/membership, stock + storefront per line", () => {
    const keys = keysForEvent({
      env,
      eventType: "SaleCompleted",
      payload: {
        merchantId,
        storeId,
        customerId,
        lineProductIds: [productId, "p-2"],
        revenueRanges: ["7d"],
      },
    });

    expect(keys).toContain(buildDashboardOverviewKey({ env, merchantId }));
    expect(keys).toContain(
      buildWalletKey({ env, merchantId, storeId, customerId }),
    );
    expect(keys).toContain(
      buildMembershipKey({ env, merchantId, storeId, customerId }),
    );
    expect(keys).toContain(
      buildStockKey({ env, merchantId, storeId, productId }),
    );
    expect(keys).toContain(
      buildStorefrontProductKey({ env, merchantId, productId }),
    );
    expect(keys).toContain(
      buildStockKey({ env, merchantId, storeId, productId: "p-2" }),
    );
    expect(keys.some((k) => k.includes(":analytics:revenue:7d"))).toBe(true);
  });

  it("SaleCompleted without customer omits wallet/membership", () => {
    const keys = keysForEvent({
      env,
      eventType: "SaleCompleted",
      payload: {
        merchantId,
        storeId,
        lineProductIds: [productId],
      },
    });
    expect(keys.some((k) => k.includes(":wallet:"))).toBe(false);
    expect(keys.some((k) => k.includes(":membership:"))).toBe(false);
    expect(keys).toContain(
      buildStockKey({ env, merchantId, storeId, productId }),
    );
  });

  it("unknown event types map to empty keys and mark skipped", async () => {
    expect(isMappedInvalidationEvent("MerchantCreated")).toBe(false);
    expect(
      keysForEvent({
        env,
        eventType: "MerchantCreated",
        payload: { merchantId },
      }),
    ).toEqual([]);

    const { store } = createInMemoryCacheAside();
    const result = await invalidateOnEvent(store, {
      env,
      eventType: "MerchantCreated",
      payload: { merchantId },
    });
    expect(result.skipped).toBe(true);
    expect(result.deleted).toEqual([]);
  });

  it("invalidateOnEvent deletes mapped keys; next getOrLoad rebuilds", async () => {
    const { store, cache } = createInMemoryCacheAside();
    const productKey = buildProductKey({ env, merchantId, productId });
    const storeKey = buildStoreKey({ env, merchantId, storeId });
    const untouched = buildProductKey({
      env,
      merchantId,
      productId: "other",
    });

    await store.setex(
      productKey,
      300,
      serializeCacheValue({ name: "شیر", price: 1000 }),
    );
    await store.setex(storeKey, 300, serializeCacheValue({ name: "فروشگاه" }));
    await store.setex(untouched, 300, serializeCacheValue({ name: "نان" }));

    const productResult = await invalidateOnEvent(store, {
      env,
      eventType: "ProductUpdated",
      payload: { merchantId, productId, barcode: null },
    });
    expect(productResult.skipped).toBe(false);
    expect(productResult.deleted).toContain(productKey);
    expect(await store.get(productKey)).toBeNull();
    expect(await store.get(untouched)).not.toBeNull();

    await invalidateOnEvent(store, {
      env,
      eventType: "StoreUpdated",
      payload: { merchantId, storeId },
    });
    expect(await store.get(storeKey)).toBeNull();

    let loads = 0;
    const rebuilt = await cache.getOrLoad({
      key: productKey,
      ttlSeconds: 300,
      loader: async () => {
        loads += 1;
        return { name: "شیر تازه", price: 1200 };
      },
    });
    expect(rebuilt.kind).toBe("miss_loaded");
    expect(rebuilt.value).toEqual({ name: "شیر تازه", price: 1200 });
    expect(loads).toBe(1);
  });

  it("fail-opens when store.del throws (mutation already committed)", async () => {
    const flaky: CacheAsideStorePort = {
      get: async () => null,
      setex: async () => undefined,
      del: async () => {
        throw new Error("redis down");
      },
    };

    const result = await invalidateOnEvent(flaky, {
      env,
      eventType: "StoreUpdated",
      payload: { merchantId, storeId },
    });
    expect(result.keys.length).toBeGreaterThan(0);
    expect(result.deleted).toEqual([]);
  });

  it("does not corrupt Persian UTF-8 on non-targeted keys", async () => {
    const { store } = createInMemoryCacheAside();
    const keep = buildProductKey({
      env,
      merchantId,
      productId: "keep-fa",
    });
    const fa = { title: "لبنیات کرمان", note: "تخفیف ویژه" };
    await store.setex(keep, 300, serializeCacheValue(fa));

    await invalidateOnEvent(store, {
      env,
      eventType: "ProductUpdated",
      payload: { merchantId, productId },
    });

    const raw = await store.get(keep);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(fa);
  });
});
