import { describe, expect, it } from "vitest";

import {
  API_ERROR_CODES,
  API_ERROR_FALLBACK_FA,
  API_ERROR_MESSAGES_FA,
  API_STANDARDS,
  API_SURFACES,
  API_VERSION_PREFIX,
  AUTH_HEADER_EXPECTATIONS,
  CORRELATION_ID,
  IDEMPOTENCY_POLICY,
  IDEMPOTENCY_REQUIRED_OPERATIONS,
  IdempotencyKeyRequiredError,
  NAMING_CONVENTION,
  PERSIAN_MESSAGE_STRATEGY,
  ROUTE_HANDLER_CONVENTIONS,
  SECURITY_API_RULES,
  UNVERSIONED_API_PATHS,
  VERSIONING_STANCE,
  assertAuthZInApplicationLayer,
  assertBoundaryValidationLibrary,
  assertErrorEnvelopeShape,
  assertNamingConvention,
  assertNeverReturnOtpInProduction,
  assertPersianApiMessages,
  assertPublicApiVersioned,
  createErrorEnvelope,
  createSuccessEnvelope,
  ensureCorrelationId,
  isVersionedApiPath,
  requireIdempotencyKey,
  resolvePersianMessage,
} from "./index.js";

describe("ADR-030 API Architecture and Standards", () => {
  it("versions public JSON under /api/v1 and allows unversioned health probes", () => {
    expect(API_VERSION_PREFIX).toBe("/api/v1");
    expect(VERSIONING_STANCE.publicJsonUnder).toBe("/api/v1");
    expect(VERSIONING_STANCE.style).toBe("uri_path_version");
    expect(UNVERSIONED_API_PATHS).toEqual(
      expect.arrayContaining(["/api/health", "/api/ready"]),
    );
    expect(isVersionedApiPath("/api/v1/sales/complete")).toBe(true);
    expect(isVersionedApiPath("/api/health")).toBe(false);
    expect(() => assertPublicApiVersioned("/api/v1/orders")).not.toThrow();
    expect(() => assertPublicApiVersioned("/api/health")).not.toThrow();
    expect(() => assertPublicApiVersioned("/api/sales")).toThrow(/\/api\/v1/);
    expect(API_STANDARDS.versioning.openApiGenerateLater).toBe(true);
  });

  it("defines Route Handler conventions with Zod-at-boundary stance", () => {
    expect(API_SURFACES.routeHandlers).toContain("route.ts");
    expect(API_SURFACES.publicVersionedGlob).toContain("api/v1");
    expect(ROUTE_HANDLER_CONVENTIONS.callApplicationUseCasesOnly).toBe(true);
    expect(ROUTE_HANDLER_CONVENTIONS.boundaryValidationLibrary).toBe("zod");
    expect(ROUTE_HANDLER_CONVENTIONS.zodDependencyDeferredUntilFirstHandler).toBe(
      true,
    );
    expect(ROUTE_HANDLER_CONVENTIONS.documentEndpointsInOwningArd).toBe(true);
    expect(() => assertBoundaryValidationLibrary("zod")).not.toThrow();
    expect(() => assertBoundaryValidationLibrary("joi")).toThrow(/zod/);
  });

  it("builds error envelopes with Persian message and correlationId", () => {
    const envelope = createErrorEnvelope({
      code: "VALIDATION_ERROR",
      correlationId: "corr-test-1",
      details: { field: "phone" },
    });
    expect(envelope.error.code).toBe("VALIDATION_ERROR");
    expect(envelope.error.correlationId).toBe("corr-test-1");
    expect(envelope.error.message).toBe(API_ERROR_MESSAGES_FA.VALIDATION_ERROR);
    expect(envelope.error.details).toEqual({ field: "phone" });
    expect(() => assertErrorEnvelopeShape(envelope)).not.toThrow();

    const generated = createErrorEnvelope({ code: "NOT_FOUND" });
    expect(generated.error.correlationId.length).toBeGreaterThan(0);
    expect(ensureCorrelationId("  abc  ")).toBe("abc");
    expect(CORRELATION_ID.required).toBe(true);
    expect(CORRELATION_ID.headerName).toBe("X-Correlation-Id");
  });

  it("resolves stable codes via Persian map with safe fallback", () => {
    expect(resolvePersianMessage("UNAUTHORIZED")).toBe(
      API_ERROR_MESSAGES_FA.UNAUTHORIZED,
    );
    expect(resolvePersianMessage("UNKNOWN_CODE")).toBe(API_ERROR_FALLBACK_FA);
    expect(API_ERROR_CODES).toEqual(
      expect.arrayContaining([
        "VALIDATION_ERROR",
        "IDEMPOTENCY_KEY_REQUIRED",
        "RATE_LIMITED",
      ]),
    );
    expect(PERSIAN_MESSAGE_STRATEGY.primary).toBe(
      "persian_human_message_in_envelope",
    );
    expect(PERSIAN_MESSAGE_STRATEGY.alternative).toBe(
      "stable_error_codes_with_persian_client_maps",
    );
    expect(PERSIAN_MESSAGE_STRATEGY.locale).toBe("fa-IR");
    expect(() => assertPersianApiMessages()).not.toThrow();
    expect(() =>
      assertPersianApiMessages({ primary: "english_only" }),
    ).toThrow(/Persian/);
    for (const code of API_ERROR_CODES) {
      expect(API_ERROR_MESSAGES_FA[code]).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it("requires Idempotency-Key for sale_complete and order_create", () => {
    expect(IDEMPOTENCY_REQUIRED_OPERATIONS).toEqual([
      "sale_complete",
      "order_create",
    ]);
    expect(IDEMPOTENCY_POLICY.headerName).toBe("Idempotency-Key");
    expect(requireIdempotencyKey("sale_complete", "key-1")).toBe("key-1");
    expect(requireIdempotencyKey("order_create", " key-2 ")).toBe("key-2");
    expect(() => requireIdempotencyKey("sale_complete", null)).toThrow(
      IdempotencyKeyRequiredError,
    );
    try {
      requireIdempotencyKey("order_create", "");
      expect.unreachable("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(IdempotencyKeyRequiredError);
      const e = err as IdempotencyKeyRequiredError;
      expect(e.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
      expect(e.envelope.error.message).toBe(
        API_ERROR_MESSAGES_FA.IDEMPOTENCY_KEY_REQUIRED,
      );
      expect(() => assertErrorEnvelopeShape(e.envelope)).not.toThrow();
    }
  });

  it("documents JSON camelCase vs DB snake_case naming", () => {
    expect(NAMING_CONVENTION.jsonWire).toBe("camelCase");
    expect(NAMING_CONVENTION.databaseColumns).toBe("snake_case");
    expect(NAMING_CONVENTION.mapAt).toBe(
      "repository_or_presentation_boundary",
    );
    expect(() => assertNamingConvention(NAMING_CONVENTION)).not.toThrow();
    expect(() =>
      assertNamingConvention({
        jsonWire: "snake_case",
        databaseColumns: "snake_case",
      }),
    ).toThrow(/camelCase/);
  });

  it("encodes high-level auth headers and AuthZ in application", () => {
    expect(AUTH_HEADER_EXPECTATIONS.authorization).toBe(
      "Bearer_JWT_or_session_cookie",
    );
    expect(AUTH_HEADER_EXPECTATIONS.idempotencyKey).toBe("Idempotency-Key");
    expect(AUTH_HEADER_EXPECTATIONS.correlationId).toBe("X-Correlation-Id");
    expect(AUTH_HEADER_EXPECTATIONS.publicStorefront).toBe(
      "unauthenticated_rate_limited",
    );
    expect(AUTH_HEADER_EXPECTATIONS.adminRequires).toBe("platform_admin");
    expect(AUTH_HEADER_EXPECTATIONS.authZEnforcedIn).toBe("application");
    expect(() => assertAuthZInApplicationLayer("application")).not.toThrow();
    expect(() => assertAuthZInApplicationLayer("presentation")).toThrow(
      /application/,
    );
  });

  it("never returns OTP in production and builds success envelopes", () => {
    expect(SECURITY_API_RULES.neverReturnOtpInProduction).toBe(true);
    expect(() =>
      assertNeverReturnOtpInProduction(SECURITY_API_RULES),
    ).not.toThrow();
    expect(() =>
      assertNeverReturnOtpInProduction({ neverReturnOtpInProduction: false }),
    ).toThrow(/OTP/);

    const ok = createSuccessEnvelope({ id: "1" }, { page: 1 });
    expect(ok).toEqual({ data: { id: "1" }, meta: { page: 1 } });
    expect(createSuccessEnvelope({ id: "2" })).toEqual({ data: { id: "2" } });

    expect(API_STANDARDS.docs.rules).toBe("docs/rules/api-rules.md");
    expect(API_STANDARDS.docs.architecture).toBe(
      "docs/architecture/15-api-architecture.md",
    );
  });
});
