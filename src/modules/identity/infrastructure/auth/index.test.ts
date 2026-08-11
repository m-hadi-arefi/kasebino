/**
 * Tests: ADR-033 identity Auth.js JWT config stub (Credentials OTP bridge).
 */

import { describe, expect, it, vi } from "vitest";

import {
  JWT_SESSION_TTL,
  OTP_CREDENTIALS_BRIDGE,
} from "../../../../nextauth-jwt/index.js";
import type { VerifyMerchantOtpResult } from "../../application/merchant-otp-use-cases.js";
import {
  NEXTAUTH_APP_ROUTER_WIRE_HINT,
  applyMerchantClaimsToSession,
  applyMerchantClaimsToToken,
  createMerchantAuthConfig,
  createMerchantOtpAuthorize,
} from "./index.js";

function verified(
  overrides: Partial<VerifyMerchantOtpResult> = {},
): VerifyMerchantOtpResult {
  return {
    authUserId: "auth-user-1",
    phoneE164: "+989121234567",
    phoneNational: "09121234567",
    tokenVersion: 0,
    event: {
      eventName: "MerchantLoggedIn",
      aggregateId: "auth-user-1",
      aggregateType: "AuthUser",
      payload: {
        authUserId: "auth-user-1",
        phoneE164: "+989121234567",
        merchantId: null,
      },
      occurredAt: new Date("2026-08-03T12:00:00.000Z"),
    } as VerifyMerchantOtpResult["event"],
    ...overrides,
  };
}

/** Auth.js Credentials nests custom id/authorize under `.options` at runtime. */
function credentialsRuntimeOptions(provider: unknown): {
  id?: string;
  authorize?: (
    credentials: Partial<Record<"phone" | "code", unknown>> | undefined,
    request: unknown,
  ) => Promise<unknown>;
} {
  const withOptions = provider as { options?: Record<string, unknown> };
  return (withOptions.options ?? {}) as {
    id?: string;
    authorize?: (
      credentials: Partial<Record<"phone" | "code", unknown>> | undefined,
      request: unknown,
    ) => Promise<unknown>;
  };
}

describe("ADR-033 merchant Auth.js JWT config stub", () => {
  it("uses jwt session strategy, short TTL, no adapter", () => {
    const config = createMerchantAuthConfig({
      verifyOtp: vi.fn(),
      nodeEnv: "development",
      secret: "test-auth-secret-16b",
    });
    expect(config.session.strategy).toBe("jwt");
    expect(config.session.maxAge).toBe(JWT_SESSION_TTL.maxAgeSeconds);
    expect(config.adapter).toBeUndefined();
    expect(config.trustHost).toBe(true);
    expect(config.secret).toBe("test-auth-secret-16b");
    expect(NEXTAUTH_APP_ROUTER_WIRE_HINT).toMatch(/NextAuth/);
  });

  it("wires Credentials OTP provider and secure cookies in production", () => {
    const config = createMerchantAuthConfig({
      verifyOtp: vi.fn(),
      nodeEnv: "production",
      secret: "production-grade-auth-secret-32b",
    });
    expect(config.providers).toHaveLength(1);
    expect(config.providers[0]?.type).toBe("credentials");
    expect(credentialsRuntimeOptions(config.providers[0]).id).toBe(
      OTP_CREDENTIALS_BRIDGE.providerId,
    );
    expect(config.cookies.sessionToken.name).toBe(
      "__Secure-authjs.session-token",
    );
    expect(config.cookies.sessionToken.options).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
    });
  });

  it("authorize bridges verifyOtp success to merchant claim placeholders", async () => {
    const verifyOtp = vi.fn().mockResolvedValue(verified());
    const authorize = createMerchantOtpAuthorize({ verifyOtp });
    const user = await authorize({ phone: "09121234567", code: "123456" });
    expect(verifyOtp).toHaveBeenCalledWith({
      phone: "09121234567",
      code: "123456",
    });
    expect(user).toEqual({
      id: "auth-user-1",
      merchantId: null,
      roles: [],
      storeIds: [],
      tokenVersion: 0,
    });

    const config = createMerchantAuthConfig({
      verifyOtp,
      nodeEnv: "development",
      secret: "test-auth-secret-16b",
    });
    const wired = credentialsRuntimeOptions(config.providers[0]).authorize;
    expect(typeof wired).toBe("function");
  });

  it("authorize returns null when verifyOtp fails", async () => {
    const verifyOtp = vi.fn().mockRejectedValue(new Error("OTP_INVALID"));
    const authorize = createMerchantOtpAuthorize({ verifyOtp });
    const user = await authorize({ phone: "09121234567", code: "000000" });
    expect(user).toBeNull();
  });

  it("jwt/session callbacks copy sub, merchantId, roles, tokenVersion", async () => {
    const config = createMerchantAuthConfig({
      verifyOtp: vi.fn(),
      resolveClaims: () => ({
        merchantId: "merchant-9",
        roles: ["owner"],
      }),
      nodeEnv: "development",
      secret: "test-auth-secret-16b",
    });

    const token = await config.callbacks.jwt({
      token: {},
      user: {
        id: "auth-user-1",
        merchantId: "merchant-9",
        roles: ["owner"],
        tokenVersion: 2,
      },
    });
    expect(token).toMatchObject({
      sub: "auth-user-1",
      merchantId: "merchant-9",
      roles: ["owner"],
      tokenVersion: 2,
    });

    const session = await config.callbacks.session({
      session: { user: { name: null } },
      token,
    });
    expect(session).toMatchObject({
      audience: "merchant",
      merchantId: "merchant-9",
      roles: ["owner"],
      tokenVersion: 2,
      user: {
        id: "auth-user-1",
        merchantId: "merchant-9",
        roles: ["owner"],
        tokenVersion: 2,
      },
    });
  });

  it("claim helpers are pure and round-trip placeholders", () => {
    const token = applyMerchantClaimsToToken(
      {},
      {
        id: "u1",
        merchantId: null,
        roles: [],
        storeIds: [],
        tokenVersion: 0,
      },
    );
    const session = applyMerchantClaimsToSession({ user: {} }, token);
    expect(session.merchantId).toBeNull();
    expect(session.roles).toEqual([]);
    expect(session.tokenVersion).toBe(0);
  });
});
