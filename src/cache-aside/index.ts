/**
 * ADR-052 — Cache-Aside Read Strategy.
 *
 * Default read path: HIT → return; MISS → loader (PostgreSQL) → SET TTL → return.
 * Redis is never a source of truth. Key builders / canonical TTLs → `src/cache-keys` (ADR-053).
 * Invalidation event maps → `src/cache-invalidation` (ADR-054).
 *
 * Normative prose: docs/architecture/07-cache-architecture.md,
 * docs/architecture/cache-strategy.md, docs/rules/cache-rules.md
 */

import { CACHE_TTL_SECONDS } from "../cache-keys/index.js";
import { FAILURE_MODES, UNICODE_VALUE_SAFETY } from "../redis-architecture/index.js";

import { InMemoryCacheAsideStore } from "./in-memory-store.js";
import type { CacheAsideStorePort } from "./port.js";

export type { CacheAsideStorePort } from "./port.js";
export { InMemoryCacheAsideStore } from "./in-memory-store.js";

/** Pattern identity — write-through is not the default. */
export const CACHE_ASIDE_PATTERN = {
  name: "cache_aside" as const,
  flow: "miss_then_postgresql_then_set_ttl_then_return" as const,
  writeThroughDefault: false,
  readThroughFrameworkForbidden: true,
  neverSourceOfTruth: true,
  soleSourceOfTruth: "postgresql" as const,
  detailAdr: "ADR-052",
} as const;

/**
 * TTL class seconds — canonical table in `src/cache-keys` (ADR-053).
 */
export const CACHE_TTL_CLASS_HINTS = {
  hotEntitySeconds: CACHE_TTL_SECONDS.hotEntity,
  analyticsSeconds: CACHE_TTL_SECONDS.analytics,
  storefrontSeconds: CACHE_TTL_SECONDS.storefront,
  detailAdr: "ADR-053" as const,
  keysPackage: "src/cache-keys/",
} as const;

/**
 * Null / negative caching policy.
 * Default: do not write null/undefined loader results (avoids sticky misses).
 * Opt-in: short negative cache via sentinel encoded value.
 */
export const NULL_CACHING_POLICY = {
  cacheNullByDefault: false,
  /** Sentinel JSON payload when negative caching is enabled. */
  nullSentinel: '{"__mos_cache_null__":true}',
  defaultNegativeTtlSeconds: 30,
  rationale:
    "Avoid sticky false-negatives after create; opt-in short negative TTL for hot miss stamps",
} as const;

/** Fail-open when cache store errors — bypass to loader/PostgreSQL (ADR-051 / failure-recovery). */
export const CACHE_ASIDE_FAILURE = {
  policy: FAILURE_MODES.cacheReads.policy,
  behavior: FAILURE_MODES.cacheReads.behavior,
  recoveryDoc: "docs/architecture/18-failure-recovery-architecture.md",
} as const;

/**
 * Iranian First — cached payloads may include Persian (fa) strings.
 * Keys stay opaque / ID-based (ADR-053); serializers must not scrub Unicode.
 */
export const CACHE_UNICODE_SAFETY = {
  preserveUtf8PersianInValues: UNICODE_VALUE_SAFETY.preserveUtf8PersianInValues,
  keysRemainIdBased: UNICODE_VALUE_SAFETY.keysRemainIdBased,
  serializer: "json_utf8" as const,
  noAsciiScrubOfCachedFaText: UNICODE_VALUE_SAFETY.noAsciiScrubOfCachedFaText,
} as const;

/** Optional stampede control — in-process single-flight on concurrent miss rebuilds. */
export const STAMPEDE_CONTROL = {
  singleFlightDefault: true,
  redisSetNxDeferred: true,
  note: "In-process single-flight for concurrent miss; Redis SET NX optional later",
} as const;

export const CACHE_ASIDE_PLACEMENT = {
  package: "src/cache-aside/",
  port: "src/cache-aside/port.ts",
  inMemoryStore: "src/cache-aside/in-memory-store.ts",
  keysTtlPackage: "src/cache-keys/",
  keysTtlAdr: "ADR-053",
  invalidationPackage: "src/cache-invalidation/",
  invalidationAdr: "ADR-054",
  redisArchitecture: "src/redis-architecture/",
} as const;

