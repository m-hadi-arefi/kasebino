/**
 * Thin Redis connection stub (ADR-051).
 *
 * Resolves REDIS_URL for infrastructure layers. Does not open a protocol
 * connection at import time. Cache-aside helpers live in `src/cache-aside`
 * (ADR-052). Rate limiting uses `src/rate-limiting` with a thin Redis port
 * (ADR-055).
 * Prefer module-owned adapters over global singletons when wiring real usage
 * (docs/tech/redis.md).
 */

import { CONNECTION } from "../../redis-architecture/index.js";

export type RedisConnectionConfig = {
  url: string;
  envVar: typeof CONNECTION.envVar;
};

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
      `${CONNECTION.envVar} is required for the Redis client stub (ADR-051).`,
    );
  }
  return createRedisConfig(url);
}
