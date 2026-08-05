/**
 * Redis infrastructure — live client + cache / rate-limit adapters (ADR-108).
 */

export {
  connectRedisClient,
  createRedisClient,
  createRedisClientConnecting,
  createRedisConfig,
  createRedisConfigFromEnv,
  type MerchantOsRedisClient,
  type RedisConnectionConfig,
} from "./client.js";
export {
  createRedisRuntime,
  pingRedisFromEnv,
  type RedisRuntime,
  type RedisRuntimeMode,
} from "./create-redis-runtime.js";
export { RedisCacheAsideStore } from "./redis-cache-aside-store.js";
export { RedisRateLimitStore } from "./redis-rate-limit-store.js";
