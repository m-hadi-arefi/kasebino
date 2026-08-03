/**
 * Inventory bounded context — ADR-008 Catalog and Inventory Domain.
 * Stock is store-scoped (ADR-091). Catalog owns Product — do not embed qty on Product.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
