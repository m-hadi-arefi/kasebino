/**
 * ADR-055 — Rate Limiting Strategy.
 *
 * Redis-backed fixed/sliding window policies for OTP, auth, admin,
 * default, and public storefront routes. Never a source of truth.
 *
 * Wiring into Next.js middleware / Route Handlers is consumed by callers;
 * security monitoring emit → ARD-026; audit emit → ADR-058
 * (`src/infrastructure/security/contracts/audit-logging/`).
 */

import { createHash, randomUUID } from "node:crypto";

import {
  API_ERROR_MESSAGES_FA,
  createErrorEnvelope,
  type ApiErrorEnvelope,
} from "../../../shared/contracts/api-standards/index.js";
import { MERCHANT_OTP_RATE_LIMIT } from "../../../modules/identity/domain/merchant-auth/index.js";
import { FAILURE_MODES } from "../../redis/contracts/index.js";

import { InMemoryRateLimitStore } from "./in-memory-store.js";
import type { RateLimitRedisPort } from "./port.js";

export type { RateLimitRedisPort } from "./port.js";
export { InMemoryRateLimitStore } from "./in-memory-store.js";

/** Normative product limits (PRD §11.4 / docs/product/constraints.md). */
export const RATE_LIMIT_LIMITS = {
  defaultRps: 10,
  authPerMinute: 5,
  otpPerMinute: 3,
  adminRps: 20,
} as const;

export type RateLimitScope =
  | "otp"
  | "auth"
  | "default"
  | "admin"
  | "public_storefront";

export type RateLimitAlgorithm = "fixed_window" | "sliding_window";

export type RateLimitFailPolicy = "fail_closed" | "fail_open";

export type RateLimitPolicy = {
  scope: RateLimitScope;
  limit: number;
  windowMs: number;
  algorithm: RateLimitAlgorithm;
  /**
   * When Redis/port errors:
   * - fail_closed: deny (OTP/auth — Iranian SMS abuse)
   * - fail_open: allow (public/cache-oriented reads)
   */
  failPolicy: RateLimitFailPolicy;
};

export const RATE_LIMIT_POLICIES = {
  otp: {
    scope: "otp",
    limit: RATE_LIMIT_LIMITS.otpPerMinute,
    windowMs: 60_000,
    algorithm: "fixed_window",
    failPolicy: "fail_closed",
  },
  auth: {
    scope: "auth",
    limit: RATE_LIMIT_LIMITS.authPerMinute,
    windowMs: 60_000,
    algorithm: "fixed_window",
    failPolicy: "fail_closed",
  },
  default: {
    scope: "default",
    limit: RATE_LIMIT_LIMITS.defaultRps,
    windowMs: 1_000,
    algorithm: "sliding_window",
    failPolicy: "fail_open",
  },
  admin: {
    scope: "admin",
    limit: RATE_LIMIT_LIMITS.adminRps,
    windowMs: 1_000,
    algorithm: "sliding_window",
    failPolicy: "fail_open",
  },
  /** Public storefront reads — fail-open like cache-oriented paths. */
  public_storefront: {
    scope: "public_storefront",
    limit: RATE_LIMIT_LIMITS.defaultRps,
    windowMs: 1_000,
    algorithm: "sliding_window",
    failPolicy: "fail_open",
  },
} as const satisfies Record<RateLimitScope, RateLimitPolicy>;

/**
 * Align OTP/auth fail-closed with ADR-051 FAILURE_MODES;
 * public/default fail-open when Redis unavailable (distinguished from OTP).
 */
export const RATE_LIMIT_FAILURE_ALIGNMENT = {
  otpAuth: FAILURE_MODES.authAndOtpRateLimits.policy,
  publicAndDefault: "fail_open" as const,
  cacheReadsCompanion: FAILURE_MODES.cacheReads.policy,
  rationale: "Iranian SMS OTP abuse protection; storefront read availability",
} as const;

/** Key pattern from docs/architecture/cache-strategy.md */
export const RATE_LIMIT_KEY = {
  prefix: "mos",
  segment: "rl",
  pattern: "mos:{env}:rl:{scope}:{id}",
} as const;

/**
 * Iranian First — Persian human messages for HTTP 429.
 * Envelope code remains RATE_LIMITED (ADR-030).
 */
export const RATE_LIMIT_MESSAGES_FA = {
  generic: API_ERROR_MESSAGES_FA.RATE_LIMITED,
  otp: "تعداد درخواست‌های کد تایید بیش از حد مجاز است. یک دقیقه دیگر تلاش کنید.",
  auth: "تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
  unavailableFailClosed:
    "سرویس موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
} as const;

export const RATE_LIMIT_HTTP = {
  status: 429,
  retryAfterHeader: "Retry-After",
  errorCode: "RATE_LIMITED",
} as const;

export const RATE_LIMIT_EVENT = {
  type: "RateLimitTriggered",
  analyticsImpact: "security_event",
  emitViaAuditPort: true,
  auditPackage: "src/infrastructure/security/contracts/audit-logging/",
  auditAdr: "ADR-058",
  auditAction: "rate_limit.triggered",
  securityMonitoringDeferredTo: "ARD-026",
} as const;

