/**
 * ADR-095 — OTP HTTP helpers (API standards envelopes).
 * Route Handlers stay thin.
 */

import {
  createErrorEnvelope,
  createSuccessEnvelope,
  ensureCorrelationId,
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
} from "../../api-standards/index.js";
import {
  CustomerAuthError,
  isCustomerAuthError,
} from "../../modules/customer-identity/application/errors.js";
import {
  MerchantAuthError,
  isMerchantAuthError,
} from "../../modules/identity/application/errors.js";
import type { OtpRuntime } from "./otp-runtime.js";

export type JsonRecord = Record<string, unknown>;

export type OtpHttpResult =
  | { status: number; body: ApiSuccessEnvelope<JsonRecord> }
  | { status: number; body: ApiErrorEnvelope };

function correlationOf(
  request: { headers?: { get(name: string): string | null } },
): string {
  return ensureCorrelationId(
    request.headers?.get("x-correlation-id") ??
      request.headers?.get("X-Correlation-Id"),
  );
}

function authErrorResult(
  error: unknown,
  correlationId: string,
): OtpHttpResult {
  if (isMerchantAuthError(error) || isCustomerAuthError(error)) {
    const status =
      error.code === "RATE_LIMITED"
        ? 429
        : error.code === "CONSENT_REQUIRED"
          ? 400
          : error.code === "INVALID_PHONE"
            ? 400
            : 401;
    return {
      status,
      body: createErrorEnvelope({
        code: error.code,
        correlationId,
        messageFa: error.messageFa,
      }),
    };
  }
  return {
    status: 500,
    body: createErrorEnvelope({
      code: "INTERNAL_ERROR",
      correlationId,
    }),
  };
}

export async function handleMerchantOtpRequest(
  request: {
    method: string;
    json(): Promise<unknown>;
    headers?: { get(name: string): string | null };
  },
  runtime: OtpRuntime,
): Promise<OtpHttpResult> {
  const correlationId = correlationOf(request);
  if (request.method.toUpperCase() !== "POST") {
    return {
      status: 405,
      body: createErrorEnvelope({
        code: "VALIDATION_ERROR",
        correlationId,
        messageFa: "فقط درخواست POST مجاز است.",
      }),
    };
  }
  try {
    const raw = (await request.json()) as { phone?: unknown };
    const phone = typeof raw.phone === "string" ? raw.phone : "";
    const result = await runtime.merchant.requestOtp({ phone });
    const data: JsonRecord = {
      phoneNational: result.phoneNational,
      phoneE164: result.phoneE164,
      expiresAt: result.expiresAt.toISOString(),
    };
    if (result.devOtp !== undefined) {
      data.devOtp = result.devOtp;
    }
    return { status: 200, body: createSuccessEnvelope(data) };
  } catch (error) {
    return authErrorResult(error, correlationId);
  }
}

export async function handleCustomerOtpRequest(
  request: {
    method: string;
    json(): Promise<unknown>;
    headers?: { get(name: string): string | null };
  },
  runtime: OtpRuntime,
): Promise<OtpHttpResult> {
  const correlationId = correlationOf(request);
  if (request.method.toUpperCase() !== "POST") {
    return {
      status: 405,
      body: createErrorEnvelope({
        code: "VALIDATION_ERROR",
        correlationId,
        messageFa: "فقط درخواست POST مجاز است.",
      }),
    };
  }
  try {
    const raw = (await request.json()) as {
      phone?: unknown;
      consentCheckboxAccepted?: unknown;
    };
    const phone = typeof raw.phone === "string" ? raw.phone : "";
    const consentCheckboxAccepted =
      raw.consentCheckboxAccepted === true ||
      raw.consentCheckboxAccepted === "true" ||
      raw.consentCheckboxAccepted === "1";
    const result = await runtime.customer.requestOtp({
      phone,
      consentCheckboxAccepted,
    });
    const data: JsonRecord = {
      phoneNational: result.phoneNational,
      phoneE164: result.phoneE164,
      expiresAt: result.expiresAt.toISOString(),
    };
    if (result.devOtp !== undefined) {
      data.devOtp = result.devOtp;
    }
    return { status: 200, body: createSuccessEnvelope(data) };
  } catch (error) {
    return authErrorResult(error, correlationId);
  }
}

export { MerchantAuthError, CustomerAuthError };
