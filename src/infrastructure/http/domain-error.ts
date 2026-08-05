/**
 * ADR-094 — map domain application errors → HTTP envelopes (Persian messageFa).
 */

import { fail } from "./envelopes.js";
import type { HttpHandlerResult } from "./types.js";

type DomainErrorLike = {
  code: string;
  messageFa: string;
};

function isDomainErrorLike(error: unknown): error is DomainErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "messageFa" in error &&
    typeof (error as DomainErrorLike).code === "string" &&
    typeof (error as DomainErrorLike).messageFa === "string"
  );
}

const NOT_FOUND_CODES = new Set([
  "NOT_FOUND",
  "PRODUCT_NOT_FOUND",
  "CATEGORY_NOT_FOUND",
  "STOCK_ITEM_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "PAYMENT_NOT_FOUND",
  "MERCHANT_NOT_FOUND",
  "STORE_NOT_FOUND",
  "MEMBERSHIP_NOT_FOUND",
  "NOTIFICATION_NOT_FOUND",
  "WALLET_NOT_FOUND",
  "ADMIN_USER_NOT_FOUND",
  "SALE_NOT_FOUND",
]);

const CONFLICT_CODES = new Set([
  "CONFLICT",
  "SLUG_TAKEN",
  "OWNER_ALREADY_HAS_MERCHANT",
  "BARCODE_TAKEN",
  "SKU_TAKEN",
  "ALREADY_ACTIVE",
  "ALREADY_SUSPENDED",
  "VERSION_CONFLICT",
  "INSUFFICIENT_STOCK",
  "INSUFFICIENT_BALANCE",
  "INVALID_TRANSITION",
  "INVALID_STATUS_TRANSITION",
  "INVALID_ACTIVATE_TRANSITION",
  "INVALID_SUSPEND_TRANSITION",
  "PRODUCT_ALREADY_DELETED",
  "CATEGORY_ALREADY_DELETED",
  "MEMBERSHIP_SUSPENDED",
]);

const FORBIDDEN_CODES = new Set([
  "FORBIDDEN",
  "FORBIDDEN_NOT_PLATFORM_ADMIN",
  "CROSS_TENANT_FORBIDDEN",
  "CROSS_TENANT",
  "STORE_SCOPE_DENIED",
  "CUSTOMER_STAFF_BOUNDARY",
  "DELIVERY_FORBIDDEN",
  "SUSPENDED_CANNOT_ACTIVATE",
  "SANDBOX_CONFIRM_FORBIDDEN",
]);

const UNAUTHORIZED_CODES = new Set([
  "UNAUTHORIZED",
  "UNAUTHENTICATED",
  "INVALID_OTP",
  "OTP_EXPIRED",
  "OTP_NOT_FOUND",
  "WEBHOOK_SIGNATURE_INVALID",
]);

const RATE_LIMIT_CODES = new Set(["RATE_LIMITED"]);

export function httpStatusForDomainCode(code: string): number {
  if (NOT_FOUND_CODES.has(code)) return 404;
  if (CONFLICT_CODES.has(code)) return 409;
  if (FORBIDDEN_CODES.has(code)) return 403;
  if (UNAUTHORIZED_CODES.has(code)) return 401;
  if (RATE_LIMIT_CODES.has(code)) return 429;
  if (code === "IDEMPOTENCY_KEY_REQUIRED" || code === "IDEMPOTENCY_REQUIRED") {
    return 400;
  }
  return 400;
}

export function mapDomainError(
  error: unknown,
  correlationId: string,
): HttpHandlerResult {
  if (isDomainErrorLike(error)) {
    return fail({
      code: error.code,
      correlationId,
      status: httpStatusForDomainCode(error.code),
      messageFa: error.messageFa,
    });
  }
  return fail({
    code: "INTERNAL_ERROR",
    correlationId,
    status: 500,
  });
}

export async function runUseCase<T>(
  correlationId: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; result: HttpHandlerResult }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, result: mapDomainError(error, correlationId) };
  }
}
