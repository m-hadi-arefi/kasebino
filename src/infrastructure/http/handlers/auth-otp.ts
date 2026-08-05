/**
 * ADR-094 — normalize OTP auth under /api/v1 with rate-limit policy.
 */

import {
  handleCustomerOtpRequest,
  handleMerchantOtpRequest,
} from "../../auth/otp-http.js";
import type { OtpRuntime } from "../../auth/otp-runtime.js";
import type { ApiContext } from "../../composition/create-api-context.js";
import { correlationIdFrom } from "../envelopes.js";
import {
  clientIp,
  enforceRateLimit,
  rateLimitMetaNote,
} from "../rate-limit.js";
import type { HttpHandlerResult, HttpRequestLike } from "../types.js";

export async function handleMerchantOtpRequestHttp(
  request: HttpRequestLike,
  ctx: ApiContext,
  runtime: OtpRuntime,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  const limited = await enforceRateLimit({
    ctx,
    request,
    scope: "otp",
    subjectRaw: `merchant-otp:${clientIp(request)}`,
    correlationId,
  });
  if (limited) return limited;

  const result = await handleMerchantOtpRequest(request, runtime);
  if (result.status === 200 && "data" in result.body) {
    return {
      status: result.status,
      body: {
        data: result.body.data,
        meta: {
          rateLimit: rateLimitMetaNote(ctx),
        },
      },
    };
  }
  return { status: result.status, body: result.body };
}

export async function handleCustomerOtpRequestHttp(
  request: HttpRequestLike,
  ctx: ApiContext,
  runtime: OtpRuntime,
): Promise<HttpHandlerResult> {
  const correlationId = correlationIdFrom(request);
  const limited = await enforceRateLimit({
    ctx,
    request,
    scope: "otp",
    subjectRaw: `customer-otp:${clientIp(request)}`,
    correlationId,
  });
  if (limited) return limited;

  const result = await handleCustomerOtpRequest(request, runtime);
  if (result.status === 200 && "data" in result.body) {
    return {
      status: result.status,
      body: {
        data: result.body.data,
        meta: {
          rateLimit: rateLimitMetaNote(ctx),
        },
      },
    };
  }
  return { status: result.status, body: result.body };
}
