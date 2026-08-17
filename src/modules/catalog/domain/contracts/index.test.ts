import { describe, expect, it } from "vitest";

import {
  CATALOG_CACHE,
  CATALOG_DOMAIN,
  CATALOG_DOMAIN_DECISION,
  CATALOG_DOMAIN_EVENTS,
} from "./index.js";

describe("ADR-008 Catalog Domain contract", () => {
  it("separates catalog from inventory and scopes barcode to merchant", () => {
    expect(CATALOG_DOMAIN_DECISION.ownedAggregates).toEqual([
      "Product",
      "Category",
    ]);
    expect(CATALOG_DOMAIN_DECISION.inventoryOwnedSeparately).toBe(true);
    expect(CATALOG_DOMAIN_DECISION.barcodeUniqueScope).toBe("merchant");
    expect(CATALOG_DOMAIN_DECISION.moneyStorage).toEqual({
      currency: "IRR",
      unit: "minor",
      displayDefault: "toman",
    });
    expect(CATALOG_DOMAIN_DECISION.persianProductNames).toBe(true);
    expect(CATALOG_DOMAIN_DECISION.searchStrategyAdr).toBe("ADR-050");
    expect(CATALOG_DOMAIN_EVENTS).toContain("ProductCreated");
    expect(CATALOG_CACHE.listTtlSeconds).toBe(300);
    expect(CATALOG_DOMAIN.decision).toBe(CATALOG_DOMAIN_DECISION);
  });
});
