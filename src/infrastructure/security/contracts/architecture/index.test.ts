/**
 * Tests: ADR-076 Security Architecture contract
 * (defense in depth, OTP hygiene, HTTPS cookies, headers, Iranian OTP threats).
 */
import { describe, expect, it } from "vitest";

import { SECURITY_API_RULES } from "../../../../shared/contracts/api-standards/index.js";
import { EXCLUSIVE_SQL_ORM } from "../../../database/contracts/drizzle-strategy/index.js";
import { MERCHANT_OTP_RATE_LIMIT } from "../../../../modules/identity/domain/merchant-auth/index.js";
import { SECURE_COOKIE_RULES } from "../../../auth/contracts/nextauth-jwt/index.js";
import { CANONICAL_ROLES } from "../../rbac/index.js";
import {
  AUTHN_AUTHZ,
  IRANIAN_OTP_SECURITY,
  OTP_LOG_HYGIENE,
  SECRETS_CONTROLS,
  SECURITY_ARCHITECTURE,
  SECURITY_ARCHITECTURE_DOC,
  SECURITY_DECISION,
  SECURITY_DOD_FOR_ARDS,
  SECURITY_HEADERS_CHECKLIST,
  SECURITY_REQUIREMENTS,
  SECURITY_USER_MESSAGES_FA,
  TENANT_ISOLATION_CONTROLS,
  THREAT_CONTROLS,
  TRANSPORT_COOKIE_CONTROLS,
  assertHttpsInStagingProd,
  assertNoOtpInProductionResponse,
  assertPersianSecurityMessage,
  assertSafeAuthLogPayload,
  assertSecureCookieOptions,
  assertSecurityHeadersChecklistComplete,
  assertTenantIsolationControl,
  listThreatKeys,
} from "./index.js";

