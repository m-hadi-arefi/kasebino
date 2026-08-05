/**
 * ADR-094 HTTP surface — shared helpers + domain handlers.
 */

export type {
  AuthenticatedAdmin,
  AuthenticatedCustomer,
  AuthenticatedMerchant,
  HttpHandlerResult,
  HttpRequestLike,
} from "./types.js";
export type { SessionLoader } from "./require-auth.js";

export {
  correlationIdFrom,
  fail,
  methodNotAllowed,
  ok,
  parseBody,
  requireIdempotencyHeader,
} from "./envelopes.js";
export {
  httpStatusForDomainCode,
  mapDomainError,
  runUseCase,
} from "./domain-error.js";
export {
  hydrateMerchantSessionClaims,
  requireAdminPermission,
  requireActiveMerchantPermission,
  requireCustomerAuth,
  requireMerchantAuth,
  requireMerchantPermission,
  requireMerchantPermissionResolved,
  requirePlatformAdmin,
  resolveTenantMerchantId,
} from "./require-auth.js";
export {
  clientIp,
  enforceRateLimit,
  rateLimitMetaNote,
} from "./rate-limit.js";
export * from "./dtos.js";
export * from "./handlers/catalog.js";
export * from "./handlers/inventory.js";
export * from "./handlers/pos.js";
export * from "./handlers/pos-sync.js";
export * from "./handlers/crm.js";
export * from "./handlers/loyalty.js";
export * from "./handlers/orders.js";
export * from "./handlers/payments.js";
export * from "./handlers/notifications.js";
export * from "./handlers/admin.js";
export * from "./handlers/analytics.js";
export * from "./handlers/merchants-stores.js";
export * from "./handlers/storefront.js";
export * from "./handlers/customer-portal.js";
export * from "./handlers/auth-otp.js";
export * from "./handlers/telemetry.js";
