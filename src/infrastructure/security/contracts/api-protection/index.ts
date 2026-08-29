/**
 * ADR-077 — API Protection and Data Protection contract.
 *
 * Boundary validation, public DTO output minimization (storefront ACL),
 * Iranian phone PII handling, CORS lock, CSRF/server-actions stance,
 * soft-delete API defaults, encryption-at-rest infra deferral.
 * Idempotency-Key remains ADR-030 (`src/shared/contracts/api-standards`).
 * Rate limits → ADR-055; AuthZ → ADR-034 / application layer; depth baseline ADR-076.
 *
 * Normative prose: docs/architecture/06-security-architecture.md,
 * docs/architecture/15-api-architecture.md, docs/rules/api-rules.md,
 * docs/rules/security-rules.md
 */

import { createHash } from "node:crypto";

import {
  AUTH_HEADER_EXPECTATIONS,
  IDEMPOTENCY_POLICY,
  IDEMPOTENCY_REQUIRED_OPERATIONS,
  ROUTE_HANDLER_CONVENTIONS,
  SECURITY_API_RULES,
  createErrorEnvelope,
  type ApiErrorEnvelope,
} from "../../../../shared/contracts/api-standards/index.js";
import { SOFT_DELETE } from "../../../database/contracts/data-integrity/index.js";
import { SECURE_COOKIE_RULES } from "../../../auth/contracts/nextauth-jwt/index.js";
import { RATE_LIMIT_POLICIES } from "../../rate-limiting/index.js";
import {
  SECURITY_DECISION,
  THREAT_CONTROLS,
  VALIDATION_AND_DATA,
} from "../architecture/index.js";
import { normalizeIranianMobile } from "../../../../shared/domain/iranian-phone.js";

/** Normative docs. */
export const API_PROTECTION_DOC =
  "docs/architecture/06-security-architecture.md" as const;
export const API_ARCHITECTURE_DOC =
  "docs/architecture/15-api-architecture.md" as const;
export const API_RULES_DOC = "docs/rules/api-rules.md" as const;
export const SECURITY_RULES_DOC = "docs/rules/security-rules.md" as const;

/**
 * Core decision snapshot (ADR-077 Decision).
 */
export const API_PROTECTION_DECISION = {
  adr: "ADR-077",
  zodValidationAtBoundary: true,
  authZInApplication: true,
  rateLimits: true,
  corsLocked: true,
  noSensitiveFieldsOnPublicDtos: true,
  softDeleteDefaults: true,
  securityBaselineAdr: "ADR-076",
  apiStandardsAdr: "ADR-030",
  rateLimitAdr: "ADR-055",
  authZAdr: "ADR-034",
  softDeleteAdr: "ADR-047",
  rateLimitPackage: "src/infrastructure/security/rate-limiting",
  apiStandardsPackage: "src/shared/contracts/api-standards",
  idempotencyOwnedBy: "ADR-030",
} as const;

/**
 * Input validation at the API / Route Handler boundary.
 * Zod package install deferred until first handlers (ADR-030); stance binding.
 */
export const INPUT_VALIDATION = {
  library: ROUTE_HANDLER_CONVENTIONS.boundaryValidationLibrary,
  at: "route_handler_boundary" as const,
  beforeUseCases: true,
  validateInputs: true,
  validateOutputsWhenPublicAcl: true,
  zodDependencyDeferredUntilFirstHandler:
    ROUTE_HANDLER_CONVENTIONS.zodDependencyDeferredUntilFirstHandler,
  neverTrustClientTenantClaims: true,
  rejectUnknownFieldsOnPublicMutations: true,
} as const;

/**
 * AuthZ composition — enforcement stays in application (ADR-030 / ADR-034).
 */
export const AUTHZ_COMPOSITION = {
  enforcedIn: AUTH_HEADER_EXPECTATIONS.authZEnforcedIn,
  presentationReadsCredentialsOnly: true,
  handlersMustNotSoftSkip: true,
  tenantGuardsRequired: SECURITY_DECISION.tenantGuards,
  detailAdr: "ADR-034",
  isolationAdr: "ADR-048",
} as const;

/**
 * Rate-limit composition — policies live in ADR-055.
 */
export const RATE_LIMIT_COMPOSITION = {
  detailAdr: "ADR-055",
  package: "src/infrastructure/security/rate-limiting",
  publicStorefrontScope: RATE_LIMIT_POLICIES.public_storefront.scope,
  otpFailClosed: RATE_LIMIT_POLICIES.otp.failPolicy === "fail_closed",
  authFailClosed: RATE_LIMIT_POLICIES.auth.failPolicy === "fail_closed",
} as const;

/**
 * CORS locked to configured app origins (no `*` for credentialed surfaces).
 * Runtime middleware attachment deferred with route matrix / ARD-020.
 */