describe("ADR-076 Security Architecture", () => {
  it("locks defense-in-depth decision and enforcement ADR pointers", () => {
    expect(SECURITY_DECISION.strategy).toBe("defense_in_depth");
    expect(SECURITY_DECISION.httpsOnlyStagingProd).toBe(true);
    expect(SECURITY_DECISION.tenantGuards).toBe(true);
    expect(SECURITY_DECISION.rateLimitEnforcementAdr).toBe("ADR-055");
    expect(SECURITY_DECISION.rateLimitPackage).toBe("src/infrastructure/security/rate-limiting");
    expect(SECURITY_DECISION.auditImplementationAdr).toBe("ADR-058");
    expect(SECURITY_DECISION.auditImplementationPackage).toBe(
      "src/infrastructure/security/contracts/audit-logging/",
    );
    expect(SECURITY_DECISION.penSmokeArd).toBe("ARD-020");
    expect(SECURITY_DECISION.apiProtectionAdr).toBe("ADR-077");
    expect(SECURITY_DECISION.apiProtectionPackage).toBe("src/infrastructure/security/contracts/api-protection");
    expect(SECURITY_ARCHITECTURE_DOC).toBe(
      "docs/architecture/06-security-architecture.md",
    );
    expect(SECURITY_REQUIREMENTS.defenseInDepth).toBe(true);
    expect(SECURITY_REQUIREMENTS.rateLimitDeferredAdr055).toBe(false);
    expect(SECURITY_REQUIREMENTS.rateLimitEnforcedAdr055).toBe(true);
    expect(SECURITY_REQUIREMENTS.auditDeferredAdr058).toBe(false);
    expect(SECURITY_REQUIREMENTS.auditImplementedAdr058).toBe(true);
  });

  it("maps threats to controls including Iranian SMS OTP abuse", () => {
    const keys = listThreatKeys();
    expect(keys).toEqual(
      expect.arrayContaining([
        "credentialStuffingOtpSpam",
        "sessionTheft",
        "xss",
        "csrf",
        "sqli",
        "idorTenantLeak",
        "inventoryFraud",
        "ssrfUploads",
      ]),
    );

    expect(THREAT_CONTROLS.credentialStuffingOtpSpam.iranSmsAbuse).toBe(true);
    expect(THREAT_CONTROLS.credentialStuffingOtpSpam.otpRequestsPerMinute).toBe(
      MERCHANT_OTP_RATE_LIMIT.otpRequestsPerMinute,
    );
    expect(THREAT_CONTROLS.sqli.parameterized).toBe(true);
    expect(THREAT_CONTROLS.sqli.orm).toBe(EXCLUSIVE_SQL_ORM.name);
    expect(THREAT_CONTROLS.csrf.sameSite).toBe(SECURE_COOKIE_RULES.sameSite);
    expect(THREAT_CONTROLS.idorTenantLeak.isolationAdr).toBe("ADR-048");
    expect(IRANIAN_OTP_SECURITY.threatModelIncludesLocalOtpAbuse).toBe(true);
    expect(SECURITY_REQUIREMENTS.iranianOtpAbuseThreatModeled).toBe(true);
  });

  it("composes authn OTP→JWT and authz RBAC at application boundary", () => {
    expect(AUTHN_AUTHZ.authn.strategy).toBe("phone_otp_to_jwt");
    expect(AUTHN_AUTHZ.authn.passwordlessMvp).toBe(true);
    expect(AUTHN_AUTHZ.authz.model).toBe("rbac");
    expect(AUTHN_AUTHZ.authz.boundary).toBe("application_service");
    expect(AUTHN_AUTHZ.authz.roles).toEqual(CANONICAL_ROLES);
    expect(AUTHN_AUTHZ.authz.persianDenyMessages).toBe(true);
    expect(AUTHN_AUTHZ.authz.denyMetric).toBe("authz.deny");
  });

  it("requires tenant isolation and env-only secrets", () => {
    expect(TENANT_ISOLATION_CONTROLS.merchantIdOnRepos).toBe(true);
    expect(TENANT_ISOLATION_CONTROLS.mandatoryIsolationTests).toBe(true);
    expect(SECRETS_CONTROLS.envOnly).toBe(true);
    expect(SECRETS_CONTROLS.neverCommit).toBe(true);
    expect(SECRETS_CONTROLS.authSecretEnv).toBe("AUTH_SECRET");
    expect(SECRETS_CONTROLS.noSecretsInLogs).toBe(true);

    expect(() =>
      assertTenantIsolationControl({
        rowMerchantId: "m1",
        authMerchantId: "m1",
      }),
    ).not.toThrow();
    expect(() =>
      assertTenantIsolationControl({
        rowMerchantId: "m1",
        authMerchantId: "m2",
      }),
    ).toThrow(/Cross-tenant/);
  });

  it("never logs OTP or raw tokens; hashed OTP at rest", () => {
    expect(OTP_LOG_HYGIENE.neverLogOtp).toBe(true);
    expect(OTP_LOG_HYGIENE.neverLogRawTokens).toBe(true);
    expect(OTP_LOG_HYGIENE.storeHashedOtpAtRest).toBe(true);
    expect(OTP_LOG_HYGIENE.neverStorePlaintextOtp).toBe(true);
    expect(OTP_LOG_HYGIENE.neverReturnOtpInProduction).toBe(
      SECURITY_API_RULES.neverReturnOtpInProduction,
    );

    expect(() =>
      assertSafeAuthLogPayload({
        event: "otp_requested",
        phoneMasked: "09*****6789",
      }),
    ).not.toThrow();

    expect(() =>
      assertSafeAuthLogPayload({ otp: "123456", phone: "09121234567" }),
    ).toThrow(/otp/i);

    expect(() =>
      assertSafeAuthLogPayload("verify failed otp=654321 for phone"),
    ).toThrow(/OTP/);

    expect(() =>
      assertSafeAuthLogPayload({
        authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.aaa.bbb",
      }),
    ).toThrow(/token/i);

    expect(() =>
      assertNoOtpInProductionResponse({
        nodeEnv: "production",
        responseIncludesOtp: true,
      }),
    ).toThrow(/OTP/);
    expect(() =>
      assertNoOtpInProductionResponse({
        nodeEnv: "development",
        responseIncludesOtp: true,
      }),
    ).not.toThrow();
  });

  it("requires HTTPS in staging/prod and secure httpOnly cookies", () => {
    expect(TRANSPORT_COOKIE_CONTROLS.httpsOnlyStagingProd).toBe(true);
    expect(TRANSPORT_COOKIE_CONTROLS.cookies.httpOnly).toBe(true);
    expect(TRANSPORT_COOKIE_CONTROLS.cookies.secureInProduction).toBe(true);
    expect(TRANSPORT_COOKIE_CONTROLS.cookies.sameSite).toBe("lax");
    expect(TRANSPORT_COOKIE_CONTROLS.shortJwtTtl).toBe(true);

    expect(() =>
      assertHttpsInStagingProd({
        nodeEnv: "production",
        requestIsHttps: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertHttpsInStagingProd({
        nodeEnv: "staging",
        requestIsHttps: false,
      }),
    ).toThrow(/HTTPS/);

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
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        nodeEnv: "production",
      }),
    ).toThrow(/httpOnly/);
    expect(() =>
      assertSecureCookieOptions({
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        nodeEnv: "production",
      }),
    ).toThrow(/secure/);
  });

  it("exposes security headers checklist for staging/prod hardening", () => {
    expect(SECURITY_HEADERS_CHECKLIST.contentSecurityPolicy.required).toBe(
      true,
    );
    expect(
      SECURITY_HEADERS_CHECKLIST.strictTransportSecurity.requiredInStagingProd,
    ).toBe(true);
    expect(SECURITY_HEADERS_CHECKLIST.xContentTypeOptions.value).toBe(
      "nosniff",
    );
    expect(SECURITY_HEADERS_CHECKLIST.xFrameOptions.value).toBe("DENY");
    expect(SECURITY_HEADERS_CHECKLIST.referrerPolicy.value).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(SECURITY_HEADERS_CHECKLIST.permissionsPolicy.required).toBe(true);
    expect(SECURITY_HEADERS_CHECKLIST.runtimeWiring).toMatch(/adr_119/);

    expect(() =>
      assertSecurityHeadersChecklistComplete({
        contentSecurityPolicy: true,
        strictTransportSecurityInStagingProd: true,
        xContentTypeOptions: true,
        xFrameOptions: true,
        referrerPolicy: true,
        permissionsPolicy: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertSecurityHeadersChecklistComplete({
        contentSecurityPolicy: false,
        strictTransportSecurityInStagingProd: true,
        xContentTypeOptions: true,
        xFrameOptions: true,
        referrerPolicy: true,
        permissionsPolicy: true,
      }),
    ).toThrow(/CSP/);
  });

  it("exports Persian security user messages (Iranian First)", () => {
    for (const message of Object.values(SECURITY_USER_MESSAGES_FA)) {
      expect(message).toMatch(/[\u0600-\u06FF]/);
      expect(() => assertPersianSecurityMessage(message)).not.toThrow();
    }
    expect(SECURITY_USER_MESSAGES_FA.accessDenied).toContain("اجازه");
    expect(SECURITY_USER_MESSAGES_FA.tooManyAttempts).toContain("تلاش");
    expect(() => assertPersianSecurityMessage("Access denied")).toThrow(
      /Persian/,
    );
    expect(IRANIAN_OTP_SECURITY.locale).toBe("fa-IR");
    expect(IRANIAN_OTP_SECURITY.rtlSecuritySettingsWhenUiLands).toBe(true);
    expect(SECURITY_REQUIREMENTS.persianSecurityMessages).toBe(true);
  });

  it("documents Security DoD for ARDs and aggregate contract", () => {
    expect(SECURITY_DOD_FOR_ARDS.authZTests).toBe(true);
    expect(SECURITY_DOD_FOR_ARDS.noSecretsInLogs).toBe(true);
    expect(SECURITY_DOD_FOR_ARDS.rateLimitWhereSpecified).toBe(true);
    expect(SECURITY_DOD_FOR_ARDS.penSmoke).toBe("ARD-020");

    expect(SECURITY_ARCHITECTURE.decision.adr).toBe("ADR-076");
    expect(SECURITY_ARCHITECTURE.threatControls).toBe(THREAT_CONTROLS);
    expect(SECURITY_ARCHITECTURE.otpLogHygiene.neverLogOtp).toBe(true);
    expect(SECURITY_ARCHITECTURE.docs.architecture).toBe(
      SECURITY_ARCHITECTURE_DOC,
    );
  });
});
