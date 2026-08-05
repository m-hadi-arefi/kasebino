/**
 * ADR-094 / ADR-108 — OTP / auth rate-limit helper.
 *
 * Production uses Redis RateLimiter from ApiContext (Compose REDIS_URL).
 * Documented mock path: MOS_REDIS_MODE=memory → in-memory stores.
 * Fail-closed OTP/auth when Redis/port errors (Persian unavailable message).
 */

import {
  createRateLimitedEnvelope,
  hashRateLimitSubject,
  type RateLimitScope,
} from "../../rate-limiting/index.js";
import type { ApiContext } from "../composition/create-api-context.js";
import { fail } from "./envelopes.js";
import type { HttpHandlerResult, HttpRequestLike } from "./types.js";

export async function enforceRateLimit(input: {
  ctx: ApiContext;
  request: HttpRequestLike;
  scope: RateLimitScope;
  subjectRaw: string;
  correlationId: string;
}): Promise<HttpHandlerResult | null> {
  const decision = await input.ctx.rateLimiter.consume({
    scope: input.scope,
    subjectId: hashRateLimitSubject(input.subjectRaw),
  });
  if (decision.allowed) {
    return null;
  }
  const envelope = createRateLimitedEnvelope({
    scope: input.scope,
    correlationId: input.correlationId,
    retryAfterSeconds: decision.retryAfterSeconds,
    unavailable: decision.deniedFailClosed,
  });
  return {
    status: 429,
    body: envelope,
    headers: {
      "Retry-After": String(decision.retryAfterSeconds),
    },
  };
}

export function clientIp(request: HttpRequestLike): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function rateLimitMetaNote(ctx: ApiContext): string {
  if (ctx.rateLimitMode === "memory") {
    return "memory_mock_path_mos_redis_mode";
  }
  if (ctx.rateLimitMode === "redis") {
    return "redis";
  }
  return ctx.rateLimitMode;
}

/** Convenience when OTP handler already produced a result and we only need wrap. */
export function asHandlerResult(
  status: number,
  body: HttpHandlerResult["body"],
): HttpHandlerResult {
  return { status, body };
}

export { fail };
