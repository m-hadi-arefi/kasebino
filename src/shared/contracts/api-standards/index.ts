/**
 * ADR-030 — API Architecture and Standards contract.
 *
 * Public JSON under `/api/v1`; Zod validate at boundary (dependency when first
 * handlers land); error envelope with correlationId + Persian human messages;
 * Idempotency-Key for sale/order mutations. Aligns with ADR-029 layering and
 * docs/rules/api-rules.md.
 */

import { randomUUID } from "node:crypto";

import {
  PRESENTATION_MESSAGE_STRATEGY,
  REQUEST_BOUNDARY,
} from "../backend-layering/index.js";

/** Externalized public API version prefix. */
export const API_VERSION_PREFIX = "/api/v1" as const;

/**
 * Surfaces that may stay outside versioning (ops probes).
 * Business resources must use `API_VERSION_PREFIX`.
 */
export const UNVERSIONED_API_PATHS = ["/api/health", "/api/ready"] as const;

export const VERSIONING_STANCE = {
  publicJsonUnder: API_VERSION_PREFIX,
  unversionedAllowed: UNVERSIONED_API_PATHS,
  openApiGenerateLater: true,
  style: "uri_path_version",
  rejectedAlternatives: ["tRPC_only", "graphql_now"] as const,
} as const;

/**
 * Where APIs are hosted in the Next.js modular monolith (ADR-016 / ADR-029).
 */
export const API_SURFACES = {
  routeHandlers: "app/api/**/route.ts",
  moduleApi: "src/modules/*/api",
  serverActions: "server_actions_authenticated_ui_mutations",
  publicVersionedGlob: "app/api/v1/**/route.ts",
} as const;

export const ROUTE_HANDLER_CONVENTIONS = {
  callApplicationUseCasesOnly: true,
  validateAtBoundary: true,
  boundaryValidationLibrary: "zod" as const,
  /** Zod package may be added with first Route Handlers / ADR-027; stance is binding. */
  zodDependencyDeferredUntilFirstHandler: true,
  neverEmbedBusinessInvariantsInHandlers: true,
  documentEndpointsInOwningArd: true,
} as const;

/**
 * Wire JSON uses camelCase; PostgreSQL/Drizzle columns use snake_case.
 * Map at repository ↔ DTO / presentation boundary — never leak DB names on wire.
 */
export const NAMING_CONVENTION = {
  jsonWire: "camelCase",
  databaseColumns: "snake_case",
  mapAt: "repository_or_presentation_boundary",
} as const;

/**
 * High-level auth / request headers (auth ADRs implement schemes).
 * AuthZ enforcement remains in application layer (ADR-029 / ADR-034).
 */
export const AUTH_HEADER_EXPECTATIONS = {
  authorization: "Bearer_JWT_or_session_cookie",
  idempotencyKey: "Idempotency-Key",
  correlationId: "X-Correlation-Id",
  publicStorefront: "unauthenticated_rate_limited",
  adminRequires: "platform_admin",
  authZEnforcedIn: "application",
} as const;

/** Mutating paths that MUST send Idempotency-Key (ADR Decision + api-rules). */
export const IDEMPOTENCY_REQUIRED_OPERATIONS = [
  "sale_complete",
  "order_create",
] as const;

export type IdempotencyRequiredOperation =
  (typeof IDEMPOTENCY_REQUIRED_OPERATIONS)[number];

export const IDEMPOTENCY_POLICY = {
  headerName: "Idempotency-Key",
  requiredFor: IDEMPOTENCY_REQUIRED_OPERATIONS,
  storage: "deferred_to_sale_order_adrs",
} as const;

export const SECURITY_API_RULES = {
  neverReturnOtpInProduction: true,
  rateLimits: "adr_055_src_rate_limiting",
  authZInApplication: true,
  apiProtection: "adr_077_src_api_protection",
} as const;

/** Stable machine codes — English identifiers on the wire. */
export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_KEY_REQUIRED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/**
 * Iranian First — Persian human messages for API errors.
 * Strategy: envelope `message` is Persian; clients may also resolve `code` via this map.
 */
