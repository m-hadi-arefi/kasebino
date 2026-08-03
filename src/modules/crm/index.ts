/**
 * CRM / Membership bounded context — ADR-007 Customer Membership Model.
 * StoreMembership is store-scoped; wallets implemented in ADR-010 (`src/modules/loyalty`).
 * Never conflate with merchant AuthUser.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
