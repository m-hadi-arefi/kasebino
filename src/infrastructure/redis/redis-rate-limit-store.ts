/**
 * Redis adapter for RateLimitRedisPort (ADR-108 / ADR-055).
 */

import type { RateLimitRedisPort } from "../security/rate-limiting/port.js";
import type { MerchantOsRedisClient } from "./client.js";

export class RedisRateLimitStore implements RateLimitRedisPort {
  constructor(
    private readonly client: MerchantOsRedisClient,
    private readonly ready: Promise<void> = Promise.resolve(),
  ) {}

  async incr(key: string): Promise<number> {
    await this.ready;
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    await this.ready;
    const result = await this.client.expire(key, seconds);
    return Boolean(result);
  }

  async pttl(key: string): Promise<number> {
    await this.ready;
    return this.client.pTTL(key);
  }

  async zremrangebyscore(
    key: string,
    min: number,
    max: number,
  ): Promise<number> {
    await this.ready;
    return this.client.zRemRangeByScore(key, min, max);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    await this.ready;
    return this.client.zAdd(key, { score, value: member });
  }

  async zcard(key: string): Promise<number> {
    await this.ready;
    return this.client.zCard(key);
  }
}