export type CacheAsideHitKind = "hit" | "miss_loaded" | "negative_hit" | "fail_open_loaded";

export type CacheAsideGetOrLoadResult<T> = {
  value: T;
  kind: CacheAsideHitKind;
};

export type GetOrLoadOptions<T> = {
  key: string;
  ttlSeconds: number;
  /** Load from SoT (PostgreSQL / repository) on miss. */
  loader: () => Promise<T>;
  /**
   * When true, null/undefined loader results are written with
   * `nullTtlSeconds` (negative cache). Default false per NULL_CACHING_POLICY.
   */
  cacheNull?: boolean;
  nullTtlSeconds?: number;
  /** Override single-flight for this call (default STAMPEDE_CONTROL.singleFlightDefault). */
  singleFlight?: boolean;
};

export type CacheAsideClient = {
  getOrLoad: <T>(options: GetOrLoadOptions<T>) => Promise<CacheAsideGetOrLoadResult<T>>;
  /** Explicit delete for mutation/invalidation callers (ADR-054). */
  invalidate: (key: string) => Promise<void>;
  /** Direct get of deserialized value; null when missing or negative sentinel. */
  getJson: <T>(key: string) => Promise<T | null>;
  setJson: <T>(key: string, ttlSeconds: number, value: T) => Promise<void>;
};

function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function isNullSentinel(raw: string): boolean {
  return raw === NULL_CACHING_POLICY.nullSentinel;
}

/**
 * Serialize cache values as JSON UTF-8. Preserves Persian Unicode code points.
 */
export function serializeCacheValue<T>(value: T): string {
  return JSON.stringify(value);
}

/**
 * Deserialize cache values. Throws if payload is not valid JSON.
 */
export function deserializeCacheValue<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

export function assertCacheAsideNeverSourceOfTruth(
  soleSourceOfTruth: boolean,
): void {
  if (soleSourceOfTruth) {
    throw new Error(
      "Cache-aside Redis must never be a source of truth (ADR-052); PostgreSQL remains OLTP SoT.",
    );
  }
  if (!CACHE_ASIDE_PATTERN.neverSourceOfTruth) {
    throw new Error("CACHE_ASIDE_PATTERN.neverSourceOfTruth must be true (ADR-052).");
  }
}

export function assertFailOpenCacheReads(policy: string): void {
  if (policy !== CACHE_ASIDE_FAILURE.policy) {
    throw new Error(
      `Cache-aside reads fail-open when Redis is down (ADR-052); got "${policy}".`,
    );
  }
}

export function assertNullCachingDefaultOff(cacheNullByDefault: boolean): void {
  if (cacheNullByDefault !== NULL_CACHING_POLICY.cacheNullByDefault) {
    throw new Error(
      `Null caching default must be ${NULL_CACHING_POLICY.cacheNullByDefault} (ADR-052); got ${cacheNullByDefault}.`,
    );
  }
}

export function assertTtlPositive(ttlSeconds: number): void {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error(
      `Cache-aside TTL must be a positive number of seconds (ADR-052); got ${ttlSeconds}.`,
    );
  }
}

export function assertPersianPayloadIntact(
  original: string,
  roundTripped: string,
): void {
  if (original !== roundTripped) {
    throw new Error(
      "Cached Persian UTF-8 payload corrupted by serializer (ADR-052 / Iranian First).",
    );
  }
  if (!CACHE_UNICODE_SAFETY.preserveUtf8PersianInValues) {
    throw new Error("CACHE_UNICODE_SAFETY.preserveUtf8PersianInValues must be true (ADR-052).");
  }
}

/**
 * Create a cache-aside client bound to a store port (Redis adapter or in-memory).
 */
