/**
 * ADR-119 — Security hardening runtime contract tests.
 */

import { describe, expect, it } from "vitest";

import {
  CSRF_HEADER_NAME,
  SECURITY_RUNTIME_MESSAGES_FA,
  buildSecurityHeaders,
  createSecurityErrorBody,
  csrfCookieName,
  isCsrfExemptPath,
  isHttpsEnforcedEnv,
  isOriginAllowed,
  mintCsrfToken,
  readCookieValue,
  requiresCsrfProtection,
  resolveCorsAllowedOrigins,
  resolveDeployEnv,
  validateCsrfDoubleSubmit,
} from "./index.js";

const PERSIAN = /[\u0600-\u06FF]/;

describe("ADR-119 security hardening runtime", () => {
  it("builds Helmet-equivalent headers; HSTS only in staging/production", () => {
    const local = buildSecurityHeaders({
      mosEnv: "local",
      nodeEnv: "development",
    });
    expect(local["Content-Security-Policy"]).toMatch(/default-src 'self'/);
    expect(local["X-Content-Type-Options"]).toBe("nosniff");
    expect(local["X-Frame-Options"]).toBe("DENY");
    expect(local["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(local["Permissions-Policy"]).toMatch(/camera=\(\)/);
    expect(local["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(local["Strict-Transport-Security"]).toBeUndefined();

    const staging = buildSecurityHeaders({
      mosEnv: "staging",
      nodeEnv: "production",
    });
    expect(staging["Strict-Transport-Security"]).toMatch(/max-age=/);
    expect(isHttpsEnforcedEnv("staging")).toBe(true);
    expect(isHttpsEnforcedEnv("production")).toBe(true);
    expect(isHttpsEnforcedEnv("local")).toBe(false);
  });

  it("locks CORS to allowlist (no wildcard)", () => {
    const allowed = resolveCorsAllowedOrigins(
      "https://app.example.ir, https://preview.example.ir",
    );
    expect(allowed).toContain("http://localhost:3000");
    expect(allowed).toContain("https://app.example.ir");
    expect(isOriginAllowed("https://app.example.ir", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil.example", allowed)).toBe(false);
    expect(isOriginAllowed(null, allowed)).toBe(false);
  });

  it("requires CSRF for cookie-session mutations; rejects missing token", () => {
    expect(
      requiresCsrfProtection({
        method: "POST",
        pathname: "/api/v1/pos/sales",
      }),
    ).toBe(true);
    expect(
      requiresCsrfProtection({
        method: "GET",
        pathname: "/api/v1/pos/sales",
      }),
    ).toBe(false);
    expect(
      isCsrfExemptPath("/api/v1/payments/webhooks/zarinpal"),
    ).toBe(true);
    expect(isCsrfExemptPath("/api/auth/callback/credentials")).toBe(true);
    expect(
      requiresCsrfProtection({
        method: "POST",
        pathname: "/api/v1/payments/webhooks/zarinpal",
      }),
    ).toBe(false);

    const missing = validateCsrfDoubleSubmit({
      cookieToken: null,
      headerToken: null,
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) throw new Error("expected fail");
    expect(missing.reason).toBe("missing");
    expect(missing.messageFa).toMatch(PERSIAN);

    const token = mintCsrfToken();
    expect(token.length).toBeGreaterThanOrEqual(16);
    expect(
      validateCsrfDoubleSubmit({ cookieToken: token, headerToken: token }).ok,
    ).toBe(true);
    const mismatch = validateCsrfDoubleSubmit({
      cookieToken: token,
      headerToken: `${token}x`,
    });
    expect(mismatch.ok).toBe(false);
    if (mismatch.ok) throw new Error("expected fail");
    expect(mismatch.messageFa).toMatch(PERSIAN);

    expect(csrfCookieName(false)).toBe("mos.csrf");
    expect(csrfCookieName(true)).toBe("__Host-mos.csrf");
    expect(CSRF_HEADER_NAME).toBe("x-csrf-token");
    expect(
      readCookieValue("a=1; mos.csrf=abc123; b=2", "mos.csrf"),
    ).toBe("abc123");
    // Local parity (MOS_ENV=local) must not force HTTPS cookies even if
    // NODE_ENV=production (Compose production image on http://localhost).
    expect(isHttpsEnforcedEnv(resolveDeployEnv({ mosEnv: "local", nodeEnv: "production" }))).toBe(
      false,
    );
  });

  it("exposes Persian security runtime messages", () => {
    for (const value of Object.values(SECURITY_RUNTIME_MESSAGES_FA)) {
      expect(value).toMatch(PERSIAN);
    }
    const body = createSecurityErrorBody({
      code: "CSRF_REJECTED",
      messageFa: SECURITY_RUNTIME_MESSAGES_FA.csrfMissing,
      correlationId: "corr-sec",
    });
    expect(body.error.code).toBe("CSRF_REJECTED");
    expect(body.error.message).toMatch(PERSIAN);
    expect(body.error.correlationId).toBe("corr-sec");
  });
});
