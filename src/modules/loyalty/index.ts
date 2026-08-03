/**
 * Loyalty bounded context — ADR-010 Loyalty Architecture.
 * Wallet per StoreMembership; append-only PointsLedger; earn on POS sale.
 * Customer portal views → ARD-035. Expiry scheduler → ADR-035.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
