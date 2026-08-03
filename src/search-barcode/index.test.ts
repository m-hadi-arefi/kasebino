import { describe, expect, it } from "vitest";

import {
  BARCODE_CACHE,
  BARCODE_INDEX_STRATEGY,
  CLIENT_SCAN_STRATEGY,
  FUZZY_SEARCH_STRATEGY,
  SCAN_ANALYTICS_EVENTS,
  SEARCH_BARCODE,
  SEARCH_BARCODE_DECISION,
  SEARCH_MESSAGES_FA,
  SEARCH_PERFORMANCE_BUDGETS,
  assertBarcodeBudgetSeconds,
  assertBarcodeCacheTtl,
  assertNoElasticsearchMvp,
  normalizeBarcode,
  normalizeDigits,
  normalizeSearchText,
} from "./index.js";

describe("ADR-050 Search and Barcode Scanning Strategy", () => {
  it("locks B-tree merchant+barcode, cache TTL 300s, no Elasticsearch MVP", () => {
    expect(BARCODE_INDEX_STRATEGY.type).toBe("btree_unique");
    expect(BARCODE_INDEX_STRATEGY.columns).toEqual([
      "merchant_id",
      "barcode",
    ]);
    expect(BARCODE_INDEX_STRATEGY.elasticsearchMvpForbidden).toBe(true);
    expect(BARCODE_CACHE.ttlSeconds).toBe(300);
    expect(BARCODE_CACHE.strategy).toBe("cache_aside");
    expect(BARCODE_CACHE.neverSourceOfTruth).toBe(true);
    expect(SEARCH_BARCODE_DECISION.elasticsearchMvp).toBe(false);
    expect(SEARCH_PERFORMANCE_BUDGETS.barcodeResolveSecondsMax).toBe(1);
    expect(SEARCH_PERFORMANCE_BUDGETS.productSearchP95MsFeel).toBe(100);

    expect(() => assertBarcodeCacheTtl(300)).not.toThrow();
    expect(() => assertBarcodeCacheTtl(60)).toThrow(/300/);
    expect(() => assertNoElasticsearchMvp(false)).not.toThrow();
    expect(() => assertNoElasticsearchMvp(true)).toThrow(/Elasticsearch/i);
    expect(() => assertBarcodeBudgetSeconds(0.5)).not.toThrow();
    expect(() => assertBarcodeBudgetSeconds(2)).toThrow(/budget/i);
  });

  it("documents fuzzy pg_trgm + client cache and BarcodeDetector fallback", () => {
    expect(FUZZY_SEARCH_STRATEGY.server).toBe("pg_trgm");
    expect(FUZZY_SEARCH_STRATEGY.clientCatalogCacheAllowed).toBe(true);
    expect(FUZZY_SEARCH_STRATEGY.persianUtf8Required).toBe(true);
    expect(CLIENT_SCAN_STRATEGY.primary).toBe("BarcodeDetector");
    expect(CLIENT_SCAN_STRATEGY.fallbackLibrary).toBe(true);
    expect(CLIENT_SCAN_STRATEGY.notStoreCustomerPwa).toBe(true);
    expect(SCAN_ANALYTICS_EVENTS).toEqual([
      "BarcodeScanSucceeded",
      "BarcodeScanFailed",
    ]);
    expect(SEARCH_BARCODE.decision).toBe(SEARCH_BARCODE_DECISION);
  });

  it("normalizes trim and Persian/Arabic-Indic digits for barcode and search text", () => {
    expect(normalizeDigits("۱۲۳")).toBe("123");
    expect(normalizeDigits("٤٥٦")).toBe("456");
    expect(normalizeBarcode("  ۶۲۶۰۰۰۱  ")).toBe("6260001");
    expect(normalizeSearchText("  نان بربری  ")).toBe("نان بربری");
    expect(normalizeSearchText("کالا ۱۲")).toBe("کالا 12");
    expect(SEARCH_MESSAGES_FA.PRODUCT_NOT_FOUND).toMatch(/[\u0600-\u06FF]/);
    expect(SEARCH_MESSAGES_FA.SCAN_FAILED).toMatch(/[\u0600-\u06FF]/);
  });
});