export function createCacheAside(store: CacheAsideStorePort): CacheAsideClient {
  const inflight = new Map<string, Promise<CacheAsideGetOrLoadResult<unknown>>>();

  async function safeGet(key: string): Promise<
    { ok: true; raw: string | null } | { ok: false }
  > {
    try {
      const raw = await store.get(key);
      return { ok: true, raw };
    } catch {
      return { ok: false };
    }
  }

  async function safeSetex(
    key: string,
    ttlSeconds: number,
    value: string,
  ): Promise<boolean> {
    try {
      await store.setex(key, ttlSeconds, value);
      return true;
    } catch {
      return false;
    }
  }

  async function getJson<T>(key: string): Promise<T | null> {
    const result = await safeGet(key);
    if (!result.ok || result.raw === null) {
      return null;
    }
    if (isNullSentinel(result.raw)) {
      return null;
    }
    return deserializeCacheValue<T>(result.raw);
  }

  async function setJson<T>(
    key: string,
    ttlSeconds: number,
    value: T,
  ): Promise<void> {
    assertTtlPositive(ttlSeconds);
    await store.setex(key, ttlSeconds, serializeCacheValue(value));
  }

  async function invalidate(key: string): Promise<void> {
    try {
      await store.del(key);
    } catch {
      // Fail-open for invalidate — mutation path still committed to PG.
    }
  }

  async function loadAndMaybeCache<T>(
    options: GetOrLoadOptions<T>,
    kindOnLoad: Extract<CacheAsideHitKind, "miss_loaded" | "fail_open_loaded">,
  ): Promise<CacheAsideGetOrLoadResult<T>> {
    const value = await options.loader();
    const allowNull = options.cacheNull === true;

    if (isNullish(value)) {
      if (allowNull) {
        const negTtl =
          options.nullTtlSeconds ?? NULL_CACHING_POLICY.defaultNegativeTtlSeconds;
        assertTtlPositive(negTtl);
        await safeSetex(options.key, negTtl, NULL_CACHING_POLICY.nullSentinel);
      }
      return { value, kind: kindOnLoad };
    }

    assertTtlPositive(options.ttlSeconds);
    await safeSetex(
      options.key,
      options.ttlSeconds,
      serializeCacheValue(value),
    );
    return { value, kind: kindOnLoad };
  }

  async function getOrLoadUncoordinated<T>(
    options: GetOrLoadOptions<T>,
  ): Promise<CacheAsideGetOrLoadResult<T>> {
    const cached = await safeGet(options.key);

    if (!cached.ok) {
      return loadAndMaybeCache(options, "fail_open_loaded");
    }

    if (cached.raw !== null) {
      if (isNullSentinel(cached.raw)) {
        return { value: null as T, kind: "negative_hit" };
      }
      return {
        value: deserializeCacheValue<T>(cached.raw),
        kind: "hit",
      };
    }

    return loadAndMaybeCache(options, "miss_loaded");
  }

  async function getOrLoad<T>(
    options: GetOrLoadOptions<T>,
  ): Promise<CacheAsideGetOrLoadResult<T>> {
    if (!options.key || options.key.trim() === "") {
      throw new Error("Cache-aside key must be a non-empty string (ADR-052).");
    }
    assertTtlPositive(options.ttlSeconds);

    const useSingleFlight =
      options.singleFlight ?? STAMPEDE_CONTROL.singleFlightDefault;

    if (!useSingleFlight) {
      return getOrLoadUncoordinated(options);
    }

    const existing = inflight.get(options.key);
    if (existing) {
      return existing as Promise<CacheAsideGetOrLoadResult<T>>;
    }

    const promise = getOrLoadUncoordinated(options).finally(() => {
      inflight.delete(options.key);
    }) as Promise<CacheAsideGetOrLoadResult<T>>;

    inflight.set(
      options.key,
      promise as Promise<CacheAsideGetOrLoadResult<unknown>>,
    );
    return promise;
  }

  return { getOrLoad, invalidate, getJson, setJson };
}

/** Convenience factory for tests — in-memory store + client. */
export function createInMemoryCacheAside(
  clock: () => number = () => Date.now(),
): { store: InMemoryCacheAsideStore; cache: CacheAsideClient } {
  const store = new InMemoryCacheAsideStore(clock);
  return { store, cache: createCacheAside(store) };
}

export const CACHE_ASIDE = {
  pattern: CACHE_ASIDE_PATTERN,
  ttlClassHints: CACHE_TTL_CLASS_HINTS,
  nullCaching: NULL_CACHING_POLICY,
  failure: CACHE_ASIDE_FAILURE,
  unicode: CACHE_UNICODE_SAFETY,
  stampede: STAMPEDE_CONTROL,
  placement: CACHE_ASIDE_PLACEMENT,
  createCacheAside,
  createInMemoryCacheAside,
  serializeCacheValue,
  deserializeCacheValue,
} as const;