export const API_ERROR_MESSAGES_FA = {
  VALIDATION_ERROR: "اطلاعات ارسالی نامعتبر است.",
  UNAUTHORIZED: "برای ادامه وارد شوید.",
  FORBIDDEN: "اجازه دسترسی به این بخش را ندارید.",
  NOT_FOUND: "مورد درخواستی پیدا نشد.",
  CONFLICT: "این عملیات با وضعیت فعلی در تعارض است.",
  IDEMPOTENCY_KEY_REQUIRED:
    "برای این عملیات ارسال کلید یکتایی (Idempotency-Key) الزامی است.",
  RATE_LIMITED: "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
  INTERNAL_ERROR: "خطای داخلی رخ داد. لطفاً دوباره تلاش کنید.",
} as const satisfies Record<ApiErrorCode, string>;

/** Safe fallback when an unknown code reaches the edge. */
export const API_ERROR_FALLBACK_FA =
  "خطایی رخ داد. لطفاً دوباره تلاش کنید." as const;

export const PERSIAN_MESSAGE_STRATEGY = {
  primary: "persian_human_message_in_envelope",
  alternative: "stable_error_codes_with_persian_client_maps",
  locale: "fa-IR",
  alignsWithPresentation: PRESENTATION_MESSAGE_STRATEGY.humanReadableApiMessages,
} as const;

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  correlationId: string;
};

export type ApiErrorEnvelope = {
  error: ApiErrorBody;
};

export type ApiSuccessEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export const CORRELATION_ID = {
  required: true,
  headerName: AUTH_HEADER_EXPECTATIONS.correlationId,
  requestBoundary: REQUEST_BOUNDARY.correlationId,
  generateIfMissing: true,
} as const;

export function isVersionedApiPath(pathname: string): boolean {
  return (
    pathname === API_VERSION_PREFIX ||
    pathname.startsWith(`${API_VERSION_PREFIX}/`)
  );
}

export function resolvePersianMessage(code: string): string {
  if (Object.prototype.hasOwnProperty.call(API_ERROR_MESSAGES_FA, code)) {
    return API_ERROR_MESSAGES_FA[code as ApiErrorCode];
  }
  return API_ERROR_FALLBACK_FA;
}

export function ensureCorrelationId(
  incoming: string | null | undefined,
): string {
  const trimmed = incoming?.trim();
  if (trimmed) {
    return trimmed;
  }
  return randomUUID();
}

export function createErrorEnvelope(input: {
  code: string;
  correlationId?: string | null;
  details?: Record<string, unknown>;
  /** Override only when a specific Persian phrase is required beyond the map. */
  messageFa?: string;
}): ApiErrorEnvelope {
  const correlationId = ensureCorrelationId(input.correlationId);
  const message = input.messageFa ?? resolvePersianMessage(input.code);
  const body: ApiErrorBody = {
    code: input.code,
    message,
    correlationId,
  };
  if (input.details !== undefined) {
    body.details = input.details;
  }
  return { error: body };
}

export function createSuccessEnvelope<T>(
  data: T,
  meta?: Record<string, unknown>,
): ApiSuccessEnvelope<T> {
  if (meta === undefined) {
    return { data };
  }
  return { data, meta };
}

export function requireIdempotencyKey(
  operation: IdempotencyRequiredOperation,
  headerValue: string | null | undefined,
): string {
  if (
    !(IDEMPOTENCY_REQUIRED_OPERATIONS as readonly string[]).includes(operation)
  ) {
    throw new Error(
      `Unknown idempotency operation "${operation}" (ADR-030).`,
    );
  }
  const key = headerValue?.trim();
  if (!key) {
    throw new IdempotencyKeyRequiredError();
  }
  return key;
}

export class IdempotencyKeyRequiredError extends Error {
  readonly code = "IDEMPOTENCY_KEY_REQUIRED" as const;
  readonly envelope: ApiErrorEnvelope;

  constructor(correlationId?: string | null) {
    const envelope = createErrorEnvelope({
      code: "IDEMPOTENCY_KEY_REQUIRED",
      ...(correlationId !== undefined ? { correlationId } : {}),
    });
    super(envelope.error.message);
    this.name = "IdempotencyKeyRequiredError";
    this.envelope = envelope;
  }
}

