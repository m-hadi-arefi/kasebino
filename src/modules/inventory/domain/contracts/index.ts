/**
 * ADR-008 — Inventory Domain contract.
 *
 * StockItem is store-scoped under merchant (ADR-091). Catalog owns Product only.
 */

export const INVENTORY_DOMAIN_EVENTS = [
  "StockAdjusted",
  "InventoryChanged",
  /** Past-tense wire name; catalog prose may say InventoryLow (ADR-002). */
  "InventoryLowDetected",
  /** Past-tense wire name; catalog prose may say InventoryOutOfStock. */
  "InventoryDepleted",
] as const;

export type InventoryDomainEventName =
  (typeof INVENTORY_DOMAIN_EVENTS)[number];

/**
 * Binding decision snapshot (ADR-008 + ADR-091 store-scoped inventory).
 */
export const INVENTORY_DOMAIN_DECISION = {
  ownedAggregate: "StockItem" as const,
  catalogOwnsProduct: true,
  /** Identity: merchantId + storeId + productId (ADR-091 multi-store). */
  scope: "store" as const,
  identityKeys: ["merchantId", "storeId", "productId"] as const,
  mvpAllowsNegativeQuantity: false,
  /** Sync/realtime plane — ADR-049 inventory-sync. */
  syncStrategy: "ADR-049",
  syncPackage: "src/modules/inventory/application/sync",
  persianShopFloorVocabulary: true,
} as const;

/** Primary event stub for adjustments this cycle (ADR-008). */
export const STOCK_ADJUSTED_EVENT = "StockAdjusted" as const;

/** Cache policy notes — Redis adapter later. */
export const INVENTORY_CACHE = {
  stockKeyHint: "mos:{env}:{merchantId}:store:{storeId}:stock:{productId}",
  ttlSeconds: 300,
  invalidateOn: ["StockAdjusted", "InventoryChanged"] as const,
} as const;

export const INVENTORY_DOMAIN = {
  decision: INVENTORY_DOMAIN_DECISION,
  events: INVENTORY_DOMAIN_EVENTS,
  primaryAdjustmentEvent: STOCK_ADJUSTED_EVENT,
  cache: INVENTORY_CACHE,
} as const;
