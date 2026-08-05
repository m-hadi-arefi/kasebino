/**
 * ADR-053 — Cache Key and TTL Standards.
 *
 * Pattern: mos:{env}:m:{merchantId}:{domain}:{resource}:{id}
 * Tenant (merchantId) is mandatory on every business cache key.
 * Membership/wallet keys include storeId (store-first).
 *
 * Normative: docs/architecture/cache-strategy.md,
 * docs/architecture/07-cache-architecture.md, docs/rules/cache-rules.md
 *
 * Invalidation event → key map → `src/cache-invalidation` (ADR-054).
 */

export const CACHE_KEY_PATTERN = {
  prefix: "mos",
  separator: ":",
  merchantSegment: "m",
  /** mos:{env}:m:{merchantId}:{domain}:{resource}:{id} */
  pattern: "mos:{env}:m:{merchantId}:{domain}:{resource}:{id}",
  merchantIdRequired: true,
  separatorsOnlyColon: true,
  segmentsLowercase: true,
  detailAdr: "ADR-053",
  strategyDoc: "docs/architecture/cache-strategy.md",
} as const;

/**
 * TTL classes (ADR-053 Decision + cache-strategy.md).
 * entity 300s · analytics/dashboard 60s · storefront 600s
 */
export const CACHE_TTL_SECONDS = {
  hotEntity: 300,
  analytics: 60,
  storefront: 600,
} as const;

export type CacheTtlClass = keyof typeof CACHE_TTL_SECONDS;

/**
 * Per-resource TTL table — store / product / dashboard are the MVP focus.
 * Additional mapped resources share the three classes above.
 */
export const CACHE_RESOURCE_TTL = {
  store: CACHE_TTL_SECONDS.hotEntity,
  product: CACHE_TTL_SECONDS.hotEntity,
  merchant: CACHE_TTL_SECONDS.hotEntity,
  customer: CACHE_TTL_SECONDS.hotEntity,
  barcode: CACHE_TTL_SECONDS.hotEntity,
  stock: CACHE_TTL_SECONDS.hotEntity,
  wallet: CACHE_TTL_SECONDS.hotEntity,
  membership: CACHE_TTL_SECONDS.hotEntity,
  settings: CACHE_TTL_SECONDS.hotEntity,
  /** Merchant OLTP dashboard widgets (analytics class). */
  dashboard: CACHE_TTL_SECONDS.analytics,
  analytics: CACHE_TTL_SECONDS.analytics,
  storefront: CACHE_TTL_SECONDS.storefront,
} as const;

export type CacheResource = keyof typeof CACHE_RESOURCE_TTL;

export const CACHE_KEYS_PLACEMENT = {
  package: "src/cache-keys/",
  detailAdr: "ADR-053",
  cacheAsideAdr: "ADR-052",
  invalidationPackage: "src/cache-invalidation/",
  invalidationAdr: "ADR-054",
} as const;

/**
 * Iranian First — keys remain ID-based; Persian lives in values (ADR-052).
 */
export const CACHE_KEY_UNICODE_POLICY = {
  keysRemainIdBased: true,
  noPersianInKeySegments: true,
  persianUtf8InCachedValues: true,
} as const;

export type CacheKeyEnvParts = {
  env: string;
  merchantId: string;
};

function normalizeSegment(label: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(
      `Cache key segment "${label}" must be non-empty (ADR-053); tenant isolation requires merchantId.`,
    );
  }
  return trimmed;
}

function normalizeEnv(env: string): string {
  const trimmed = env.trim();
  return trimmed || "dev";
}

/** Assert merchantId participates in every business key. */
export function assertMerchantIdPresent(merchantId: string): string {
  return normalizeSegment("merchantId", merchantId);
}

/**
 * Reject keys that omit tenant segment `m:{merchantId}` or mismatch.
 */
export function assertMerchantIdInKey(key: string, merchantId: string): void {
  const m = assertMerchantIdPresent(merchantId);
  const expected = `${CACHE_KEY_PATTERN.separator}${CACHE_KEY_PATTERN.merchantSegment}${CACHE_KEY_PATTERN.separator}${m}${CACHE_KEY_PATTERN.separator}`;
  if (!key.includes(expected)) {
    throw new Error(
      `Cache key must include tenant segment m:${m} (ADR-053 / ADR-048); got "${key}".`,
    );
  }
  if (!key.startsWith(`${CACHE_KEY_PATTERN.prefix}${CACHE_KEY_PATTERN.separator}`)) {
    throw new Error(
      `Cache key must start with "${CACHE_KEY_PATTERN.prefix}:" (ADR-053); got "${key}".`,
    );
  }
}

export function assertPositiveTtl(ttlSeconds: number): void {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error(
      `Cache TTL must be a positive number of seconds (ADR-053); got ${ttlSeconds}.`,
    );
  }
}

export function ttlForResource(resource: CacheResource): number {
  const ttl = CACHE_RESOURCE_TTL[resource];
  assertPositiveTtl(ttl);
  return ttl;
}

