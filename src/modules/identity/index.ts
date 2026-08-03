/**
 * Identity (merchant) bounded context — ADR-031 + ADR-033 JWT + ADR-034 RBAC helpers.
 * Customer OTP lives in `customer-identity` (ADR-032) — never conflate.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
