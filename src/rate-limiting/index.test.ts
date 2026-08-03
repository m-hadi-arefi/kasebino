import { describe, expect, it } from "vitest";

import { API_ERROR_MESSAGES_FA } from "../api-standards/index.js";
import { MERCHANT_OTP_RATE_LIMIT } from "../merchant-auth/index.js";
import { FAILURE_MODES } from "../redis-architecture/index.js";
import {
  RATE_LIMITING,
  RATE_LIMIT_KEY,
  RATE_LIMIT_LIMITS,
  RATE_LIMIT_MESSAGES_FA,
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_EVENT,
  RATE_LIMIT_HTTP,
  assertAuthLimitMatchesPrd,
  assertFailClosedOtpPolicy,
  assertFailOpenPublicStorefrontPolicy,
  assertOtpLimitMatchesPrd,
  assertPersianRateLimitMessage,
  buildRateLimitKey,
  classifyRateLimitScope,
  createInMemoryRateLimiter,
  createRateLimitTriggeredEvent,
  createRateLimitedEnvelope,
  createRateLimiter,
  hashRateLimitSubject,
  messageFaForScope,
  type RateLimitRedisPort,
} from "./index.js";

describe("ADR-055 Rate Limiting Strategy", () => {
  it("locks PRD §11.4 limits and OTP/auth merchant-auth alignment", () => {
    expect(RATE_LIMIT_LIMITS.otpPerMinute).toBe(3);
    expect(RATE_LIMIT_LIMITS.authPerMinute).toBe(5);
    expect(RATE_LIMIT_LIMITS.defaultRps).toBe(10);
    expect(RATE_LIMIT_LIMITS.adminRps).toBe(20);
    expect(RATE_LIMITING.otpAlignsWithMerchantAuth).toBe(true);
    expect(RATE_LIMIT_LIMITS.otpPerMinute).toBe(
      MERCHANT_OTP_RATE_LIMIT.otpRequestsPerMinute,
    );
    expect(RATE_LIMIT_LIMITS.authPerMinute).toBe(
      MERCHANT_OTP_RATE_LIMIT.authRoutesPerMinute,
    );
    expect(() => assertOtpLimitMatchesPrd(3)).not.toThrow();
    expect(() => assertOtpLimitMatchesPrd(10)).toThrow(/3/);
    expect(() => assertAuthLimitMatchesPrd(5)).not.toThrow();
    expect(() => assertAuthLimitMatchesPrd(1)).toThrow(/5/);
  });

  it("uses fixed window for OTP/auth and sliding for RPS scopes", () => {
    expect(RATE_LIMIT_POLICIES.otp.algorithm).toBe("fixed_window");
    expect(RATE_LIMIT_POLICIES.auth.algorithm).toBe("fixed_window");
    expect(RATE_LIMIT_POLICIES.default.algorithm).toBe("sliding_window");
    expect(RATE_LIMIT_POLICIES.admin.algorithm).toBe("sliding_window");
    expect(RATE_LIMIT_POLICIES.public_storefront.algorithm).toBe(
      "sliding_window",
    );
    expect(RATE_LIMIT_POLICIES.otp.failPolicy).toBe("fail_closed");
    expect(RATE_LIMIT_POLICIES.auth.failPolicy).toBe("fail_closed");
    expect(RATE_LIMIT_POLICIES.public_storefront.failPolicy).toBe("fail_open");
    expect(RATE_LIMITING.failureAlignment.otpAuth).toBe(
      FAILURE_MODES.authAndOtpRateLimits.policy,
    );
    expect(() => assertFailClosedOtpPolicy("fail_closed")).not.toThrow();
    expect(() => assertFailClosedOtpPolicy("fail_open")).toThrow(/fail-closed/i);
    expect(() =>
      assertFailOpenPublicStorefrontPolicy("fail_open"),
    ).not.toThrow();
    expect(() =>
      assertFailOpenPublicStorefrontPolicy("fail_closed"),
    ).toThrow(/fail-open/i);
  });

  it("builds mos:{env}:rl:{scope}:{id} keys and hashes subjects", () => {
    expect(RATE_LIMIT_KEY.pattern).toBe("mos:{env}:rl:{scope}:{id}");
    expect(
      buildRateLimitKey({
        env: "dev",
        scope: "otp",
        subjectId: "abc",
      }),
    ).toBe("mos:dev:rl:otp:abc");
    const hashed = hashRateLimitSubject("+989121234567");
    expect(hashed).toHaveLength(32);
    expect(hashed).not.toContain("+98");
    expect(() =>
      buildRateLimitKey({ env: "dev", scope: "otp", subjectId: "  " }),
    ).toThrow(/subjectId/);
  });

  it("classifies auth/OTP/admin/storefront paths", () => {
    expect(classifyRateLimitScope("/api/v1/auth/otp/request")).toBe("otp");
    expect(classifyRateLimitScope("/api/v1/auth/otp/verify")).toBe("otp");
    expect(classifyRateLimitScope("/api/v1/auth/logout")).toBe("auth");
    expect(classifyRateLimitScope("/api/v1/admin/merchants")).toBe("admin");
    expect(classifyRateLimitScope("/s/my-shop")).toBe("public_storefront");
    expect(classifyRateLimitScope("/api/v1/sf/catalog")).toBe(
      "public_storefront",
    );
    expect(classifyRateLimitScope("/api/v1/products")).toBe("default");
  });

  it("fixed-window OTP allows 3/min then denies", async () => {
    let now = 1_700_000_000_000;
    const { limiter } = createInMemoryRateLimiter("test", () => now);

    for (let i = 0; i < 3; i += 1) {
      const decision = await limiter.consume({
        scope: "otp",
        subjectId: "phone-hash",
        nowMs: now,
      });
      expect(decision.allowed).toBe(true);
      expect(decision.remaining).toBe(3 - (i + 1));
    }

    const blocked = await limiter.consume({
      scope: "otp",
      subjectId: "phone-hash",
      nowMs: now,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    now += 60_000;
    const afterWindow = await limiter.consume({
      scope: "otp",
      subjectId: "phone-hash",
      nowMs: now,
    });
    expect(afterWindow.allowed).toBe(true);
  });

  it("sliding-window default allows 10 rps then denies", async () => {
    const now = 1_700_000_100_000;
    const { limiter } = createInMemoryRateLimiter("test", () => now);

    for (let i = 0; i < 10; i += 1) {
      const decision = await limiter.consume({
        scope: "default",
        subjectId: "10.0.0.1",
        nowMs: now + i,
      });
      expect(decision.allowed).toBe(true);
    }

    const blocked = await limiter.consume({
      scope: "default",
      subjectId: "10.0.0.1",
      nowMs: now + 11,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("auth fixed-window trips at 5/min; admin sliding at 20 rps", async () => {
    const now = 1_700_000_200_000;
    const { limiter } = createInMemoryRateLimiter("test", () => now);

    for (let i = 0; i < 5; i += 1) {
      expect(
        (
          await limiter.consume({
            scope: "auth",
            subjectId: "ip-1",
            nowMs: now,
          })
        ).allowed,
      ).toBe(true);
    }
    expect(
      (
        await limiter.consume({
          scope: "auth",
          subjectId: "ip-1",
          nowMs: now,
        })
      ).allowed,
    ).toBe(false);

    for (let i = 0; i < 20; i += 1) {
      expect(
        (
          await limiter.consume({
            scope: "admin",
            subjectId: "admin-1",
            nowMs: now + i,
          })
        ).allowed,
      ).toBe(true);
    }
    expect(
      (
        await limiter.consume({
          scope: "admin",
          subjectId: "admin-1",
          nowMs: now + 21,
        })
      ).allowed,
    ).toBe(false);
  });

  it("fail-closed OTP denies when store throws; fail-open storefront allows", async () => {
    const throwing: RateLimitRedisPort = {
      incr: async () => {
        throw new Error("redis down");
      },
      expire: async () => {
        throw new Error("redis down");
      },
      pttl: async () => {
        throw new Error("redis down");
      },
      zremrangebyscore: async () => {
        throw new Error("redis down");
      },
      zadd: async () => {
        throw new Error("redis down");
      },
      zcard: async () => {
        throw new Error("redis down");
      },
    };
    const limiter = createRateLimiter(throwing, "test");

    const otp = await limiter.consume({
      scope: "otp",
      subjectId: "x",
    });
    expect(otp.allowed).toBe(false);
    expect(otp.deniedFailClosed).toBe(true);

    const auth = await limiter.consume({
      scope: "auth",
      subjectId: "x",
    });
    expect(auth.allowed).toBe(false);
    expect(auth.deniedFailClosed).toBe(true);

    const storefront = await limiter.consume({
      scope: "public_storefront",
      subjectId: "x",
    });
    expect(storefront.allowed).toBe(true);
    expect(storefront.degradedFailOpen).toBe(true);

    const def = await limiter.consume({
      scope: "default",
      subjectId: "x",
    });
    expect(def.allowed).toBe(true);
    expect(def.degradedFailOpen).toBe(true);
  });

  it("ships Persian 429 messages and RATE_LIMITED envelopes", () => {
    for (const message of Object.values(RATE_LIMIT_MESSAGES_FA)) {
      expect(() => assertPersianRateLimitMessage(message)).not.toThrow();
    }
    expect(messageFaForScope("otp")).toBe(RATE_LIMIT_MESSAGES_FA.otp);
    expect(messageFaForScope("auth")).toBe(RATE_LIMIT_MESSAGES_FA.auth);
    expect(messageFaForScope("default")).toBe(RATE_LIMIT_MESSAGES_FA.generic);
    expect(RATE_LIMIT_MESSAGES_FA.generic).toBe(
      API_ERROR_MESSAGES_FA.RATE_LIMITED,
    );

    const envelope = createRateLimitedEnvelope({
      scope: "otp",
      correlationId: "corr-1",
      retryAfterSeconds: 42,
    });
    expect(envelope.error.code).toBe(RATE_LIMIT_HTTP.errorCode);
    expect(envelope.error.message).toBe(RATE_LIMIT_MESSAGES_FA.otp);
    expect(envelope.error.correlationId).toBe("corr-1");
    expect(envelope.error.details).toEqual({
      scope: "otp",
      retryAfterSeconds: 42,
    });

    const unavailable = createRateLimitedEnvelope({
      scope: "otp",
      retryAfterSeconds: 60,
      unavailable: true,
    });
    expect(unavailable.error.message).toBe(
      RATE_LIMIT_MESSAGES_FA.unavailableFailClosed,
    );

    expect(() => assertPersianRateLimitMessage("Too many requests")).toThrow(
      /Persian/,
    );
  });

  it("builds RateLimitTriggered security event payloads", () => {
    const event = createRateLimitTriggeredEvent({
      scope: "otp",
      subjectId: hashRateLimitSubject("0912"),
      limit: 3,
      windowMs: 60_000,
      count: 4,
      occurredAt: new Date("2026-08-03T12:00:00.000Z"),
    });
    expect(event.type).toBe(RATE_LIMIT_EVENT.type);
    expect(event.scope).toBe("otp");
    expect(event.count).toBe(4);
    expect(event.occurredAt).toBe("2026-08-03T12:00:00.000Z");
    expect(RATE_LIMIT_EVENT.emitViaAuditPort).toBe(true);
    expect(RATE_LIMIT_EVENT.auditAdr).toBe("ADR-058");
    expect(RATE_LIMIT_EVENT.auditPackage).toBe("src/audit-logging/");
    expect(RATE_LIMIT_EVENT.securityMonitoringDeferredTo).toBe("ARD-026");
  });
});
