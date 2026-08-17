/**
 * Thin cache store port for cache-aside reads (ADR-052).
 * No full Redis client — adapters implement get / setex / del only.
 * Redis remains never a source of truth (ADR-051).
 */

/** Opaque string values (JSON-serialized payloads). */
export type CacheAsideStorePort = {
  /** Return raw string value, or null when key missing / expired. */
  get(key: string): Promise<string | null>;
  /** SET key value with TTL in seconds (always set TTL — cache-rules). */
  setex(key: string, ttlSeconds: number, value: string): Promise<void>;
  /** Delete key (invalidation consumers — ADR-054). */
  del(key: string): Promise<void>;
};