export const CORS_POLICY = {
  locked: true,
  allowWildcard: false,
  allowCredentialsWhenOriginMatched: true,
  defaultAllowedOrigins: [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3020",
    "http://127.0.0.1:3020",
  ] as const,
  /** Production origins injected via env allowlist when app shell wires CORS. */
  productionOriginsFromEnv: "CORS_ALLOWED_ORIGINS",
  runtimeWiring: "adr_119_next_middleware",
  note: "Public storefront may share app origin; beacons lock to app origins (ARD-027)",
} as const;

/**
 * Fields forbidden on **public** storefront / unauthenticated DTOs (ACL).
 * Technical Impact: ACL DTOs storefront (ADR-077).
 */
export const PUBLIC_DTO_FORBIDDEN_FIELDS = [
  "cost",
  "costPrice",
  "cost_price",
  "wholesalePrice",
  "wholesale_price",
  "purchasePrice",
  "purchase_price",
  "margin",
  "marginPercent",
  "supplierId",
  "supplier_id",
  "supplierName",
  "internalNotes",
  "internal_notes",
  "phone",
  "phoneNumber",
  "phone_number",
  "mobile",
  "nationalId",
  "national_id",
  "otp",
  "code",
  "token",
  "accessToken",
  "refreshToken",
  "password",
  "passwordHash",
  "deletedAt",
  "deleted_at",
  "createdBy",
  "created_by",
  "merchantSecret",
  "apiKey",
] as const;

export type PublicDtoForbiddenField =
  (typeof PUBLIC_DTO_FORBIDDEN_FIELDS)[number];

/**
 * Output minimization — public responses expose only customer-safe projections.
 */
export const OUTPUT_MINIMIZATION = {
  noSensitiveFieldsOnPublicDtos: true,
  storefrontAcl: true,
  forbiddenFields: PUBLIC_DTO_FORBIDDEN_FIELDS,
  softDeletedNeverListedOnPublicReads: true,
  neverReturnOtpInProduction: SECURITY_API_RULES.neverReturnOtpInProduction,
  camelCaseWireOnly: true,
  neverLeakSnakeCaseDbNamesOnWire: true,
} as const;

/**
 * Iranian phone PII — treat as sensitive identity (Iranian First).
 * National `09xxxxxxxxx` / E.164 `+98…` only; mask/hash outside authorized CRM/POS.
 */
export const IRANIAN_PHONE_PII = {
  treatAsSensitive: VALIDATION_AND_DATA.phonePiiTreatAsSensitive,
  acceptedForms: ["09xxxxxxxxx", "+98xxxxxxxxxx"] as const,
  allowOnPublicDtos: false,
  allowFullInLogs: false,
  maskForDisplayAndLogs: true,
  hashForTelemetryAndCacheKeys: true,
  normalizeBeforePersist: true,
  locale: "fa-IR",
  /** Digits kept visible at the end of national form when masking. */
  maskVisibleTailDigits: 4,
} as const;

/**
 * Encryption at rest — infrastructure volume / managed PostgreSQL;
 * application-level field encryption deferred. OTP already hashed (ADR-076).
 */
export const ENCRYPTION_AT_REST = {
  applicationFieldEncryptionMvp: false,
  deferredToInfra: true,
  deferralNote:
    "Volume / managed-PG encryption-at-rest is infra (compose/cloud); not app code this ADR",
  otpHashedAtRest: true,
  secretsNeverAtRestInRepo: true,
  phoneStorage: "normalized_plaintext_in_oltp_with_access_controls",
  futureEvolution: "optional_app_level_field_encryption_if_compliance_requires",
} as const;

/**
 * CSRF / XSS stance for cookie + Server Actions surfaces.
 * ADR-119 adds double-submit CSRF (`x-csrf-token` + `mos.csrf`) on mutating `/api/v1`.
 */
export const CSRF_SERVER_ACTIONS = {
  nextjsServerActionProtections: true,
  sameSiteCookies: true,
  sameSite: SECURE_COOKIE_RULES.sameSite,
  reactEscaping: true,
  noUnsanitizedHtml: true,
  doubleSubmitHeader: "x-csrf-token",
  doubleSubmitCookie: "mos.csrf",
  runtimeWiring: "adr_119_next_middleware",
  threatControl: THREAT_CONTROLS.csrf,
} as const;

/**
 * Soft-delete defaults on API list/read paths (compose ADR-047).
 */
export const SOFT_DELETE_API_DEFAULTS = {
  defaultReadsExcludeDeleted: SOFT_DELETE.defaultReadsExcludeDeleted,
  publicListsNeverIncludeDeleted: true,
  predicateWhenApplies: SOFT_DELETE.defaultReadPredicate,
  detailAdr: "ADR-047",
} as const;

