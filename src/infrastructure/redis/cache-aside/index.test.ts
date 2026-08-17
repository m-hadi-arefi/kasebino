import { describe, expect, it, vi } from "vitest";

import { FAILURE_MODES } from "../contracts/index.js";
import {
  CACHE_ASIDE,
  CACHE_ASIDE_FAILURE,
  CACHE_ASIDE_PATTERN,
  CACHE_TTL_CLASS_HINTS,
  CACHE_UNICODE_SAFETY,
  NULL_CACHING_POLICY,
  STAMPEDE_CONTROL,
  assertCacheAsideNeverSourceOfTruth,
  assertFailOpenCacheReads,
  assertNullCachingDefaultOff,
  assertPersianPayloadIntact,
  assertTtlPositive,
  createCacheAside,
  createInMemoryCacheAside,
  deserializeCacheValue,
  serializeCacheValue,
} from "./index.js";
import type { CacheAsideStorePort } from "./port.js";

describe("ADR-052 Cache-Aside Read Strategy", () => {
  it("locks cache-aside as default (never SoT; miss→PG→set TTL)", () => {
    expect(CACHE_ASIDE_PATTERN.name).toBe("cache_aside");
    expect(CACHE_ASIDE_PATTERN.writeThroughDefault).toBe(false);
    expect(CACHE_ASIDE_PATTERN.readThroughFrameworkForbidden).toBe(true);
    expect(CACHE_ASIDE_PATTERN.neverSourceOfTruth).toBe(true);
    expect(CACHE_ASIDE_PATTERN.soleSourceOfTruth).toBe("postgresql");
    expect(CACHE_ASIDE_PATTERN.flow).toBe(
      "miss_then_postgresql_then_set_ttl_then_return",
    );
    expect(CACHE_ASIDE.placement.package).toBe("src/infrastructure/redis/cache-aside/");
    expect(CACHE_TTL_CLASS_HINTS.analyticsSeconds).toBe(60);
    expect(CACHE_TTL_CLASS_HINTS.hotEntitySeconds).toBe(300);
    expect(CACHE_TTL_CLASS_HINTS.storefrontSeconds).toBe(600);
    expect(CACHE_TTL_CLASS_HINTS.detailAdr).toBe("ADR-053");

    expect(() => assertCacheAsideNeverSourceOfTruth(false)).not.toThrow();
    expect(() => assertCacheAsideNeverSourceOfTruth(true)).toThrow(
      /never be a source of truth/i,
    );
    expect(() => assertTtlPositive(300)).not.toThrow();
    expect(() => assertTtlPositive(0)).toThrow(/TTL/i);
  });

  it("getOrLoad: miss loads once, sets TTL, then HIT skips loader", async () => {
    const { store, cache } = createInMemoryCacheAside();
    const loader = vi.fn(async () => ({ id: "p1", name: "شیر" }));

    const first = await cache.getOrLoad({
      key: "mos:test:m:m1:product:p1",
      ttlSeconds: 300,
      loader,
    });
    expect(first.kind).toBe("miss_loaded");
    expect(first.value).toEqual({ id: "p1", name: "شیر" });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(store.ttlSeconds("mos:test:m:m1:product:p1")).toBe(300);

    const second = await cache.getOrLoad({
      key: "mos:test:m:m1:product:p1",
      ttlSeconds: 300,
      loader,
    });
    expect(second.kind).toBe("hit");
    expect(second.value).toEqual({ id: "p1", name: "شیر" });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("fail-opens to loader when store get throws", async () => {
    expect(CACHE_ASIDE_FAILURE.policy).toBe("fail_open");
    expect(CACHE_ASIDE_FAILURE.policy).toBe(FAILURE_MODES.cacheReads.policy);
    expect(() => assertFailOpenCacheReads("fail_open")).not.toThrow();
    expect(() => assertFailOpenCacheReads("fail_closed")).toThrow(/fail-open/i);

    const flaky: CacheAsideStorePort = {
      get: async () => {
        throw new Error("redis down");
      },
      setex: async () => {
        throw new Error("redis down");
      },
      del: async () => {
        throw new Error("redis down");
      },
    };
    const cache = createCacheAside(flaky);
    const loader = vi.fn(async () => ({ ok: true }));

    const result = await cache.getOrLoad({
      key: "mos:test:m:m1:wallet:c1",
      ttlSeconds: 300,
      loader,
    });
    expect(result.kind).toBe("fail_open_loaded");
    expect(result.value).toEqual({ ok: true });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("applies null caching policy (default off; opt-in negative sentinel)", async () => {
    expect(NULL_CACHING_POLICY.cacheNullByDefault).toBe(false);
    expect(() => assertNullCachingDefaultOff(false)).not.toThrow();
    expect(() => assertNullCachingDefaultOff(true)).toThrow(/Null caching/i);

    const { store, cache } = createInMemoryCacheAside();
    const loader = vi.fn(async () => null as string | null);

    const first = await cache.getOrLoad({
      key: "mos:test:m:m1:barcode:missing",
      ttlSeconds: 300,
      loader,
    });
    expect(first.kind).toBe("miss_loaded");
    expect(first.value).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(await store.get("mos:test:m:m1:barcode:missing")).toBeNull();

    const second = await cache.getOrLoad({
      key: "mos:test:m:m1:barcode:missing",
      ttlSeconds: 300,
      loader,
    });
    expect(second.kind).toBe("miss_loaded");
    expect(loader).toHaveBeenCalledTimes(2);

    const negLoader = vi.fn(async () => null as string | null);
    const neg = await cache.getOrLoad({
      key: "mos:test:m:m1:barcode:gone",
      ttlSeconds: 300,
      loader: negLoader,
      cacheNull: true,
      nullTtlSeconds: 30,
    });
    expect(neg.kind).toBe("miss_loaded");
    expect(await store.get("mos:test:m:m1:barcode:gone")).toBe(
      NULL_CACHING_POLICY.nullSentinel,
    );
    expect(store.ttlSeconds("mos:test:m:m1:barcode:gone")).toBe(30);

    const negHit = await cache.getOrLoad({
      key: "mos:test:m:m1:barcode:gone",
      ttlSeconds: 300,
      loader: negLoader,
      cacheNull: true,
    });
    expect(negHit.kind).toBe("negative_hit");
    expect(negHit.value).toBeNull();
    expect(negLoader).toHaveBeenCalledTimes(1);
  });

  it("preserves Persian UTF-8 payloads through serialize round-trip", async () => {
    expect(CACHE_UNICODE_SAFETY.preserveUtf8PersianInValues).toBe(true);
    expect(CACHE_UNICODE_SAFETY.serializer).toBe("json_utf8");

    const payload = {
      name: "نان سنگک تازه",
      note: "کیف امتیاز فروشگاه",
      priceLabel: "۲۵۰۰۰ تومان",
    };
    const raw = serializeCacheValue(payload);
    const back = deserializeCacheValue<typeof payload>(raw);
    expect(back).toEqual(payload);
    assertPersianPayloadIntact(payload.name, back.name);
    assertPersianPayloadIntact(payload.note, back.note);

    const { cache } = createInMemoryCacheAside();
    await cache.setJson("mos:test:m:m1:product:fa", 300, payload);
    const fromCache = await cache.getJson<typeof payload>(
      "mos:test:m:m1:product:fa",
    );
    expect(fromCache).toEqual(payload);
    expect(fromCache?.name).toBe("نان سنگک تازه");
  });

  it("single-flights concurrent miss rebuilds to one loader call", async () => {
    expect(STAMPEDE_CONTROL.singleFlightDefault).toBe(true);

    const { cache } = createInMemoryCacheAside();
    let resolveLoader!: (value: { n: number }) => void;
    const loader = vi.fn(
      () =>
        new Promise<{ n: number }>((resolve) => {
          resolveLoader = resolve;
        }),
    );

    const p1 = cache.getOrLoad({
      key: "mos:test:m:m1:analytics:overview",
      ttlSeconds: 60,
      loader,
    });
    const p2 = cache.getOrLoad({
      key: "mos:test:m:m1:analytics:overview",
      ttlSeconds: 60,
      loader,
    });

    await vi.waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(1);
    });
    resolveLoader({ n: 1 });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a.value).toEqual({ n: 1 });
    expect(b.value).toEqual({ n: 1 });
    expect(a.kind).toBe("miss_loaded");
    expect(b.kind).toBe("miss_loaded");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("invalidates keys so next getOrLoad rebuilds from loader", async () => {
    const { cache } = createInMemoryCacheAside();
    let version = 1;
    const loader = vi.fn(async () => ({ version }));

    await cache.getOrLoad({
      key: "mos:test:m:m1:store:s1",
      ttlSeconds: 300,
      loader,
    });
    version = 2;
    await cache.invalidate("mos:test:m:m1:store:s1");
    const rebuilt = await cache.getOrLoad({
      key: "mos:test:m:m1:store:s1",
      ttlSeconds: 300,
      loader,
    });
    expect(rebuilt.kind).toBe("miss_loaded");
    expect(rebuilt.value).toEqual({ version: 2 });
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

