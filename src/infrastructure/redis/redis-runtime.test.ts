/**
 * ADR-108 — Redis cache-aside + rate-limit runtime tests.
 *
 * Live path: REDIS_URL (default redis://localhost:6379) when Compose Redis is up.
 * Mock path: MOS_REDIS_MODE=memory always covered without Redis.
 */

import { afterAll, describe, expect, it } from "vitest";

import {
  createCacheAside,
  type CacheAsideClient,
} from "./cache-aside/index.js";
import {
  buildProductKey,
  buildStorefrontProductKey,
} from "./cache-keys/index.js";
import { invalidateOnEvent } from "./cache-invalidation/index.js";
import {
  RATE_LIMIT_HTTP,
  RATE_LIMIT_LIMITS,
  RATE_LIMIT_MESSAGES_FA,
  createInMemoryRateLimiter,
  createRateLimitedEnvelope,
  createRateLimiter,
  hashRateLimitSubject,
} from "../security/rate-limiting/index.js";
import { createOtpRuntime } from "../auth/otp-runtime.js";
import { handleMerchantOtpRequestHttp } from "../http/handlers/auth-otp.js";
import { enforceRateLimit } from "../http/rate-limit.js";
import type { HttpRequestLike } from "../http/types.js";
import {
  connectRedisClient,
  createRedisConfigFromEnv,
  createRedisRuntime,
  pingRedisFromEnv,
  RedisCacheAsideStore,
  RedisRateLimitStore,
  type MerchantOsRedisClient,
} from "./index.js";

const LIVE_REDIS_URL =
  process.env.REDIS_URL?.trim() || "redis://localhost:6379";

