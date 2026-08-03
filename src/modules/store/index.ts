/**
 * Store bounded context — ADR-006 Store Domain (Location Branding Slug).
 * Merchant tenant root lives in `merchant` (ADR-005) — never conflate.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
