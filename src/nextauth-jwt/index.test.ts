/**
 * Tests: ADR-033 NextAuth JWT contract (claims, strategy, secure cookies).
 */

import { describe, expect, it } from "vitest";

import {
  JWT_CLAIM_KEYS,
  JWT_SESSION_TTL,
  NEXTAUTH_ENV,
  NEXTAUTH_JWT,
  NEXTAUTH_JWT_DECISION,
  NEXTAUTH_JWT_UX_NOTES,
  OTP_CREDENTIALS_BRIDGE,
  SECURE_COOKIE_RULES,
  assertAuthSecretEnvKey,
  assertJwtSessionStrategy,
  assertNoDatabaseSessionStore,
  assertRequiredJwtClaims,
  assertSecureCookieOptions,
  assertShortSessionTtl,
  buildMerchantJwtClaims,
  isTokenVersionAccepted,
  sessionCookieSecure,
} from "./index.js";

describe("ADR-033 NextAuth JWT contract", () => {
  it("locks JWT strategy and forbids database session store", () => {
    expect(NEXTAUTH_JWT_DECISION.strategy).toBe("jwt");
    expect(NEXTAUTH_JWT_DECISION.databaseSessionStore).toBe("forbidden");
    expect(NEXTAUTH_JWT_DECISION.adapterRequired).toBe(false);
    expect(NEXTAUTH_JWT_DECISION.authJsMajor).toBe(5);
    expect(NEXTAUTH_JWT_DECISION.logoutAllMechanism).toBe(
      "tokenVersion_bump",
    );
    expect(() => assertJwtSessionStrategy("jwt")).not.toThrow();
    expect(() => assertJwtSessionStrategy("database")).toThrow(/jwt/i);
    expect(() => assertNoDatabaseSessionStore("forbidden")).not.toThrow();
    expect(() => assertNoDatabaseSessionStore(false)).not.toThrow();
    expect(() => assertNoDatabaseSessionStore("database")).toThrow(
      /forbidden/i,
    );
    expect(() => assertNoDatabaseSessionStore(true)).toThrow(/forbidden/i);
  });

  it("requires sub, merchantId, roles, tokenVersion claims (placeholders allowed)", () => {
    expect(JWT_CLAIM_KEYS).toEqual([
      "sub",
      "merchantId",
      "roles",
      "storeIds",
      "tokenVersion",
    ]);
    const claims = buildMerchantJwtClaims({
      authUserId: "user-1",
      tokenVersion: 0,
    });
    expect(claims).toEqual({
      sub: "user-1",
      merchantId: null,
      roles: [],
      storeIds: [],
      tokenVersion: 0,
    });
    expect(() => assertRequiredJwtClaims(claims)).not.toThrow();
    expect(() =>
      assertRequiredJwtClaims({
        sub: "x",
        merchantId: null,
        roles: ["owner"],
        storeIds: [],
        tokenVersion: 1,
      }),
    ).not.toThrow();
    expect(() =>
      assertRequiredJwtClaims({
        sub: "",
        merchantId: null,
        roles: [],
        storeIds: [],
        tokenVersion: 0,
      }),
    ).toThrow(/sub/);
    expect(() =>
      assertRequiredJwtClaims({
        sub: "x",
        merchantId: null,
        roles: [],
        storeIds: [],
        tokenVersion: -1,
      }),
    ).toThrow(/tokenVersion/);
  });

  it("enforces short TTL and AUTH_SECRET binding", () => {
    expect(JWT_SESSION_TTL.maxAgeSeconds).toBe(8 * 60 * 60);
    expect(JWT_SESSION_TTL.shortTtlRequired).toBe(true);
    expect(() =>
      assertShortSessionTtl(JWT_SESSION_TTL.maxAgeSeconds),
    ).not.toThrow();
    expect(() => assertShortSessionTtl(30 * 24 * 60 * 60)).toThrow(/maxAge/);
    expect(NEXTAUTH_ENV.secretEnv).toBe("AUTH_SECRET");
    expect(() => assertAuthSecretEnvKey("AUTH_SECRET")).not.toThrow();
    expect(() => assertAuthSecretEnvKey("NEXTAUTH_SECRET")).toThrow(
      /AUTH_SECRET/,
    );
  });

  it("requires secure httpOnly cookies in production", () => {
    expect(SECURE_COOKIE_RULES.httpOnly).toBe(true);
    expect(SECURE_COOKIE_RULES.secureInProduction).toBe(true);
    expect(SECURE_COOKIE_RULES.sameSite).toBe("lax");
    expect(sessionCookieSecure("production")).toBe(true);
    expect(sessionCookieSecure("development")).toBe(false);
    expect(() =>
      assertSecureCookieOptions({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        nodeEnv: "production",
      }),
    ).not.toThrow();
    expect(() =>
      assertSecureCookieOptions({
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        nodeEnv: "production",
      }),
    ).toThrow(/secure/i);
    expect(() =>
      assertSecureCookieOptions({
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        path: "/",
        nodeEnv: "production",
      }),
    ).toThrow(/httpOnly/i);
  });

  it("documents OTP credentials bridge and Persian UX notes for later UI", () => {
    expect(OTP_CREDENTIALS_BRIDGE.providerId).toBe("merchant-otp");
    expect(OTP_CREDENTIALS_BRIDGE.credentialFields).toEqual(["phone", "code"]);
    expect(OTP_CREDENTIALS_BRIDGE.noPasswordCredential).toBe(true);
    expect(OTP_CREDENTIALS_BRIDGE.noEmailProvider).toBe(true);
    expect(NEXTAUTH_JWT_UX_NOTES.locale).toBe("fa-IR");
    expect(NEXTAUTH_JWT_UX_NOTES.sessionExpiryMessaging).toBe(
      "persian_when_ui_lands",
    );
    expect(NEXTAUTH_JWT_UX_NOTES.cookiesSecureForIranianMobileHttps).toBe(
      true,
    );
    expect(NEXTAUTH_JWT.module.authConfigPath).toContain("identity");
  });

  it("accepts tokenVersion match for logout-all rotation", () => {
    expect(isTokenVersionAccepted(0, 0)).toBe(true);
    expect(isTokenVersionAccepted(1, 2)).toBe(false);
  });
});
