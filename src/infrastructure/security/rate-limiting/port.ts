/**
 * Thin Redis port for rate-limit counters (ADR-055).
 * No full Redis client — adapters implement only the ops the limiter needs.
 */

/** Low-level Redis operations used by fixed/sliding window algorithms. */
export type RateLimitRedisPort = {
  incr(key: string): Promise<number>;
  /** SET TTL in seconds; returns true when expire applied. */
  expire(key: string, seconds: number): Promise<boolean>;
  /** Remaining TTL in ms; -1 no expire; -2 missing key. */
  pttl(key: string): Promise<number>;
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zcard(key: string): Promise<number>;
};