function fakeRequest(init?: {
  ip?: string;
  body?: unknown;
}): HttpRequestLike {
  const ip = init?.ip ?? "203.0.113.10";
  const body = init?.body ?? { phone: "09123456789" };
  return {
    method: "POST",
    url: "http://localhost/api/v1/auth/otp/request",
    headers: new Headers({
      "content-type": "application/json",
      "x-forwarded-for": ip,
      "x-correlation-id": "corr-adr-108",
    }),
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

describe("ADR-108 Redis runtime — mock path", () => {
  it("createRedisRuntime uses memory when MOS_REDIS_MODE=memory", () => {
    const runtime = createRedisRuntime({
      MOS_REDIS_MODE: "memory",
      MOS_ENV: "test",
    });
    expect(runtime.mode).toBe("memory");
    expect(runtime.client).toBeUndefined();
  });

  it("createRedisRuntime uses memory when REDIS_URL missing", () => {
    const runtime = createRedisRuntime({ MOS_ENV: "test" });
    expect(runtime.mode).toBe("memory");
  });

  it("OTP endpoint returns RATE_LIMITED Persian envelope after threshold (memory)", async () => {
    const { limiter } = createInMemoryRateLimiter("test");
    const ctx = {
      rateLimiter: limiter,
      rateLimitMode: "memory" as const,
    };
    const otpRuntime = createOtpRuntime({ forceInMemory: true });
    const ip = "198.51.100.77";
    const subjectRaw = `merchant-otp:${ip}`;

    // Pre-consume OTP window so the HTTP helper returns 429 without OTP side effects.
    for (let i = 0; i < RATE_LIMIT_LIMITS.otpPerMinute; i += 1) {
      const d = await limiter.consume({
        scope: "otp",
        subjectId: hashRateLimitSubject(subjectRaw),
      });
      expect(d.allowed).toBe(true);
    }

    const result = await handleMerchantOtpRequestHttp(
      fakeRequest({ ip }),
      ctx as never,
      otpRuntime,
    );

    expect(result.status).toBe(429);
    const envelope = result.body as {
      error: { code: string; message: string };
    };
    expect(envelope.error.code).toBe(RATE_LIMIT_HTTP.errorCode);
    expect(envelope.error.message).toBe(RATE_LIMIT_MESSAGES_FA.otp);
    expect(/[\u0600-\u06FF]/.test(envelope.error.message)).toBe(true);
  });

  it("enforceRateLimit sets Retry-After and fail-closed unavailable FA", async () => {
    const flaky = {
      async incr() {
        throw new Error("redis down");
      },
      async expire() {
        throw new Error("redis down");
      },
      async pttl() {
        throw new Error("redis down");
      },
      async zremrangebyscore() {
        throw new Error("redis down");
      },
      async zadd() {
        throw new Error("redis down");
      },
      async zcard() {
        throw new Error("redis down");
      },
    };
    const limiter = createRateLimiter(flaky, "test");
    const result = await enforceRateLimit({
      ctx: {
        rateLimiter: limiter,
        rateLimitMode: "redis",
      } as never,
      request: fakeRequest(),
      scope: "otp",
      subjectRaw: "merchant-otp:1.2.3.4",
      correlationId: "c-fail",
    });
    expect(result?.status).toBe(429);
    const body = result?.body as { error: { message: string; code: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.message).toBe(
      RATE_LIMIT_MESSAGES_FA.unavailableFailClosed,
    );
    expect(result?.headers?.["Retry-After"]).toBeTruthy();
  });

  it("ProductUpdated invalidates storefront/product keys (in-memory port)", async () => {
    const runtime = createRedisRuntime({
      MOS_REDIS_MODE: "memory",
      MOS_ENV: "test",
    });
    const env = "test";
    const merchantId = "m-adr108";
    const productId = "p-adr108";
    const productKey = buildProductKey({ env, merchantId, productId });
    const sfKey = buildStorefrontProductKey({ env, merchantId, productId });

    await runtime.cacheStore.setex(
      productKey,
      600,
      JSON.stringify({ name: "نان" }),
    );
    await runtime.cacheStore.setex(sfKey, 600, JSON.stringify({ name: "نان" }));

    const result = await invalidateOnEvent(runtime.cacheStore, {
      env,
      eventType: "ProductUpdated",
      payload: { merchantId, productId },
    });

    expect(result.deleted).toEqual(
      expect.arrayContaining([productKey, sfKey]),
    );
    expect(await runtime.cacheStore.get(productKey)).toBeNull();
    expect(await runtime.cacheStore.get(sfKey)).toBeNull();
  });

  it("createRedisConfigFromEnv requires Compose REDIS_URL", () => {
    expect(
      createRedisConfigFromEnv({ REDIS_URL: "redis://localhost:6379" }).url,
    ).toBe("redis://localhost:6379");
    expect(() => createRedisConfigFromEnv({})).toThrow(/REDIS_URL/i);
  });

  it("Persian RATE_LIMITED envelope for OTP", () => {
    const envelope = createRateLimitedEnvelope({
      scope: "otp",
      retryAfterSeconds: 60,
      correlationId: "c1",
    });
    expect(envelope.error.code).toBe("RATE_LIMITED");
    expect(envelope.error.message).toContain("کد تایید");
  });
});

describe("ADR-108 Redis runtime — live Redis", () => {
  let client: MerchantOsRedisClient | null = null;
  let cache: CacheAsideClient | null = null;
  let cacheStore: RedisCacheAsideStore | null = null;

  afterAll(async () => {
    if (client?.isOpen) {
      await client.quit();
    }
  });

  it("detects Compose Redis via REDIS_URL", async () => {
    const liveAvailable = await pingRedisFromEnv({
      REDIS_URL: LIVE_REDIS_URL,
    });
    if (!liveAvailable) {
      console.warn(
        "[ADR-108] Live Redis unavailable — skipped live hit/OTP Redis tests. Start: docker compose up -d redis; REDIS_URL=redis://localhost:6379",
      );
    }
    expect(typeof liveAvailable).toBe("boolean");
  });

  it("cache hit path served from Redis", async () => {
    if (!(await pingRedisFromEnv({ REDIS_URL: LIVE_REDIS_URL }))) {
      return;
    }
    client = await connectRedisClient(LIVE_REDIS_URL);
    cacheStore = new RedisCacheAsideStore(client);
    cache = createCacheAside(cacheStore);

    const key = `mos:test:m:m1:adr108:hit:${Date.now()}`;
    let loads = 0;
    const miss = await cache.getOrLoad({
      key,
      ttlSeconds: 60,
      loader: async () => {
        loads += 1;
        return { nameFa: "محصول تست", price: 1000 };
      },
    });
    expect(miss.kind).toBe("miss_loaded");
    expect(loads).toBe(1);

    const hit = await cache.getOrLoad({
      key,
      ttlSeconds: 60,
      loader: async () => {
        loads += 1;
        return { nameFa: "should-not-run" };
      },
    });
    expect(hit.kind).toBe("hit");
    expect(hit.value).toEqual({ nameFa: "محصول تست", price: 1000 });
    expect(loads).toBe(1);

    await cacheStore.del(key);
  });

  it("Redis rate limiter enforces OTP threshold", async () => {
    if (!(await pingRedisFromEnv({ REDIS_URL: LIVE_REDIS_URL }))) {
      return;
    }
    const redisClient = client ?? (await connectRedisClient(LIVE_REDIS_URL));
    client = redisClient;
    const store = new RedisRateLimitStore(redisClient);
    const limiter = createRateLimiter(store, "test");
    const subjectId = `otp-live-${Date.now()}`;

    for (let i = 0; i < RATE_LIMIT_LIMITS.otpPerMinute; i += 1) {
      const d = await limiter.consume({ scope: "otp", subjectId });
      expect(d.allowed).toBe(true);
    }
    const blocked = await limiter.consume({ scope: "otp", subjectId });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("ProductUpdated deletes storefront/product keys on Redis", async () => {
    if (!(await pingRedisFromEnv({ REDIS_URL: LIVE_REDIS_URL }))) {
      return;
    }
    const redisClient = client ?? (await connectRedisClient(LIVE_REDIS_URL));
    client = redisClient;
    const store = new RedisCacheAsideStore(redisClient);
    const env = "test";
    const merchantId = "m-live-108";
    const productId = `p-live-${Date.now()}`;
    const productKey = buildProductKey({ env, merchantId, productId });
    const sfKey = buildStorefrontProductKey({ env, merchantId, productId });

    await store.setex(productKey, 120, JSON.stringify({ ok: true }));
    await store.setex(sfKey, 120, JSON.stringify({ ok: true }));

    await invalidateOnEvent(store, {
      env,
      eventType: "ProductUpdated",
      payload: { merchantId, productId, barcode: "6260000000001" },
    });

    expect(await store.get(productKey)).toBeNull();
    expect(await store.get(sfKey)).toBeNull();
  });

  it("createRedisRuntime wires REDIS_URL as redis mode", async () => {
    if (!(await pingRedisFromEnv({ REDIS_URL: LIVE_REDIS_URL }))) {
      return;
    }
    const runtime = createRedisRuntime({
      REDIS_URL: LIVE_REDIS_URL,
      MOS_ENV: "test",
    });
    expect(runtime.mode).toBe("redis");
    await runtime.ready;
    expect(runtime.client).toBeDefined();
    if (runtime.client?.isOpen) {
      await runtime.client.quit();
    }
  });
});