export type RateLimitTriggeredEvent = {
  type: typeof RATE_LIMIT_EVENT.type;
  scope: RateLimitScope;
  /** Subject key fragment only — prefer hashed phone, never OTP codes. */
  subjectId: string;
  limit: number;
  windowMs: number;
  count: number;
  occurredAt: string;
};

export type RateLimitDecision = {
  allowed: boolean;
  scope: RateLimitScope;
  limit: number;
  remaining: number;
  /** Seconds until window reset (ceil); 0 when allowed with no reset needed. */
  retryAfterSeconds: number;
  /** True when Redis failed and fail-open let the request through. */
  degradedFailOpen: boolean;
  /** True when Redis failed and fail-closed denied. */
  deniedFailClosed: boolean;
};

export type ConsumeRateLimitInput = {
  scope: RateLimitScope;
  /** IP, hashed phone, user id, etc. */
  subjectId: string;
  env?: string;
  nowMs?: number;
};

export const RATE_LIMITING = {
  adr: "ADR-055",
  limits: RATE_LIMIT_LIMITS,
  policies: RATE_LIMIT_POLICIES,
  key: RATE_LIMIT_KEY,
  http: RATE_LIMIT_HTTP,
  messagesFa: RATE_LIMIT_MESSAGES_FA,
  event: RATE_LIMIT_EVENT,
  failureAlignment: RATE_LIMIT_FAILURE_ALIGNMENT,
  otpAlignsWithMerchantAuth:
    RATE_LIMIT_LIMITS.otpPerMinute ===
    MERCHANT_OTP_RATE_LIMIT.otpRequestsPerMinute,
  packagePath: "src/infrastructure/security/rate-limiting",
  redisPort: "src/infrastructure/security/rate-limiting/port.ts",
  inMemoryForTests: "src/infrastructure/security/rate-limiting/in-memory-store.ts",
} as const;

export function buildRateLimitKey(input: {
  env: string;
  scope: RateLimitScope;
  subjectId: string;
}): string {
  const env = input.env.trim() || "dev";
  const id = input.subjectId.trim();
  if (!id) {
    throw new Error("Rate limit subjectId must be non-empty (ADR-055).");
  }
  return `${RATE_LIMIT_KEY.prefix}:${env}:${RATE_LIMIT_KEY.segment}:${input.scope}:${id}`;
}

/** Prefer hashed subjects in Redis keys (docs/tech/redis.md — minimize PII). */
export function hashRateLimitSubject(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/**
 * Classify API/pathname into a rate-limit scope for middleware consumers.
 */
export function classifyRateLimitScope(pathname: string): RateLimitScope {
  const path = pathname.toLowerCase();
  if (
    path.includes("/auth/otp") ||
    path.endsWith("/otp/request") ||
    path.includes("/otp/request")
  ) {
    return "otp";
  }
  if (path.includes("/api/v1/auth") || path.startsWith("/api/auth")) {
    return "auth";
  }
  if (path.includes("/api/v1/admin") || path.startsWith("/api/admin")) {
    return "admin";
  }
  if (
    path.startsWith("/s/") ||
    path.includes("/storefront") ||
    path.includes("/api/v1/sf/") ||
    path.includes("/api/v1/public/")
  ) {
    return "public_storefront";
  }
  return "default";
}

export function messageFaForScope(scope: RateLimitScope): string {
  if (scope === "otp") {
    return RATE_LIMIT_MESSAGES_FA.otp;
  }
  if (scope === "auth") {
    return RATE_LIMIT_MESSAGES_FA.auth;
  }
  return RATE_LIMIT_MESSAGES_FA.generic;
}

export function createRateLimitedEnvelope(input: {
  scope: RateLimitScope;
  correlationId?: string | null;
  retryAfterSeconds: number;
  /** fail-closed Redis unavailable uses softer ops message */
  unavailable?: boolean;
}): ApiErrorEnvelope {
  const messageFa = input.unavailable
    ? RATE_LIMIT_MESSAGES_FA.unavailableFailClosed
    : messageFaForScope(input.scope);
  return createErrorEnvelope({
    code: RATE_LIMIT_HTTP.errorCode,
    ...(input.correlationId !== undefined
      ? { correlationId: input.correlationId }
      : {}),
    messageFa,
    details: {
      scope: input.scope,
      retryAfterSeconds: input.retryAfterSeconds,
    },
  });
}

export function createRateLimitTriggeredEvent(input: {
  scope: RateLimitScope;
  subjectId: string;
  limit: number;
  windowMs: number;
  count: number;
  occurredAt?: Date;
}): RateLimitTriggeredEvent {
  return {
    type: RATE_LIMIT_EVENT.type,
    scope: input.scope,
    subjectId: input.subjectId,
    limit: input.limit,
    windowMs: input.windowMs,
    count: input.count,
    occurredAt: (input.occurredAt ?? new Date()).toISOString(),
  };
}

async function fixedWindowHit(
  store: RateLimitRedisPort,
  key: string,
  windowMs: number,
  nowMs: number,
): Promise<{ count: number; retryAfterSeconds: number }> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const windowStart = Math.floor(nowMs / windowMs);
  const windowKey = `${key}:fw:${windowStart}`;
  const count = await store.incr(windowKey);
  if (count === 1) {
    await store.expire(windowKey, windowSeconds);
  }
  const ttlMs = await store.pttl(windowKey);
  const retryAfterSeconds =
    ttlMs > 0 ? Math.max(1, Math.ceil(ttlMs / 1000)) : windowSeconds;
  return { count, retryAfterSeconds };
}

