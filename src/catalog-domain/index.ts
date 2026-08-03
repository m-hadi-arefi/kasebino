/**
 * ADR-008 — Catalog Domain contract.
 *
 * Catalog owns Product (+ Category); Inventory owns StockItem per store.
 * Barcode unique per merchant; money as IRR minor units; Persian names as text.
 */

export const CATALOG_DOMAIN_EVENTS = [
  "ProductCreated",
  "ProductUpdated",
  "ProductDeleted",
] as const;

export type CatalogDomainEventName = (typeof CATALOG_DOMAIN_EVENTS)[number];

/**
 * Binding decision snapshot (ADR-008 + ADR-091 multi-store catalogue ownership).
 */
export const CATALOG_DOMAIN_DECISION = {
  ownedAggregates: ["Product", "Category"] as const,
  inventoryOwnedSeparately: true,
  barcodeUniqueScope: "merchant" as const,
  skuUniqueScope: "merchant" as const,
  moneyStorage: {
    currency: "IRR" as const,
    unit: "minor" as const,
    displayDefault: "toman" as const,
  },
  persianProductNames: true,
  softDeleteHidesFromDefaultSearch: true,
  /** Barcode + name search strategy — ADR-050 / `src/search-barcode`. */
  searchStrategyAdr: "ADR-050",
} as const;

/** Cache policy notes — Redis adapter later (ADR-051/053). */
export const CATALOG_CACHE = {
  productKeyHint: "mos:{env}:{merchantId}:product:{productId}",
  barcodeKeyHint: "mos:{env}:{merchantId}:barcode:{barcode}",
  listTtlSeconds: 300,
  storefrontTtlSeconds: 600,
  invalidateOn: CATALOG_DOMAIN_EVENTS,
} as const;

export const CATALOG_DOMAIN = {
  decision: CATALOG_DOMAIN_DECISION,
  events: CATALOG_DOMAIN_EVENTS,
  cache: CATALOG_CACHE,
} as const;
