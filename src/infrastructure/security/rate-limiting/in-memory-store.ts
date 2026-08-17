/**
 * In-memory RateLimitRedisPort for unit tests (ADR-055).
 * Not for multi-instance production — use a real Redis adapter there.
 */

import type { RateLimitRedisPort } from "./port.js";

type StringEntry = { value: number; expiresAtMs: number | null };
type ZSetEntry = { members: Map<string, number>; expiresAtMs: number | null };

export class InMemoryRateLimitStore implements RateLimitRedisPort {
  private readonly strings = new Map<string, StringEntry>();
  private readonly zsets = new Map<string, ZSetEntry>();
  private nowMs: () => number;

  constructor(clock: () => number = () => Date.now()) {
    this.nowMs = clock;
  }

  /** Test helper — advance or pin the clock. */
  setClock(clock: () => number): void {
    this.nowMs = clock;
  }

  clear(): void {
    this.strings.clear();
    this.zsets.clear();
  }

  async incr(key: string): Promise<number> {
    this.purgeExpiredString(key);
    const existing = this.strings.get(key);
    if (!existing) {
      this.strings.set(key, { value: 1, expiresAtMs: null });
      return 1;
    }
    existing.value += 1;
    return existing.value;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const expiresAtMs = this.nowMs() + seconds * 1000;
    const str = this.strings.get(key);
    if (str) {
      str.expiresAtMs = expiresAtMs;
      return true;
    }
    const z = this.zsets.get(key);
    if (z) {
      z.expiresAtMs = expiresAtMs;
      return true;
    }
    return false;
  }

  async pttl(key: string): Promise<number> {
    this.purgeExpiredString(key);
    this.purgeExpiredZset(key);
    const str = this.strings.get(key);
    if (str) {
      if (str.expiresAtMs === null) {
        return -1;
      }
      return Math.max(0, str.expiresAtMs - this.nowMs());
    }
    const z = this.zsets.get(key);
    if (z) {
      if (z.expiresAtMs === null) {
        return -1;
      }
      return Math.max(0, z.expiresAtMs - this.nowMs());
    }
    return -2;
  }

  async zremrangebyscore(
    key: string,
    min: number,
    max: number,
  ): Promise<number> {
    this.purgeExpiredZset(key);
    const z = this.zsets.get(key);
    if (!z) {
      return 0;
    }
    let removed = 0;
    for (const [member, score] of z.members) {
      if (score >= min && score <= max) {
        z.members.delete(member);
        removed += 1;
      }
    }
    if (z.members.size === 0) {
      this.zsets.delete(key);
    }
    return removed;
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    this.purgeExpiredZset(key);
    let z = this.zsets.get(key);
    if (!z) {
      z = { members: new Map(), expiresAtMs: null };
      this.zsets.set(key, z);
    }
    const isNew = !z.members.has(member);
    z.members.set(member, score);
    return isNew ? 1 : 0;
  }

  async zcard(key: string): Promise<number> {
    this.purgeExpiredZset(key);
    return this.zsets.get(key)?.members.size ?? 0;
  }

  private purgeExpiredString(key: string): void {
    const entry = this.strings.get(key);
    if (!entry || entry.expiresAtMs === null) {
      return;
    }
    if (entry.expiresAtMs <= this.nowMs()) {
      this.strings.delete(key);
    }
  }

  private purgeExpiredZset(key: string): void {
    const entry = this.zsets.get(key);
    if (!entry || entry.expiresAtMs === null) {
      return;
    }
    if (entry.expiresAtMs <= this.nowMs()) {
      this.zsets.delete(key);
    }
  }
}
