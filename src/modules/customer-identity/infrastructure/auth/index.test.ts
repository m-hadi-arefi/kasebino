/**
 * ADR-095 customer Auth.js JWT config.
 */

import { describe, expect, it, vi } from "vitest";

import { JWT_SESSION_TTL } from "../../../../infrastructure/auth/contracts/nextauth-jwt/index.js";
import type { VerifyCustomerOtpResult } from "../../application/customer-otp-use-cases.js";
import {
  CUSTOMER_OTP_CREDENTIALS_BRIDGE,
  createCustomerAuthConfig,
  createCustomerOtpAuthorize,
} from "./index.js";

function verified(
  overrides: Partial<VerifyCustomerOtpResult> = {},
): VerifyCustomerOtpResult {
  return {
    customerIdentityId: "cust-1",
    phoneE164: "+989121234567",
    phoneNational: "09121234567",
    role: "customer",
    tokenVersion: 1,
    event: {
      eventName: "CustomerLoggedIn",
      aggregateId: "cust-1",
      aggregateType: "CustomerIdentity",
      payload: {
        customerIdentityId: "cust-1",
        phoneE164: "+989121234567",
        storeId: "store-a",
      },
      occurredAt: new Date("2026-08-03T12:00:00.000Z"),
    } as VerifyCustomerOtpResult["event"],
    ...overrides,
  };
}

function credentialsRuntimeOptions(provider: unknown): {
  id?: string;
  authorize?: (
    credentials: Partial<Record<string, unknown>> | undefined,
    request: unknown,
  ) => Promise<unknown>;
} {
  const withOptions = provider as { options?: Record<string, unknown> };
  return (withOptions.options ?? {}) as {
    id?: string;
    authorize?: (
      credentials: Partial<Record<string, unknown>> | undefined,
      request: unknown,
    ) => Promise<unknown>;
  };
}

describe("ADR-095 customer Auth.js JWT config", () => {
  it("uses jwt strategy, short TTL, customer-otp provider, secure cookies", () => {
    const config = createCustomerAuthConfig({
      verifyOtp: vi.fn(),
      nodeEnv: "production",
      secret: "production-grade-auth-secret-32b",
    });
    expect(config.session.strategy).toBe("jwt");
    expect(config.session.maxAge).toBe(JWT_SESSION_TTL.maxAgeSeconds);
    expect(config.adapter).toBeUndefined();
    expect(credentialsRuntimeOptions(config.providers[0]).id).toBe(
      CUSTOMER_OTP_CREDENTIALS_BRIDGE.providerId,
    );
    expect(config.cookies.sessionToken.options.secure).toBe(true);
    expect(config.cookies.sessionToken.options.httpOnly).toBe(true);
  });

  it("authorize bridges verifyOtp to customer audience claims with tokenVersion", async () => {
    const verifyOtp = vi.fn().mockResolvedValue(verified());
    const authorize = createCustomerOtpAuthorize({ verifyOtp });
    const user = await authorize({
      phone: "09121234567",
      code: "123456",
      consentCheckboxAccepted: "true",
      storeId: "store-a",
    });
    expect(user).toEqual({
      id: "cust-1",
      role: "customer",
      tokenVersion: 1,
      storeId: "store-a",
      audience: "customer",
    });
  });

  it("jwt/session callbacks keep customer audience (no merchantId)", async () => {
    const config = createCustomerAuthConfig({
      verifyOtp: vi.fn(),
      nodeEnv: "development",
      secret: "test-auth-secret-16b",
    });
    const token = await config.callbacks.jwt({
      token: {},
      user: {
        id: "cust-1",
        role: "customer",
        tokenVersion: 4,
        storeId: "s1",
        audience: "customer",
      },
    });
    expect(token).toMatchObject({
      sub: "cust-1",
      role: "customer",
      tokenVersion: 4,
      audience: "customer",
    });
    expect(token.merchantId).toBeUndefined();

    const session = await config.callbacks.session({
      session: { user: {} },
      token,
    });
    expect(session).toMatchObject({
      audience: "customer",
      role: "customer",
      tokenVersion: 4,
    });
  });
});
