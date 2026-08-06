/**
 * ADR-095 — auth wiring unit tests (OTP leak, SMS adapter, session guard, config).
 */

import { describe, expect, it, vi } from "vitest";

import { shouldReturnDevOtp } from "../../merchant-auth/index.js";
import { createAppAuthConfig } from "./create-app-auth-config.js";
import {
  AUTH_UX_COPY_FA,
  assertAuthUxUiuxGate,
} from "./auth-ux.js";
import {
  handleMerchantOtpRequest,
  handleCustomerOtpRequest,
} from "./otp-http.js";
import {
  createOtpRuntime,
  resetOtpRuntimeForTests,
} from "./otp-runtime.js";
import {
  customerLoginPath,
  isAdminProtectedPath,
  isCustomerDashboardPath,
  isMerchantProtectedPath,
  isMerchantSession,
  isCustomerSession,
  isPlatformAdminSession,
  merchantIdFromSession,
  merchantLoginPath,
} from "./session-guard.js";
import {
  createMerchantSmsAdapter,
  isConsoleSmsAdapter,
  isLocalSmsEnvironment,
  assertConsoleSmsAllowed,
} from "./sms-adapter-factory.js";

describe("ADR-095 Auth.js wiring support", () => {
  it("never returns OTP for staging/test/production without MOS_RETURN_DEV_OTP=1", () => {
    expect(shouldReturnDevOtp("staging", "", "")).toBe(false);
    expect(shouldReturnDevOtp("test", "", "")).toBe(false);
    expect(shouldReturnDevOtp("production", "", "")).toBe(false);
    expect(shouldReturnDevOtp("development", "", "")).toBe(true);
    expect(shouldReturnDevOtp("staging", "1", "")).toBe(true);
    // Docker local parity: production image + MOS_ENV=local
    expect(shouldReturnDevOtp("production", "", "local")).toBe(true);
  });

  it("uses Console SMS only in local/development", () => {
    expect(isLocalSmsEnvironment({ mosEnv: "local", nodeEnv: "production" })).toBe(
      true,
    );
    expect(
      isLocalSmsEnvironment({ mosEnv: "staging", nodeEnv: "production" }),
    ).toBe(false);
    expect(
      isConsoleSmsAdapter(
        createMerchantSmsAdapter({ mosEnv: "local", nodeEnv: "development" }),
      ),
    ).toBe(true);
    expect(
      isConsoleSmsAdapter(
        createMerchantSmsAdapter({ mosEnv: "staging", nodeEnv: "production" }),
      ),
    ).toBe(false);
    expect(() =>
      assertConsoleSmsAllowed({ mosEnv: "staging", nodeEnv: "production" }),
    ).toThrow(/Console SMS/);
  });

  it("protects merchant and customer dashboard paths", () => {
    expect(isMerchantProtectedPath("/dashboard")).toBe(true);
    expect(isMerchantProtectedPath("/pos")).toBe(true);
    expect(isMerchantProtectedPath("/products")).toBe(true);
    expect(isMerchantProtectedPath("/products/new")).toBe(true);
    expect(isMerchantProtectedPath("/inventory")).toBe(true);
    expect(isMerchantProtectedPath("/customers")).toBe(true);
    expect(isMerchantProtectedPath("/customers/mem-1")).toBe(true);
    expect(isMerchantProtectedPath("/loyalty")).toBe(true);
    expect(isMerchantProtectedPath("/orders")).toBe(true);
    expect(isMerchantProtectedPath("/stores")).toBe(true);
    expect(isMerchantProtectedPath("/stores/s1/qr")).toBe(true);
    expect(isMerchantProtectedPath("/admin")).toBe(false);
    expect(isAdminProtectedPath("/admin")).toBe(true);
    expect(isAdminProtectedPath("/admin/merchants")).toBe(true);
    expect(isMerchantProtectedPath("/login")).toBe(false);
    expect(isCustomerDashboardPath("/s/demo/dashboard")).toBe(true);
    expect(isCustomerDashboardPath("/s/demo/dashboard/orders")).toBe(true);
    expect(isCustomerDashboardPath("/s/demo/catalog")).toBe(false);
    expect(merchantLoginPath("/dashboard")).toContain("callbackUrl");
    expect(customerLoginPath("demo")).toBe("/s/demo/login");
  });

  it("detects platform_admin sessions for admin UI gate", () => {
    expect(
      isPlatformAdminSession({
        user: { id: "a1", roles: ["platform_admin"] },
        roles: ["platform_admin"],
      }),
    ).toBe(true);
    expect(
      isPlatformAdminSession({
        audience: "merchant",
        user: { id: "u1", merchantId: "m1", roles: ["merchant_owner"] },
        roles: ["merchant_owner"],
      }),
    ).toBe(false);
  });

  it("classifies merchant vs customer sessions and merchantId for realtime", () => {
    expect(
      isMerchantSession({
        audience: "merchant",
        user: { id: "u1", tokenVersion: 0 },
        tokenVersion: 0,
      }),
    ).toBe(true);
    expect(
      isCustomerSession({
        audience: "customer",
        role: "customer",
        user: { id: "c1", role: "customer", tokenVersion: 1 },
        tokenVersion: 1,
      }),
    ).toBe(true);
    expect(
      merchantIdFromSession({
        audience: "merchant",
        merchantId: "m-9",
        user: { id: "u1", merchantId: "m-9" },
      }),
    ).toBe("m-9");
    expect(
      merchantIdFromSession({
        audience: "merchant",
        user: { id: "u1", merchantId: null },
      }),
    ).toBeNull();
    // Unauthenticated / header bypass removed — null session yields null
    expect(merchantIdFromSession(null)).toBeNull();
  });

  it("builds dual-provider Auth.js config with tokenVersion claims", async () => {
    const verifyMerchant = vi.fn().mockResolvedValue({
      authUserId: "auth-1",
      phoneE164: "+989121234567",
      phoneNational: "09121234567",
      tokenVersion: 3,
      event: {
        eventName: "MerchantLoggedIn",
        aggregateId: "auth-1",
        aggregateType: "AuthUser",
        payload: {
          authUserId: "auth-1",
          phoneE164: "+989121234567",
          merchantId: null,
        },
        occurredAt: new Date(),
      },
    });
    const verifyCustomer = vi.fn().mockResolvedValue({
      customerIdentityId: "cust-1",
      phoneE164: "+989121234567",
      phoneNational: "09121234567",
      role: "customer",
      tokenVersion: 2,
      event: {
        eventName: "CustomerLoggedIn",
        aggregateId: "cust-1",
        aggregateType: "CustomerIdentity",
        payload: {
          customerIdentityId: "cust-1",
          phoneE164: "+989121234567",
          storeId: "store-1",
        },
        occurredAt: new Date(),
      },
    });

    const config = createAppAuthConfig({
      merchant: {
        verifyOtp: verifyMerchant,
        nodeEnv: "development",
        secret: "test-auth-secret-16bytes!!",
      },
      customer: {
        verifyOtp: verifyCustomer,
        nodeEnv: "development",
        secret: "test-auth-secret-16bytes!!",
      },
    });

    expect(config.providers).toHaveLength(2);
    expect(config.session?.strategy).toBe("jwt");
    expect(config.cookies?.sessionToken?.options?.httpOnly).toBe(true);
    expect(config.adapter).toBeUndefined();

    const merchantToken = await config.callbacks.jwt({
      token: {},
      user: {
        id: "auth-1",
        merchantId: null,
        roles: [],
        tokenVersion: 3,
      },
    });
    expect(merchantToken).toMatchObject({
      sub: "auth-1",
      tokenVersion: 3,
      audience: "merchant",
    });

    const customerToken = await config.callbacks.jwt({
      token: {},
      user: {
        id: "cust-1",
        role: "customer",
        tokenVersion: 2,
        storeId: "store-1",
        audience: "customer",
      },
    });
    expect(customerToken).toMatchObject({
      sub: "cust-1",
      role: "customer",
      tokenVersion: 2,
      audience: "customer",
    });
  });

  it("OTP HTTP request omits devOtp for staging runtime", async () => {
    resetOtpRuntimeForTests();
    const stagingRuntime = createOtpRuntime({
      forceInMemory: true,
      env: { NODE_ENV: "test", MOS_ENV: "staging" },
      smsEnv: { mosEnv: "staging", nodeEnv: "test" },
    });
    const result = await handleMerchantOtpRequest(
      {
        method: "POST",
        headers: { get: () => null },
        async json() {
          return { phone: "09121234567" };
        },
      },
      stagingRuntime,
    );
    expect(result.status).toBe(200);
    if (!("data" in result.body)) {
      throw new Error("expected success envelope");
    }
    expect(result.body.data.devOtp).toBeUndefined();

    const customerDenied = await handleCustomerOtpRequest(
      {
        method: "POST",
        headers: { get: () => null },
        async json() {
          return { phone: "09121234567", consentCheckboxAccepted: false };
        },
      },
      stagingRuntime,
    );
    expect(customerDenied.status).toBe(400);
  });

  it("passes Persian RTL uiuxpromax gate for auth UX", () => {
    assertAuthUxUiuxGate();
    expect(AUTH_UX_COPY_FA.merchantTitle).toMatch(/[\u0600-\u06FF]/);
    expect(AUTH_UX_COPY_FA.consentLabel).toMatch(/[\u0600-\u06FF]/);
  });
});