async function slidingWindowHit(
  store: RateLimitRedisPort,
  key: string,
  windowMs: number,
  nowMs: number,
): Promise<{ count: number; retryAfterSeconds: number }> {
  const minScore = nowMs - windowMs;
  await store.zremrangebyscore(key, 0, minScore);
  const member = `${nowMs}:${randomUUID()}`;
  await store.zadd(key, nowMs, member);
  const count = await store.zcard(key);
  const expireSeconds = Math.max(1, Math.ceil(windowMs / 1000) + 1);
  await store.expire(key, expireSeconds);
  return {
    count,
    retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
  };
}

export class RateLimiter {
  constructor(
    private readonly store: RateLimitRedisPort,
    private readonly defaultEnv: string = "dev",
  ) {}

  async consume(input: ConsumeRateLimitInput): Promise<RateLimitDecision> {
    const policy = RATE_LIMIT_POLICIES[input.scope];
    const nowMs = input.nowMs ?? Date.now();
    const key = buildRateLimitKey({
      env: input.env ?? this.defaultEnv,
      scope: input.scope,
      subjectId: input.subjectId,
    });

    try {
      const hit =
        policy.algorithm === "fixed_window"
          ? await fixedWindowHit(this.store, key, policy.windowMs, nowMs)
          : await slidingWindowHit(this.store, key, policy.windowMs, nowMs);

      const allowed = hit.count <= policy.limit;
      const remaining = Math.max(0, policy.limit - hit.count);
      return {
        allowed,
        scope: policy.scope,
        limit: policy.limit,
        remaining: allowed ? remaining : 0,
        retryAfterSeconds: allowed ? 0 : hit.retryAfterSeconds,
        degradedFailOpen: false,
        deniedFailClosed: false,
      };
    } catch {
      if (policy.failPolicy === "fail_closed") {
        return {
          allowed: false,
          scope: policy.scope,
          limit: policy.limit,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil(policy.windowMs / 1000)),
          degradedFailOpen: false,
          deniedFailClosed: true,
        };
      }
      return {
        allowed: true,
        scope: policy.scope,
        limit: policy.limit,
        remaining: policy.limit,
        retryAfterSeconds: 0,
        degradedFailOpen: true,
        deniedFailClosed: false,
      };
    }
  }
}

/** Factory: production-shaped limiter over any Redis port implementation. */
export function createRateLimiter(
  store: RateLimitRedisPort,
  env: string = "dev",
): RateLimiter {
  return new RateLimiter(store, env);
}

/** Factory: in-memory limiter for unit tests. */
export function createInMemoryRateLimiter(
  env: string = "test",
  clock?: () => number,
): { limiter: RateLimiter; store: InMemoryRateLimitStore } {
  const store = new InMemoryRateLimitStore(clock);
  return { limiter: new RateLimiter(store, env), store };
}

export function assertOtpLimitMatchesPrd(limit: number): void {
  if (limit !== RATE_LIMIT_LIMITS.otpPerMinute) {
    throw new Error(
      `OTP rate limit must be ${RATE_LIMIT_LIMITS.otpPerMinute}/min (ADR-055 / PRD §11.4); got ${limit}.`,
    );
  }
}

export function assertAuthLimitMatchesPrd(limit: number): void {
  if (limit !== RATE_LIMIT_LIMITS.authPerMinute) {
    throw new Error(
      `Auth rate limit must be ${RATE_LIMIT_LIMITS.authPerMinute}/min (ADR-055 / PRD §11.4); got ${limit}.`,
    );
  }
}

export function assertFailClosedOtpPolicy(policy: RateLimitFailPolicy): void {
  if (policy !== "fail_closed") {
    throw new Error(
      `OTP rate limits must fail-closed when Redis is down (ADR-055 / ADR-051); got "${policy}".`,
    );
  }
}

export function assertFailOpenPublicStorefrontPolicy(
  policy: RateLimitFailPolicy,
): void {
  if (policy !== "fail_open") {
    throw new Error(
      `Public storefront rate limits fail-open when Redis is down (ADR-055); got "${policy}".`,
    );
  }
}

export function assertPersianRateLimitMessage(message: string): void {
  if (!/[\u0600-\u06FF]/.test(message)) {
    throw new Error(
      `Rate limit user message must contain Persian script (ADR-055 Iranian First); got "${message}".`,
    );
  }
}