/**
 * Idempotency — owned by ADR-030; do not fork header policy here.
 */
export const IDEMPOTENCY_REFERENCE = {
  ownedByAdr: "ADR-030",
  package: "src/shared/contracts/api-standards",
  headerName: IDEMPOTENCY_POLICY.headerName,
  requiredFor: IDEMPOTENCY_REQUIRED_OPERATIONS,
  reimplementedHere: false,
} as const;

/**
 * Persian user-facing API protection messages (Iranian First).
 */
export const API_PROTECTION_MESSAGES_FA = {
  validationFailed: "اطلاعات ارسالی نامعتبر است.",
  invalidIranianPhone: "شماره موبایل واردشده معتبر نیست.",
  forbiddenPublicField:
    "پاسخ عمومی شامل فیلدهای حساس نیست؛ درخواست اصلاح شود.",
  corsOriginDenied: "دسترسی از این مبدأ مجاز نیست.",
  softDeletedHidden: "مورد درخواستی در دسترس نیست.",
  accessDenied: "اجازه دسترسی به این بخش را ندارید.",
} as const;

export type ApiProtectionMessageKey = keyof typeof API_PROTECTION_MESSAGES_FA;

export const API_PROTECTION_REQUIREMENTS = {
  zodAtBoundary: true,
  authZInApplication: true,
  rateLimitsComposed: true,
  corsLocked: true,
  publicDtoMinimized: true,
  iranianPhonePii: true,
  softDeleteDefaults: true,
  csrfServerActionsStance: true,
  encryptionAtRestDeferredInfra: true,
  idempotencyViaApiStandards: true,
  persianProtectionMessages: true,
} as const;

export const API_PROTECTION = {
  decision: API_PROTECTION_DECISION,
  inputValidation: INPUT_VALIDATION,
  authZ: AUTHZ_COMPOSITION,
  rateLimit: RATE_LIMIT_COMPOSITION,
  cors: CORS_POLICY,
  outputMinimization: OUTPUT_MINIMIZATION,
  iranianPhonePii: IRANIAN_PHONE_PII,
  encryptionAtRest: ENCRYPTION_AT_REST,
  csrfServerActions: CSRF_SERVER_ACTIONS,
  softDelete: SOFT_DELETE_API_DEFAULTS,
  idempotency: IDEMPOTENCY_REFERENCE,
  messagesFa: API_PROTECTION_MESSAGES_FA,
  requirements: API_PROTECTION_REQUIREMENTS,
  docs: {
    securityArchitecture: API_PROTECTION_DOC,
    apiArchitecture: API_ARCHITECTURE_DOC,
    apiRules: API_RULES_DOC,
    securityRules: SECURITY_RULES_DOC,
  },
} as const;

const PERSIAN_SCRIPT = /[\u0600-\u06FF]/;
const FORBIDDEN_FIELD_SET = new Set<string>(PUBLIC_DTO_FORBIDDEN_FIELDS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectSensitiveKeys(
  value: unknown,
  path: string,
  found: string[],
): void {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      collectSensitiveKeys(value[i], `${path}[${i}]`, found);
    }
    return;
  }
  if (!isPlainObject(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_FIELD_SET.has(key)) {
      found.push(nextPath);
    }
    collectSensitiveKeys(child, nextPath, found);
  }
}

/**
 * Mask Iranian national mobile for logs / UI secondary display.
 * Example: `09123456789` → `091****6789`
 */
export function maskIranianPhone(raw: string): string {
  const normalized = normalizeIranianMobile(raw);
  if (!normalized.ok) {
    return "***";
  }
  const national = normalized.phone.national;
  const tail = IRANIAN_PHONE_PII.maskVisibleTailDigits;
  const visibleHead = 3; // "091" / "09x" carrier prefix hint
  const maskedLen = Math.max(0, national.length - visibleHead - tail);
  return `${national.slice(0, visibleHead)}${"*".repeat(maskedLen)}${national.slice(-tail)}`;
}

/**
 * Hash Iranian phone for telemetry / cache key subjects (no raw PII in keys).
 */
export function hashIranianPhoneForTelemetry(raw: string): string {
  const normalized = normalizeIranianMobile(raw);
  const subject = normalized.ok ? normalized.phone.e164 : raw.trim();
  return createHash("sha256").update(subject, "utf8").digest("hex");
}

export function createValidationErrorEnvelope(
  correlationId?: string | null,
  details?: Record<string, unknown>,
): ApiErrorEnvelope {
  return createErrorEnvelope({
    code: "VALIDATION_ERROR",
    messageFa: API_PROTECTION_MESSAGES_FA.validationFailed,
    ...(correlationId !== undefined ? { correlationId } : {}),
    ...(details !== undefined ? { details } : {}),
  });
}

