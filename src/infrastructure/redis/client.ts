/**
 * Redis connection config + live client factory (ADR-051 / ADR-108).
 *
 * Resolves REDIS_URL for infrastructure layers. Cache-aside helpers live in
 * `src/cache-aside` (ADR-052). Rate limiting uses `src/rate-limiting` (ADR-055).
 * Prefer module-owned adapters over global singletons when wiring (docs/tech/redis.md).
 */

import { createClient, type RedisClientType } from "redis";

import { CONNECTION } from "../../redis-architecture/index.js";

export type RedisConnectionConfig = {
  url: string;
  envVar: typeof CONNECTION.envVar;
};

export type MerchantOsRedisClient = RedisClientType;

/**
 * Resolve Redis URL from env without connecting.
 */
export function createRedisConfig(url: string): RedisConnectionConfig {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error(
      `${CONNECTION.envVar} must be a non-empty redis URL (ADR-051).`,
    );
  }
  if (
    !trimmed.startsWith("redis://") &&
    !trimmed.startsWith("rediss://")
  ) {
    throw new Error(
      `${CONNECTION.envVar} must use redis:// or rediss:// scheme (ADR-051); got "${trimmed}".`,
    );
  }
  return {
    url: trimmed,
    envVar: CONNECTION.envVar,
  };
}

/**
 * Build Redis connection config from process env. Requires REDIS_URL.
 */
export function createRedisConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): RedisConnectionConfig {
  const url = env[CONNECTION.envVar];
  if (!url) {
    throw new Error(
      `${CONNECTION.envVar} is required for the Redis client (ADR-051 / ADR-108).`,
    );
  }
  return createRedisConfig(url);
}

/**
 * Create a node-redis client for the given URL (does not connect yet).
 * Callers should `await client.connect()` or use `connectRedisClient`.
 */
export function createRedisClient(url: string): MerchantOsRedisClient {
  const config = createRedisConfig(url);
  const client = createClient({ url: config.url }) as MerchantOsRedisClient;
  client.on("error", (err: Error) => {
    // Avoid unhandled 'error' events; infrastructure layers apply fail policies.
    if (process.env.MOS_REDIS_LOG_ERRORS === "1") {
      console.error("[redis]", err.message);
    }
  });
  return client;
}

/**
 * Create + connect a Redis client. Rejects when unreachable.
 */
export async function connectRedisClient(
  url: string,
): Promise<MerchantOsRedisClient> {
  const client = createRedisClient(url);
  await client.connect();
  return client;
}

/**
 * Create client and start connect() without awaiting — adapters gate on ready.
 */
export function createRedisClientConnecting(url: string): {
  client: MerchantOsRedisClient;
  ready: Promise<void>;
} {
  const client = createRedisClient(url);
  const ready = client.connect().then(() => undefined);
  return { client, ready };
}
