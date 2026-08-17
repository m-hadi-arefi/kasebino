/**
 * In-memory CacheAsideStorePort for unit tests (ADR-052).
 * Not for multi-instance production — shared Redis is required (ADR-051).
 */

import type { CacheAsideStorePort } from "./port.js";

type Entry = { value: string; expiresAtMs: number };

export class InMemoryCacheAsideStore implements CacheAsideStorePort {
  private readonly entries = new Map<string, Entry>();
  private nowMs: () => number;

  constructor(clock: () => number = () => Date.now()) {
    this.nowMs = clock;
  }

  /** Test helper — advance or pin the clock. */
  setClock(clock: () => number): void {
    this.nowMs = clock;
  }

  clear(): void {
    this.entries.clear();
  }

  /** Test helper — remaining TTL in seconds; -2 missing; -1 immortal (unused). */
  ttlSeconds(key: string): number {
    this.purgeExpired(key);
    const entry = this.entries.get(key);
    if (!entry) {
      return -2;
    }
    return Math.max(0, Math.ceil((entry.expiresAtMs - this.nowMs()) / 1000));
  }

  async get(key: string): Promise<string | null> {
    this.purgeExpired(key);
    return this.entries.get(key)?.value ?? null;
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(
        `Cache-aside TTL must be a positive number of seconds (ADR-052); got ${ttlSeconds}.`,
      );
    }
    this.entries.set(key, {
      value,
      expiresAtMs: this.nowMs() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.entries.delete(key);
  }

  private purgeExpired(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }
    if (entry.expiresAtMs <= this.nowMs()) {
      this.entries.delete(key);
    }
  }
}

