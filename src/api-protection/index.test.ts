/**
 * Tests: ADR-077 API Protection and Data Protection contract
 * (boundary validation, public DTO ACL, Iranian phone PII, CORS, CSRF).
 */
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { IDEMPOTENCY_POLICY } from "../api-standards/index.js";
import { SECURE_COOKIE_RULES } from "../nextauth-jwt/index.js";
import {
  API_PROTECTION,
  API_PROTECTION_DECISION,
  API_PROTECTION_MESSAGES_FA,
  API_PROTECTION_REQUIREMENTS,
  CORS_POLICY,
  CSRF_SERVER_ACTIONS,
  ENCRYPTION_AT_REST,
  IDEMPOTENCY_REFERENCE,
  INPUT_VALIDATION,
  IRANIAN_PHONE_PII,
  OUTPUT_MINIMIZATION,
  PUBLIC_DTO_FORBIDDEN_FIELDS,
  SOFT_DELETE_API_DEFAULTS,
  assertBoundaryValidated,
  assertCorsOriginAllowed,
  assertCsrfServerActionsStance,
  assertEncryptionAtRestDeferred,
  assertIdempotencyOwnedByApiStandards,
  assertIranianPhoneNotOnPublicDto,
  assertPersianProtectionMessage,
  assertPublicDtoMinimized,
  assertSoftDeletedExcludedFromList,
  createCorsDeniedEnvelope,
  createValidationErrorEnvelope,
  hashIranianPhoneForTelemetry,
  listPublicDtoForbiddenFields,
  maskIranianPhone,
} from "./index.js";

