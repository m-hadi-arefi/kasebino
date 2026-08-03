/**
 * Customer identity bounded context — ADR-032 Customer SMS OTP.
 * Merchant OTP lives in `identity` (ADR-031) — never conflate audiences/tokens.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
