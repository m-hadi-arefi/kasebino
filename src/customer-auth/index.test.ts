import { describe, expect, it } from "vitest";

import {
  CUSTOMER_AUTH,
  CUSTOMER_AUTH_API_PATHS,
  CUSTOMER_AUTH_DECISION,
  CUSTOMER_AUTH_UX_NOTES,
  CUSTOMER_JWT_CLAIMS_CONTRACT,
  CUSTOMER_OTP_ENV_RULES,
  CUSTOMER_OTP_RATE_LIMIT,
  assertCannotCallMerchantApis,
  assertCustomerJwtRole,
  assertExplicitConsentCheckbox,
  assertNeverReturnOtpInProduction,
  assertOtpRateLimitPerMinute,
  assertOtpStrategy,
  assertPasswordlessMvp,
  assertSeparateFromMerchantOtp,
  shouldReturnDevOtp,
  shouldSendSms,
} from "./index.js";

describe("ADR-032 Customer SMS OTP Authentication contract", () => {
  it("locks OTP-first customer audience with role=customer (separate from merchant)", () => {
    expect(CUSTOMER_AUTH_DECISION.strategy).toBe("phone_otp");
    expect(CUSTOMER_AUTH_DECISION.passwordAuth).toBe("forbidden_mvp");
    expect(CUSTOMER_AUTH_DECISION.audience).toBe("customer");
    expect(CUSTOMER_AUTH_DECISION.jwtRole).toBe("customer");
    expect(CUSTOMER_AUTH_DECISION.separateFromMerchantOtp).toBe(true);
    expect(CUSTOMER_AUTH_DECISION.cannotCallMerchantApis).toBe(true);
    expect(CUSTOMER_AUTH_DECISION.customerAuthModule).toBe(
      "src/modules/customer-identity",
    );
    expect(CUSTOMER_AUTH_DECISION.merchantAuthModule).toBe(
      "src/modules/identity",
    );
    expect(CUSTOMER_JWT_CLAIMS_CONTRACT.role).toBe("customer");
    expect(CUSTOMER_JWT_CLAIMS_CONTRACT.merchantIdClaim).toBe("forbidden");
    expect(() => assertOtpStrategy("phone_otp")).not.toThrow();
    expect(() => assertPasswordlessMvp("forbidden_mvp")).not.toThrow();
    expect(() => assertPasswordlessMvp("bcrypt")).toThrow(/forbid/i);
    expect(() => assertCustomerJwtRole("customer")).not.toThrow();
    expect(() => assertCustomerJwtRole("owner")).toThrow(/customer/);
    expect(() => assertSeparateFromMerchantOtp(true)).not.toThrow();
    expect(() => assertSeparateFromMerchantOtp(false)).toThrow(/separate/);
    expect(() => assertCannotCallMerchantApis(true)).not.toThrow();
    expect(() => assertCannotCallMerchantApis(false)).toThrow(/merchant APIs/);
  });

  it("requires explicit digital consent checkbox (ADR-091)", () => {
    expect(CUSTOMER_AUTH_DECISION.consent.mandatoryCheckbox).toBe(true);
    expect(CUSTOMER_AUTH_DECISION.consent.pattern).toBe(
      "explicit_checkbox_before_otp",
    );
    expect(CUSTOMER_AUTH_DECISION.consent.policyAdr).toBe("ADR-091");
    expect(CUSTOMER_AUTH_DECISION.consent.checkboxLabelFa).toMatch(
      /[\u0600-\u06FF]/,
    );
    expect(CUSTOMER_AUTH_UX_NOTES.consentCheckboxRequired).toBe(true);
    expect(() => assertExplicitConsentCheckbox(true)).not.toThrow();
    expect(() => assertExplicitConsentCheckbox(false)).toThrow(/consent/i);
  });

  it("documents distinct customer auth API paths (not merchant /api/v1/auth)", () => {
    expect(CUSTOMER_AUTH_API_PATHS.otpRequest).toBe(
      "/api/v1/customer/auth/otp/request",
    );
    expect(CUSTOMER_AUTH_API_PATHS.otpVerify).toBe(
      "/api/v1/customer/auth/otp/verify",
    );
    expect(CUSTOMER_AUTH_API_PATHS.logout).toBe(
      "/api/v1/customer/auth/logout",
    );
    expect(CUSTOMER_AUTH_API_PATHS.otpRequest).not.toContain("/api/v1/auth/");
    expect(CUSTOMER_AUTH.events.loggedIn).toBe("CustomerLoggedIn");
  });

  it("documents OTP rate limit 3/min and never returns OTP in production/staging", () => {
    expect(CUSTOMER_OTP_RATE_LIMIT.otpRequestsPerMinute).toBe(3);
    expect(CUSTOMER_OTP_RATE_LIMIT.authRoutesPerMinute).toBe(5);
    expect(CUSTOMER_OTP_RATE_LIMIT.redisKeyHint).toContain("customer-otp");
    expect(() => assertOtpRateLimitPerMinute(3)).not.toThrow();
    expect(() => assertOtpRateLimitPerMinute(10)).toThrow(/3/);
    expect(CUSTOMER_OTP_ENV_RULES.production.returnOtpInApi).toBe(false);
    expect(CUSTOMER_OTP_ENV_RULES.smsProviderAdr).toBe("ADR-083");
    expect(shouldReturnDevOtp("development", undefined, "")).toBe(true);
    expect(shouldReturnDevOtp("production", undefined, "")).toBe(false);
    expect(shouldReturnDevOtp("staging", undefined, "")).toBe(false);
    expect(shouldReturnDevOtp("test", undefined, "")).toBe(false);
    expect(shouldReturnDevOtp("staging", "1", "")).toBe(true);
    expect(shouldReturnDevOtp("production", undefined, "local")).toBe(true);
    expect(shouldSendSms("production")).toBe(true);
    expect(() =>
      assertNeverReturnOtpInProduction("production", true),
    ).toThrow(/never include OTP/i);
    expect(() =>
      assertNeverReturnOtpInProduction("staging", true),
    ).toThrow(/never include OTP/i);
  });

  it("notes Persian RTL UX for future storefront OTP screens", () => {
    expect(CUSTOMER_AUTH_UX_NOTES.locale).toBe("fa-IR");
    expect(CUSTOMER_AUTH_UX_NOTES.layout).toBe("rtl_first_when_ui_lands");
    expect(CUSTOMER_AUTH_UX_NOTES.smsTemplateLanguage).toBe("persian");
    expect(CUSTOMER_AUTH.module.boundedContext).toBe("identity_customer");
  });
});