export function assertPublicApiVersioned(pathname: string): void {
  if (
    (UNVERSIONED_API_PATHS as readonly string[]).includes(pathname) ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/ready")
  ) {
    return;
  }
  if (!pathname.startsWith("/api/")) {
    return;
  }
  if (!isVersionedApiPath(pathname)) {
    throw new Error(
      `Public business APIs must live under ${API_VERSION_PREFIX} (ADR-030); got "${pathname}".`,
    );
  }
}

export function assertErrorEnvelopeShape(envelope: ApiErrorEnvelope): void {
  const { error } = envelope;
  if (!error.code || typeof error.code !== "string") {
    throw new Error(`Error envelope requires string code (ADR-030).`);
  }
  if (!error.message || typeof error.message !== "string") {
    throw new Error(`Error envelope requires string message (ADR-030).`);
  }
  if (!error.correlationId || typeof error.correlationId !== "string") {
    throw new Error(
      `Error envelope requires correlationId (ADR-030 / ADR-029).`,
    );
  }
  if (!containsPersianScript(error.message)) {
    throw new Error(
      `Error envelope message must be Persian (ADR-030 Iranian First); got "${error.message}".`,
    );
  }
}

export function assertPersianApiMessages(
  strategy: { primary: string } = PERSIAN_MESSAGE_STRATEGY,
): void {
  if (strategy.primary !== "persian_human_message_in_envelope") {
    throw new Error(
      `API human messages must be Persian in the envelope (ADR-030); got "${strategy.primary}".`,
    );
  }
  for (const code of API_ERROR_CODES) {
    if (!containsPersianScript(API_ERROR_MESSAGES_FA[code])) {
      throw new Error(
        `API_ERROR_MESSAGES_FA["${code}"] must contain Persian script (ADR-030).`,
      );
    }
  }
}

export function assertNamingConvention(convention: {
  jsonWire: string;
  databaseColumns: string;
}): void {
  if (convention.jsonWire !== "camelCase") {
    throw new Error(
      `JSON wire format must be camelCase (ADR-030); got "${convention.jsonWire}".`,
    );
  }
  if (convention.databaseColumns !== "snake_case") {
    throw new Error(
      `Database columns remain snake_case (ADR-030); got "${convention.databaseColumns}".`,
    );
  }
}

export function assertBoundaryValidationLibrary(library: string): void {
  if (library !== ROUTE_HANDLER_CONVENTIONS.boundaryValidationLibrary) {
    throw new Error(
      `API boundary validation library must be "zod" (ADR-030); got "${library}".`,
    );
  }
}

export function assertAuthZInApplicationLayer(layer: string): void {
  if (layer !== AUTH_HEADER_EXPECTATIONS.authZEnforcedIn) {
    throw new Error(
      `AuthZ must be enforced in application layer (ADR-030 / ADR-029); got "${layer}".`,
    );
  }
}

export function assertNeverReturnOtpInProduction(policy: {
  neverReturnOtpInProduction: boolean;
}): void {
  if (!policy.neverReturnOtpInProduction) {
    throw new Error(
      `APIs must never return OTP in production (ADR-030 / api-rules).`,
    );
  }
}

function containsPersianScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export const API_STANDARDS = {
  versioning: VERSIONING_STANCE,
  surfaces: API_SURFACES,
  routeHandlerConventions: ROUTE_HANDLER_CONVENTIONS,
  naming: NAMING_CONVENTION,
  authHeaders: AUTH_HEADER_EXPECTATIONS,
  idempotency: IDEMPOTENCY_POLICY,
  security: SECURITY_API_RULES,
  errorCodes: API_ERROR_CODES,
  errorMessagesFa: API_ERROR_MESSAGES_FA,
  persianMessageStrategy: PERSIAN_MESSAGE_STRATEGY,
  correlationId: CORRELATION_ID,
  docs: {
    rules: "docs/rules/api-rules.md",
    architecture: "docs/architecture/15-api-architecture.md",
  },
} as const;
