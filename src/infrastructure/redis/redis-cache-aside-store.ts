/**
 * Redis adapter for CacheAsideStorePort (ADR-108 / ADR-052).
 */

import type { CacheAsideStorePort } from "./cache-aside/port.js";
import type { MerchantOsRedisClient } from "./client.js";

export class RedisCacheAsideStore implements CacheAsideStorePort {
  constructor(
    private readonly client: MerchantOsRedisClient,
    private readonly ready: Promise<void> = Promise.resolve(),
  ) {}

  async get(key: string): Promise<string | null> {
    await this.ready;
    const value = await this.client.get(key);
    return value ?? null;
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.ready;
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(
        `Cache-aside TTL must be a positive number of seconds (ADR-052); got ${ttlSeconds}.`,
      );
    }
    await this.client.setEx(key, Math.ceil(ttlSeconds), value);
  }

  async del(key: string): Promise<void> {
    await this.ready;
    await this.client.del(key);
  }
}