export function ttlForClass(ttlClass: CacheTtlClass): number {
  const ttl = CACHE_TTL_SECONDS[ttlClass];
  assertPositiveTtl(ttl);
  return ttl;
}

/**
 * Generic business key builder.
 * Segments after merchantId are joined with `:` — keep lowercase structural parts.
 */
export function buildCacheKey(
  input: CacheKeyEnvParts & { parts: readonly string[] },
): string {
  const env = normalizeEnv(input.env);
  const merchantId = assertMerchantIdPresent(input.merchantId);
  if (input.parts.length === 0) {
    throw new Error("Cache key parts must be non-empty (ADR-053).");
  }
  const tail = input.parts.map((p, i) =>
    normalizeSegment(`parts[${i}]`, p),
  );
  return [
    CACHE_KEY_PATTERN.prefix,
    env,
    CACHE_KEY_PATTERN.merchantSegment,
    merchantId,
    ...tail,
  ].join(CACHE_KEY_PATTERN.separator);
}

/** Hot entity — store profile/detail. TTL 300s. */
export function buildStoreKey(
  input: CacheKeyEnvParts & { storeId: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: ["store", normalizeSegment("storeId", input.storeId)],
  });
}

/** Hot entity — product detail. TTL 300s. */
export function buildProductKey(
  input: CacheKeyEnvParts & { productId: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: ["product", normalizeSegment("productId", input.productId)],
  });
}

/** Analytics / merchant dashboard overview widget. TTL 60s. */
export function buildDashboardOverviewKey(input: CacheKeyEnvParts): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: ["analytics", "overview"],
  });
}

/** Analytics dashboard range widget. TTL 60s. */
export function buildDashboardRevenueKey(
  input: CacheKeyEnvParts & { range: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: [
      "analytics",
      "revenue",
      normalizeSegment("range", input.range),
    ],
  });
}

/** Analytics customers widget. TTL 60s. */
export function buildDashboardCustomersKey(
  input: CacheKeyEnvParts & { range?: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: [
      "analytics",
      "customers",
      normalizeSegment("range", input.range ?? "default"),
    ],
  });
}

/** Analytics retention / North Star widget. TTL 60s. */
export function buildDashboardRetentionKey(input: CacheKeyEnvParts): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: ["analytics", "retention"],
  });
}

/** Storefront catalog page. TTL 600s. */
export function buildStorefrontCatalogKey(
  input: CacheKeyEnvParts & { pageHash: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: [
      "sf",
      "catalog",
      normalizeSegment("pageHash", input.pageHash),
    ],
  });
}

/** Storefront product page. TTL 600s. */
export function buildStorefrontProductKey(
  input: CacheKeyEnvParts & { productId: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: [
      "sf",
      "product",
      normalizeSegment("productId", input.productId),
    ],
  });
}

/** Merchant profile. TTL 300s. */
export function buildMerchantProfileKey(input: CacheKeyEnvParts): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: ["merchant", "profile"],
  });
}

/** Barcode → productId. TTL 300s. */
export function buildBarcodeKey(
  input: CacheKeyEnvParts & { barcode: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: ["barcode", normalizeSegment("barcode", input.barcode)],
  });
}

/**
 * Loyalty wallet — includes storeId (ADR-053 Domain Impact / store-first).
 * TTL 300s.
 */
export function buildWalletKey(
  input: CacheKeyEnvParts & { storeId: string; customerId: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: [
      "wallet",
      normalizeSegment("storeId", input.storeId),
      normalizeSegment("customerId", input.customerId),
    ],
  });
}

/**
 * Store membership — includes storeId (ADR-053 Domain Impact).
 * TTL 300s.
 */
export function buildMembershipKey(
  input: CacheKeyEnvParts & { storeId: string; customerId: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: [
      "membership",
      normalizeSegment("storeId", input.storeId),
      normalizeSegment("customerId", input.customerId),
    ],
  });
}

/** Stock qty at store. TTL 300s. */
export function buildStockKey(
  input: CacheKeyEnvParts & { storeId: string; productId: string },
): string {
  return buildCacheKey({
    env: input.env,
    merchantId: input.merchantId,
    parts: [
      "stock",
      normalizeSegment("storeId", input.storeId),
      normalizeSegment("productId", input.productId),
    ],
  });
}

export const CACHE_KEYS = {
  pattern: CACHE_KEY_PATTERN,
  ttlSeconds: CACHE_TTL_SECONDS,
  resourceTtl: CACHE_RESOURCE_TTL,
  placement: CACHE_KEYS_PLACEMENT,
  unicode: CACHE_KEY_UNICODE_POLICY,
  buildCacheKey,
  buildStoreKey,
  buildProductKey,
  buildDashboardOverviewKey,
  buildDashboardRevenueKey,
  buildStorefrontCatalogKey,
  buildStorefrontProductKey,
  buildMerchantProfileKey,
  buildBarcodeKey,
  buildWalletKey,
  buildMembershipKey,
  buildStockKey,
  ttlForResource,
  ttlForClass,
  assertMerchantIdInKey,
  assertMerchantIdPresent,
  assertPositiveTtl,
} as const;
