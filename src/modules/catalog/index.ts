/**
 * Catalog bounded context — ADR-008 Catalog and Inventory Domain.
 * Inventory / StockItem lives in `inventory` — never conflate price with stock qty.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
