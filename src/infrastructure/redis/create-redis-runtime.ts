/**
 * ADR-108 — compose Redis cache-aside + rate-limit runtime from REDIS_URL.
 *
 * Live path: Compose `REDIS_URL` (host: redis://localhost:6379).
 * Mock path: MOS_REDIS_MODE=memory → in-memory stores (unit tests / offline CI).
 */

import {
  createCacheAside,
  InMemoryCacheAsideStore,
  type CacheAsideClient,
} from "./cache-aside/index.js";
import type { CacheAsideStorePort } from "./cache-aside/port.js";
import {
  createInMemoryRateLimiter,
  createRateLimiter,
  type RateLimiter,
} from "../security/rate-limiting/index.js";
import { CONNECTION } from "./contracts/index.js";

import {
  createRedisClientConnecting,
  createRedisConfigFromEnv,
  type MerchantOsRedisClient,
} from "./client.js";
import { RedisCacheAsideStore } from "./redis-cache-aside-store.js";
import { RedisRateLimitStore } from "./redis-rate-limit-store.js";

export type RedisRuntimeMode = "redis" | "memory";

export type RedisRuntime = {
  mode: RedisRuntimeMode;
  cacheStore: CacheAsideStorePort;
  cacheAside: CacheAsideClient;
  rateLimiter: RateLimiter;
  /** Present when mode === "redis". */
  client?: MerchantOsRedisClient;
  /** Resolves when Redis CONNECT completed (or immediately for memory). */
  ready: Promise<void>;
};

function resolveEnvLabel(env: NodeJS.ProcessEnv): string {
  return env.MOS_ENV?.trim() || env.NODE_ENV?.trim() || "local";
}

function wantsMemoryMode(env: NodeJS.ProcessEnv): boolean {
  const mode = env.MOS_REDIS_MODE?.trim().toLowerCase();
  return mode === "memory" || mode === "mock";
}

/**
 * Build cache + rate-limit runtime.
 * - MOS_REDIS_MODE=memory|mock → in-memory (documented mock path)
 * - else requires REDIS_URL → live Redis adapters (Compose)
 */
export function createRedisRuntime(
  env: NodeJS.ProcessEnv = process.env,
): RedisRuntime {
  const envLabel = resolveEnvLabel(env);

  if (wantsMemoryMode(env) || !env[CONNECTION.envVar]?.trim()) {
    const cacheStore = new InMemoryCacheAsideStore();
    const { limiter } = createInMemoryRateLimiter(envLabel);
    return {
      mode: "memory",
      cacheStore,
      cacheAside: createCacheAside(cacheStore),
      rateLimiter: limiter,
      ready: Promise.resolve(),
    };
  }

  const config = createRedisConfigFromEnv(env);
  const { client, ready } = createRedisClientConnecting(config.url);
  const cacheStore = new RedisCacheAsideStore(client, ready);
  const rateLimitStore = new RedisRateLimitStore(client, ready);

  return {
    mode: "redis",
    cacheStore,
    cacheAside: createCacheAside(cacheStore),
    rateLimiter: createRateLimiter(rateLimitStore, envLabel),
    client,
    ready,
  };
}

/**
 * Ping Redis via REDIS_URL. Returns false when URL missing or PING fails.
 * Bounded wait so unit suites do not hang when Compose Redis is down but REDIS_URL is set.
 */
export async function pingRedisFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  options?: { timeoutMs?: number },
): Promise<boolean> {
  const url = env[CONNECTION.envVar]?.trim();
  if (!url) {
    return false;
  }
  const timeoutMs = options?.timeoutMs ?? 1_500;
  let client: Awaited<ReturnType<typeof createRedisClientConnecting>>["client"] | null =
    null;
  try {
    const connecting = createRedisClientConnecting(url);
    client = connecting.client;
    const pong = await Promise.race([
      connecting.ready.then(() => client!.ping()),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("redis_ping_timeout")), timeoutMs);
      }),
    ]);
    return pong === "PONG";
  } catch {
    return false;
  } finally {
    if (client) {
      // Force-close; quit() can hang when the TCP connect never completes.
      try {
        client.destroy();
      } catch {
        /* ignore */
      }
    }
  }
}
