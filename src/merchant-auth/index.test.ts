import { describe, expect, it } from "vitest";

import {
  MERCHANT_AUTH,
  MERCHANT_AUTH_DECISION,
  MERCHANT_AUTH_UX_NOTES,
  MERCHANT_OTP_ENV_RULES,
  MERCHANT_OTP_RATE_LIMIT,
  assertNeverReturnOtpInProduction,
  assertOtpRateLimitPerMinute,
  assertOtpStrategy,
  assertPasswordlessMvp,
  shouldReturnDevOtp,
  shouldSendSms,
} from "./index.js";

describe("ADR-031 Merchant Authentication contract", () => {
  it("locks OTP-first passwordless MVP (no password)", () => {
    expect(MERCHANT_AUTH_DECISION.strategy).toBe("phone_otp");
    expect(MERCHANT_AUTH_DECISION.passwordAuth).toBe("forbidden_mvp");
    expect(MERCHANT_AUTH_DECISION.session).toBe("jwt_stateless");
    expect(MERCHANT_AUTH_DECISION.sessionImplementation).toBe(
      "adr_033_nextauth_jwt",
    );
    expect(MERCHANT_AUTH_DECISION.separateFromCustomerOtp).toBe(true);
    expect(() => assertOtpStrategy("phone_otp")).not.toThrow();
    expect(() => assertPasswordlessMvp("forbidden_mvp")).not.toThrow();
    expect(() => assertPasswordlessMvp("bcrypt")).toThrow(/forbid/i);
    expect(MERCHANT_AUTH.decision.magicLinkEmail).toBe("rejected_alternative");
  });

  it("documents OTP rate limit 3/min and auth 5/min notes", () => {
    expect(MERCHANT_OTP_RATE_LIMIT.otpRequestsPerMinute).toBe(3);
    expect(MERCHANT_OTP_RATE_LIMIT.authRoutesPerMinute).toBe(5);
    expect(MERCHANT_OTP_RATE_LIMIT.enforcement).toBe("src/rate-limiting");
    expect(MERCHANT_OTP_RATE_LIMIT.enforcementAdr).toBe("ADR-055");
    expect(MERCHANT_OTP_RATE_LIMIT.failPolicyWhenRedisDown).toBe("fail_closed");
    expect(() => assertOtpRateLimitPerMinute(3)).not.toThrow();
    expect(() => assertOtpRateLimitPerMinute(10)).toThrow(/3/);
  });

  it("never returns OTP in production/staging; defers SMS provider to ADR-083", () => {
    expect(MERCHANT_OTP_ENV_RULES.production.returnOtpInApi).toBe(false);
    expect(MERCHANT_OTP_ENV_RULES.development.returnOtpInApi).toBe(true);
    expect(MERCHANT_OTP_ENV_RULES.smsProviderAdr).toBe("ADR-083");
    expect(MERCHANT_OTP_ENV_RULES.smsProviderStatus).toBe("proposed");
    expect(shouldReturnDevOtp("development", undefined, "")).toBe(true);
    expect(shouldReturnDevOtp("production", undefined, "")).toBe(false);
    expect(shouldReturnDevOtp("staging", undefined, "")).toBe(false);
    expect(shouldReturnDevOtp("test", undefined, "")).toBe(false);
    expect(shouldReturnDevOtp("production", "1", "")).toBe(true);
    expect(shouldReturnDevOtp("staging", undefined, "")).toBe(false);
    expect(shouldReturnDevOtp("production", undefined, "local")).toBe(true);
    expect(shouldSendSms("production")).toBe(true);
    expect(shouldSendSms("development")).toBe(false);
    expect(() =>
      assertNeverReturnOtpInProduction("production", true),
    ).toThrow(/never include OTP/i);
    expect(() =>
      assertNeverReturnOtpInProduction("staging", true),
    ).toThrow(/never include OTP/i);
    expect(() =>
      assertNeverReturnOtpInProduction("production", false),
    ).not.toThrow();
  });

  it("notes Persian RTL UX for future login UI", () => {
    expect(MERCHANT_AUTH_UX_NOTES.locale).toBe("fa-IR");
    expect(MERCHANT_AUTH_UX_NOTES.layout).toBe("rtl_first_when_ui_lands");
    expect(MERCHANT_AUTH_UX_NOTES.smsTemplateLanguage).toBe("persian");
    expect(MERCHANT_AUTH_UX_NOTES.phoneFormats).toEqual(
      expect.arrayContaining(["09xxxxxxxxx", "+98xxxxxxxxxx"]),
    );
    expect(MERCHANT_AUTH.module.boundedContext).toBe("identity");
  });
});
