/**
 * POS / Sales bounded context — ADR-009 POS and Sales Domain.
 * CompleteSale UoW orchestrates membership upsert + stock decrement + SaleCompleted.
 * Wire LoyaltyEarnPort via loyalty `createLoyaltyEarnPort` (ADR-010).
 * Never conflate with customer storefront PWA.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