export function createCorsDeniedEnvelope(
  correlationId?: string | null,
): ApiErrorEnvelope {
  return createErrorEnvelope({
    code: "FORBIDDEN",
    messageFa: API_PROTECTION_MESSAGES_FA.corsOriginDenied,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}

export function assertBoundaryValidated(input: {
  validatedAtBoundary: boolean;
  library: string;
}): void {
  if (!input.validatedAtBoundary) {
    throw new Error(
      "External inputs must be validated at the Route Handler boundary (ADR-077).",
    );
  }
  if (input.library !== INPUT_VALIDATION.library) {
    throw new Error(
      `API boundary validation library must be "${INPUT_VALIDATION.library}" (ADR-077 / ADR-030); got "${input.library}".`,
    );
  }
}

/**
 * Reject public/storefront DTO graphs that include sensitive fields.
 */
export function assertPublicDtoMinimized(dto: unknown): void {
  const found: string[] = [];
  collectSensitiveKeys(dto, "", found);
  if (found.length > 0) {
    throw new Error(
      `Public DTO contains sensitive fields (ADR-077 ACL): ${found.join(", ")}`,
    );
  }
}

export function assertCorsOriginAllowed(input: {
  origin: string | null | undefined;
  allowedOrigins: readonly string[];
}): void {
  if (CORS_POLICY.allowWildcard) {
    throw new Error("CORS must not allow wildcard origins (ADR-077).");
  }
  const origin = input.origin?.trim();
  if (!origin) {
    // Same-origin / non-CORS browser navigation — no Origin header.
    return;
  }
  if (!input.allowedOrigins.includes(origin)) {
    throw new Error(
      `CORS origin denied (ADR-077): "${origin}" is not in the allowlist.`,
    );
  }
}

export function assertSoftDeletedExcludedFromList(input: {
  includesSoftDeleted: boolean;
}): void {
  if (input.includesSoftDeleted) {
    throw new Error(
      "API default lists must exclude soft-deleted rows (ADR-077 / ADR-047).",
    );
  }
}

export function assertIranianPhoneNotOnPublicDto(dto: unknown): void {
  assertPublicDtoMinimized(dto);
  const text = JSON.stringify(dto ?? {});
  // Full national or E.164 Iranian mobiles must not appear on public payloads.
  if (/\b09\d{9}\b/.test(text) || /\+989\d{9}\b/.test(text)) {
    throw new Error(
      "Public DTO must not include raw Iranian phone numbers (ADR-077 PII).",
    );
  }
}

export function assertEncryptionAtRestDeferred(policy: {
  deferredToInfra: boolean;
  applicationFieldEncryptionMvp: boolean;
}): void {
  if (!policy.deferredToInfra) {
    throw new Error(
      "Encryption-at-rest must remain infra-deferred for MVP (ADR-077).",
    );
  }
  if (policy.applicationFieldEncryptionMvp) {
    throw new Error(
      "Application-level field encryption is out of MVP scope (ADR-077).",
    );
  }
}

export function assertCsrfServerActionsStance(stance: {
  nextjsServerActionProtections: boolean;
  sameSite: string;
}): void {
  if (!stance.nextjsServerActionProtections) {
    throw new Error(
      "Next.js Server Action CSRF protections required (ADR-077 / ADR-076).",
    );
  }
  if (stance.sameSite !== SECURE_COOKIE_RULES.sameSite) {
    throw new Error(
      `Cookie sameSite must be "${SECURE_COOKIE_RULES.sameSite}" for CSRF stance (ADR-077).`,
    );
  }
}

export function assertIdempotencyOwnedByApiStandards(): void {
  if (IDEMPOTENCY_REFERENCE.reimplementedHere) {
    throw new Error(
      "Idempotency-Key must stay owned by ADR-030 api-standards (ADR-077).",
    );
  }
  if (IDEMPOTENCY_REFERENCE.headerName !== "Idempotency-Key") {
    throw new Error(
      `Idempotency header must be "Idempotency-Key" (ADR-030); got "${IDEMPOTENCY_REFERENCE.headerName}".`,
    );
  }
  if (!IDEMPOTENCY_REQUIRED_OPERATIONS.includes("sale_complete")) {
    throw new Error("sale_complete must require Idempotency-Key (ADR-030).");
  }
  if (!IDEMPOTENCY_REQUIRED_OPERATIONS.includes("order_create")) {
    throw new Error("order_create must require Idempotency-Key (ADR-030).");
  }
}

export function assertPersianProtectionMessage(messageFa: string): void {
  if (!PERSIAN_SCRIPT.test(messageFa)) {
    throw new Error(
      "API protection message must contain Persian script (ADR-077 Iranian First).",
    );
  }
}

export function listPublicDtoForbiddenFields(): PublicDtoForbiddenField[] {
  return [...PUBLIC_DTO_FORBIDDEN_FIELDS];
}