describe("ADR-077 API Protection and Data Protection", () => {
  it("locks decision: Zod, AuthZ, rate limits, CORS, public DTO ACL, soft-delete", () => {
    expect(API_PROTECTION_DECISION.adr).toBe("ADR-077");
    expect(API_PROTECTION_DECISION.zodValidationAtBoundary).toBe(true);
    expect(API_PROTECTION_DECISION.authZInApplication).toBe(true);
    expect(API_PROTECTION_DECISION.rateLimits).toBe(true);
    expect(API_PROTECTION_DECISION.corsLocked).toBe(true);
    expect(API_PROTECTION_DECISION.noSensitiveFieldsOnPublicDtos).toBe(true);
    expect(API_PROTECTION_DECISION.softDeleteDefaults).toBe(true);
    expect(API_PROTECTION_DECISION.securityBaselineAdr).toBe("ADR-076");
    expect(API_PROTECTION_DECISION.rateLimitAdr).toBe("ADR-055");
    expect(API_PROTECTION_DECISION.apiStandardsAdr).toBe("ADR-030");
    expect(API_PROTECTION_DECISION.idempotencyOwnedBy).toBe("ADR-030");
    expect(API_PROTECTION_REQUIREMENTS.zodAtBoundary).toBe(true);
    expect(API_PROTECTION.inputValidation.library).toBe("zod");
  });

  it("requires Zod validation at Route Handler boundary", () => {
    expect(INPUT_VALIDATION.at).toBe("route_handler_boundary");
    expect(INPUT_VALIDATION.beforeUseCases).toBe(true);
    expect(INPUT_VALIDATION.neverTrustClientTenantClaims).toBe(true);

    expect(() =>
      assertBoundaryValidated({
        validatedAtBoundary: true,
        library: "zod",
      }),
    ).not.toThrow();

    expect(() =>
      assertBoundaryValidated({
        validatedAtBoundary: false,
        library: "zod",
      }),
    ).toThrow(/boundary/i);

    expect(() =>
      assertBoundaryValidated({
        validatedAtBoundary: true,
        library: "joi",
      }),
    ).toThrow(/zod/i);
  });

  it("rejects sensitive fields on public storefront DTOs (output minimization)", () => {
    expect(OUTPUT_MINIMIZATION.storefrontAcl).toBe(true);
    expect(listPublicDtoForbiddenFields()).toEqual(
      expect.arrayContaining([
        "costPrice",
        "phone",
        "otp",
        "deletedAt",
        "accessToken",
      ]),
    );
    expect(PUBLIC_DTO_FORBIDDEN_FIELDS.length).toBeGreaterThan(10);

    const safeDto = {
      id: "sku-1",
      name: "شیر",
      priceToman: 45000,
      inStock: true,
    };
    expect(() => assertPublicDtoMinimized(safeDto)).not.toThrow();

    expect(() =>
      assertPublicDtoMinimized({
        ...safeDto,
        costPrice: 30000,
      }),
    ).toThrow(/costPrice/);

    expect(() =>
      assertPublicDtoMinimized({
        products: [{ id: "1", phone: "09121234567" }],
      }),
    ).toThrow(/phone/);
  });

  it("masks and hashes Iranian phone PII; forbids raw phones on public DTOs", () => {
    expect(IRANIAN_PHONE_PII.treatAsSensitive).toBe(true);
    expect(IRANIAN_PHONE_PII.allowOnPublicDtos).toBe(false);
    expect(IRANIAN_PHONE_PII.acceptedForms).toContain("09xxxxxxxxx");

    expect(maskIranianPhone("09123456789")).toBe("091****6789");
    expect(maskIranianPhone("+989123456789")).toBe("091****6789");
    expect(maskIranianPhone("not-a-phone")).toBe("***");

    const hash = hashIranianPhoneForTelemetry("09123456789");
    const expected = createHash("sha256")
      .update("+989123456789", "utf8")
      .digest("hex");
    expect(hash).toBe(expected);
    expect(hash).toHaveLength(64);

    expect(() =>
      assertIranianPhoneNotOnPublicDto({
        storeName: "کاسبینو",
        phone: "09123456789",
      }),
    ).toThrow(/sensitive|phone/i);

    expect(() =>
      assertIranianPhoneNotOnPublicDto({
        contactHint: "09123456789",
      }),
    ).toThrow(/phone/i);

    expect(() =>
      assertIranianPhoneNotOnPublicDto({
        title: "فروشگاه محلی",
        slug: "local-shop",
      }),
    ).not.toThrow();
  });

  it("locks CORS to allowlist (no wildcard)", () => {
    expect(CORS_POLICY.locked).toBe(true);
    expect(CORS_POLICY.allowWildcard).toBe(false);

    expect(() =>
      assertCorsOriginAllowed({
        origin: "http://localhost:3000",
        allowedOrigins: CORS_POLICY.defaultAllowedOrigins,
      }),
    ).not.toThrow();

    expect(() =>
      assertCorsOriginAllowed({
        origin: null,
        allowedOrigins: CORS_POLICY.defaultAllowedOrigins,
      }),
    ).not.toThrow();

    expect(() =>
      assertCorsOriginAllowed({
        origin: "https://evil.example",
        allowedOrigins: CORS_POLICY.defaultAllowedOrigins,
      }),
    ).toThrow(/CORS origin denied/i);

    const corsEnvelope = createCorsDeniedEnvelope("corr-cors");
    expect(corsEnvelope.error.code).toBe("FORBIDDEN");
    expect(corsEnvelope.error.message).toMatch(/[\u0600-\u06FF]/);
  });

  it("records CSRF / Server Actions stance with SameSite cookies", () => {
    expect(CSRF_SERVER_ACTIONS.nextjsServerActionProtections).toBe(true);
    expect(CSRF_SERVER_ACTIONS.sameSite).toBe(SECURE_COOKIE_RULES.sameSite);

    expect(() =>
      assertCsrfServerActionsStance({
        nextjsServerActionProtections: true,
        sameSite: "lax",
      }),
    ).not.toThrow();

    expect(() =>
      assertCsrfServerActionsStance({
        nextjsServerActionProtections: false,
        sameSite: "lax",
      }),
    ).toThrow(/Server Action/i);

    expect(() =>
      assertCsrfServerActionsStance({
        nextjsServerActionProtections: true,
        sameSite: "none",
      }),
    ).toThrow(/sameSite/i);
  });

  it("defers encryption-at-rest to infra; no app field encryption MVP", () => {
    expect(ENCRYPTION_AT_REST.deferredToInfra).toBe(true);
    expect(ENCRYPTION_AT_REST.applicationFieldEncryptionMvp).toBe(false);
    expect(ENCRYPTION_AT_REST.otpHashedAtRest).toBe(true);

    expect(() =>
      assertEncryptionAtRestDeferred(ENCRYPTION_AT_REST),
    ).not.toThrow();

    expect(() =>
      assertEncryptionAtRestDeferred({
        deferredToInfra: false,
        applicationFieldEncryptionMvp: false,
      }),
    ).toThrow(/infra-deferred/i);

    expect(() =>
      assertEncryptionAtRestDeferred({
        deferredToInfra: true,
        applicationFieldEncryptionMvp: true,
      }),
    ).toThrow(/field encryption/i);
  });

  it("references Idempotency-Key from api-standards (does not reimplement)", () => {
    expect(IDEMPOTENCY_REFERENCE.ownedByAdr).toBe("ADR-030");
    expect(IDEMPOTENCY_REFERENCE.reimplementedHere).toBe(false);
    expect(IDEMPOTENCY_REFERENCE.headerName).toBe(
      IDEMPOTENCY_POLICY.headerName,
    );
    expect(IDEMPOTENCY_REFERENCE.requiredFor).toEqual(
      expect.arrayContaining(["sale_complete", "order_create"]),
    );
    expect(() => assertIdempotencyOwnedByApiStandards()).not.toThrow();
  });

  it("excludes soft-deleted rows from default API lists", () => {
    expect(SOFT_DELETE_API_DEFAULTS.defaultReadsExcludeDeleted).toBe(true);
    expect(SOFT_DELETE_API_DEFAULTS.publicListsNeverIncludeDeleted).toBe(true);
    expect(SOFT_DELETE_API_DEFAULTS.detailAdr).toBe("ADR-047");

    expect(() =>
      assertSoftDeletedExcludedFromList({ includesSoftDeleted: false }),
    ).not.toThrow();
    expect(() =>
      assertSoftDeletedExcludedFromList({ includesSoftDeleted: true }),
    ).toThrow(/soft-deleted/i);
  });

  it("ships Persian protection messages and validation envelopes", () => {
    for (const message of Object.values(API_PROTECTION_MESSAGES_FA)) {
      expect(() => assertPersianProtectionMessage(message)).not.toThrow();
      expect(message).toMatch(/[\u0600-\u06FF]/);
    }

    expect(() => assertPersianProtectionMessage("Invalid input")).toThrow(
      /Persian/i,
    );

    const envelope = createValidationErrorEnvelope("corr-1", {
      field: "phone",
    });
    expect(envelope.error.code).toBe("VALIDATION_ERROR");
    expect(envelope.error.correlationId).toBe("corr-1");
    expect(envelope.error.message).toBe(
      API_PROTECTION_MESSAGES_FA.validationFailed,
    );
    expect(envelope.error.details).toEqual({ field: "phone" });
  });
});
