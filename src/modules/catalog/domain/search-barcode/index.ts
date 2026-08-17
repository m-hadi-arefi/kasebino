/**
 * ADR-050 — Search and Barcode Scanning Strategy.
 *
 * POS barcode resolve ≤1s and name search ≤100ms feel via merchant-scoped
 * B-tree unique (merchant_id, barcode), Redis cache-aside (TTL 300s),
 * lightweight Persian-aware normalize, and pg_trgm / client catalog fuzzy path.
 * Camera: BarcodeDetector with fallback library. Elasticsearch deferred.
 *
 * Catalog application: `lookupByBarcode` / `searchByName` (tenant-scoped).
 */

/** Unique equality index for POS barcode resolve — merchant leftmost (ADR-044/048). */
export const BARCODE_INDEX_STRATEGY = {
  type: "btree_unique" as const,
  columns: ["merchant_id", "barcode"] as const,
  softDeletePartialPredicate: "deleted_at IS NULL",
  sqlShape: "UNIQUE (merchant_id, barcode) WHERE deleted_at IS NULL",
  elasticsearchMvpForbidden: true,
  typesenseFutureAdr: null as null,
} as const;

/** Redis cache-aside for barcode → product (never SoT). */
export const BARCODE_CACHE = {
  strategy: "cache_aside" as const,
  ttlSeconds: 300,
  keyHint: "mos:{env}:m:{merchantId}:barcode:{barcode}",
  merchantIdRequired: true,
  missFallsThroughToPostgresql: true,
  neverSourceOfTruth: true,
  keysPackage: "src/infrastructure/redis/cache-keys/",
} as const;

/**
 * Fuzzy / name search — OLTP pg_trgm and/or client catalog cache.
 * Lightweight app normalize ships now; GIN DDL lands with ARD migrations.
 */
export const FUZZY_SEARCH_STRATEGY = {
  server: "pg_trgm" as const,
  clientCatalogCacheAllowed: true,
  ginIndexDeferredToMigration: true,
  persianUtf8Required: true,
  asciiOnlyCollationsForbidden: true,
} as const;

/** Staff POS camera scan — Web BarcodeDetector with library fallback. */
export const CLIENT_SCAN_STRATEGY = {
  primary: "BarcodeDetector" as const,
  fallbackLibrary: true,
  staffPwaOnly: true,
  notStoreCustomerPwa: true,
} as const;

/** NFR budgets from ADR-050 / query design. */
export const SEARCH_PERFORMANCE_BUDGETS = {
  barcodeResolveSecondsMax: 1,
  productSearchP95MsFeel: 100,
} as const;

/** Scan outcome analytics (warehouse emit later — ADR-056+). */
export const SCAN_ANALYTICS_EVENTS = [
  "BarcodeScanSucceeded",
  "BarcodeScanFailed",
] as const;

export type ScanAnalyticsEventName = (typeof SCAN_ANALYTICS_EVENTS)[number];

export const SEARCH_MESSAGES_FA = {
  PRODUCT_NOT_FOUND: "کالا با این بارکد یافت نشد.",
  SEARCH_EMPTY: "نتیجه‌ای برای جستجو پیدا نشد.",
  SEARCH_QUERY_TOO_SHORT: "عبارت جستجو خیلی کوتاه است.",
  SCAN_FAILED: "خواندن بارکد ناموفق بود. دوباره تلاش کنید.",
} as const;

/**
 * Lightweight Persian-aware normalize for search/barcode equality:
 * trim + Eastern/Western digit fold (Persian ۰-۹, Arabic-Indic ٠-٩ → 0-9).
 */
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeDigits(raw: string): string {
  let out = "";
  for (const ch of raw) {
    const persianIdx = PERSIAN_DIGITS.indexOf(ch);
    if (persianIdx >= 0) {
      out += String(persianIdx);
      continue;
    }
    const arabicIdx = ARABIC_INDIC_DIGITS.indexOf(ch);
    if (arabicIdx >= 0) {
      out += String(arabicIdx);
      continue;
    }
    out += ch;
  }
  return out;
}

/** Trim + digit normalize — barcode keys and digit-bearing queries. */
export function normalizeBarcode(raw: string): string {
  return normalizeDigits(raw.trim());
}

/** Trim + digit normalize for name/query contains matching. */
export function normalizeSearchText(raw: string): string {
  return normalizeDigits(raw.trim());
}

export function assertBarcodeCacheTtl(ttlSeconds: number): void {
  if (ttlSeconds !== BARCODE_CACHE.ttlSeconds) {
    throw new Error(
      `Barcode cache TTL must be ${BARCODE_CACHE.ttlSeconds}s (ADR-050); got ${ttlSeconds}.`,
    );
  }
}

export function assertNoElasticsearchMvp(elasticsearchEnabled: boolean): void {
  if (elasticsearchEnabled) {
    throw new Error(
      "Elasticsearch MVP is forbidden; use PG B-tree + pg_trgm / client cache (ADR-050).",
    );
  }
}

export function assertBarcodeBudgetSeconds(seconds: number): void {
  if (seconds > SEARCH_PERFORMANCE_BUDGETS.barcodeResolveSecondsMax) {
    throw new Error(
      `Barcode resolve exceeds ${SEARCH_PERFORMANCE_BUDGETS.barcodeResolveSecondsMax}s budget (ADR-050).`,
    );
  }
}

export const SEARCH_BARCODE_DECISION = {
  barcodeIndex: BARCODE_INDEX_STRATEGY,
  cache: BARCODE_CACHE,
  fuzzy: FUZZY_SEARCH_STRATEGY,
  clientScan: CLIENT_SCAN_STRATEGY,
  budgets: SEARCH_PERFORMANCE_BUDGETS,
  analyticsEvents: SCAN_ANALYTICS_EVENTS,
  normalize: {
    trim: true,
    easternWesternDigits: true,
    lightweightOnly: true,
  },
  catalogApplication: {
    lookupByBarcode: true,
    searchByName: true,
    tenantScope: "merchantId" as const,
  },
  elasticsearchMvp: false,
  implementationPackage: "src/modules/catalog/domain/search-barcode",
} as const;

export const SEARCH_BARCODE = {
  decision: SEARCH_BARCODE_DECISION,
  index: BARCODE_INDEX_STRATEGY,
  cache: BARCODE_CACHE,
  fuzzy: FUZZY_SEARCH_STRATEGY,
  clientScan: CLIENT_SCAN_STRATEGY,
  budgets: SEARCH_PERFORMANCE_BUDGETS,
  analyticsEvents: SCAN_ANALYTICS_EVENTS,
  messagesFa: SEARCH_MESSAGES_FA,
  normalizeBarcode,
  normalizeSearchText,
  normalizeDigits,
} as const;
