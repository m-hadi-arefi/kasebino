/**
 * ADR-076 — Security Architecture contract.
 *
 * Defense-in-depth baseline for multi-tenant + payments + Iranian phone PII.
 * Normative prose: docs/architecture/06-security-architecture.md,
 * docs/rules/security-rules.md
 *
 * Rate-limit package → ADR-055 (`src/infrastructure/security/rate-limiting`); audit persistence →
 * `src/infrastructure/security/contracts/audit-logging/` (ADR-058);
 * pen-test smoke / full hardening → ARD-020. Next.js route matrix wiring still caller-side.
 */

import { SECURITY_API_RULES } from "../../../../shared/contracts/api-standards/index.js";
import { EXCLUSIVE_SQL_ORM } from "../../../database/contracts/drizzle-strategy/index.js";
import {
  SECRET_POLICY,
  AUTH_SECRET_ENV,
} from "../../../../shared/contracts/env-secrets/index.js";
import {
  MERCHANT_OTP_POLICY,
  MERCHANT_OTP_RATE_LIMIT,
} from "../../../../modules/identity/domain/merchant-auth/index.js";
import {
  CROSS_TENANT_DENY,
  assertTenantMatch,
} from "../../../../shared/contracts/multi-tenant-isolation/index.js";
import {
  SECURE_COOKIE_RULES,
  JWT_SESSION_TTL,
} from "../../../auth/contracts/nextauth-jwt/index.js";
import {
  CANONICAL_ROLES,
  SECURITY_ARCHITECTURE_DOC as RBAC_SECURITY_DOC,
} from "../../rbac/index.js";

/** Normative strategy / rules documents. */
export const SECURITY_ARCHITECTURE_DOC =
  "docs/architecture/06-security-architecture.md" as const;
export const SECURITY_RULES_DOC = "docs/rules/security-rules.md" as const;
export const SECURITY_MONITORING_DOC =
  "docs/architecture/security-monitoring-architecture.md" as const;

/**
 * Core decision snapshot (ADR-076 Decision).
 */
export const SECURITY_DECISION = {
  adr: "ADR-076",
  strategy: "defense_in_depth" as const,
  httpsOnlyStagingProd: true,
  secureCookies: true,
  zodAtApiBoundary: true,
  parameterizedSqlOnly: true,
  csrfXssProtections: true,
  tenantGuards: true,
  auditSensitiveMutations: true,
  rateLimits: true,
  rateLimitEnforcementAdr: "ADR-055",
  rateLimitPackage: "src/infrastructure/security/rate-limiting",
  auditImplementationAdr: "ADR-058",
  auditImplementationPackage: "src/infrastructure/security/contracts/audit-logging/",
  penSmokeArd: "ARD-020",
  apiProtectionAdr: "ADR-077",
  apiProtectionPackage: "src/infrastructure/security/contracts/api-protection",
} as const;

/**
 * Threat → control map (06-security-architecture.md).
 * Iranian SMS OTP abuse is a first-class threat (local markets).
 */
export const THREAT_CONTROLS = {
  credentialStuffingOtpSpam: {
    threat: "credential_stuffing_otp_spam",
    controls: [
      "redis_rate_limits",
      "otp_attempt_caps",
      "fail_closed_when_redis_down",
    ] as const,
    iranSmsAbuse: true,
    rateLimitAdr: "ADR-055",
    otpRequestsPerMinute: MERCHANT_OTP_RATE_LIMIT.otpRequestsPerMinute,
    otpMaxAttempts: MERCHANT_OTP_POLICY.maxAttempts,
  },
  sessionTheft: {
    threat: "session_theft",
    controls: [
      "secure_cookies",
      "https",
      "short_jwt_ttl",
      "token_version_logout_all",
    ] as const,
    jwtMaxAgeSeconds: JWT_SESSION_TTL.maxAgeSeconds,
  },
  xss: {
    threat: "xss",
    controls: ["react_escaping", "csp", "no_unsanitized_html"] as const,
  },
  csrf: {
    threat: "csrf",
    controls: [
      "nextjs_server_action_protections",
      "samesite_cookies",
    ] as const,
    sameSite: SECURE_COOKIE_RULES.sameSite,
  },
  sqli: {
    threat: "sqli",
    controls: [
      "drizzle_parameterized_only",
      "no_string_concat_sql",
      "no_alternate_orms",
    ] as const,
    orm: EXCLUSIVE_SQL_ORM.name,
    parameterized: EXCLUSIVE_SQL_ORM.parameterizedQueriesOnly,
  },
  idorTenantLeak: {
    threat: "idor_tenant_leak",
    controls: [
      "merchant_id_repo_guards",
      "auth_context_filters",
      "rbac_at_app_boundary",
    ] as const,
    isolationAdr: "ADR-048",
    rbacAdr: "ADR-034",
  },
  inventoryFraud: {
    threat: "inventory_fraud",
    controls: ["audit_logs", "admin_monitoring_hooks"] as const,
    auditAdr: "ADR-058",
    monitoringArd: "ARD-026",
  },
  ssrfUploads: {
    threat: "ssrf_via_uploads",
    controls: ["minio_signed_urls", "type_size_validation"] as const,
    storageAdr: "ADR-040",
  },
} as const;

export type ThreatKey = keyof typeof THREAT_CONTROLS;

/**
 * AuthN / AuthZ pillars — compose ADR-031/032/033 + ADR-034.
 */
export const AUTHN_AUTHZ = {
  authn: {
    strategy: "phone_otp_to_jwt",
    merchant: "ADR-031",
    customer: "ADR-032",
    session: "ADR-033",
    passwordlessMvp: true,
  },
  authz: {
    model: "rbac",
    boundary: "application_service",
    contract: "src/infrastructure/security/rbac",
    roles: CANONICAL_ROLES,
    everyQueryMutationTenantChecked: true,
    persianDenyMessages: true,
    denyMetric: "authz.deny",
  },
} as const;

/**
 * Tenant isolation pillar — ADR-048.
 */
export const TENANT_ISOLATION_CONTROLS = {
  merchantIdOnRepos: true,
  authContextFilters: true,
  denyCrossTenant: CROSS_TENANT_DENY.forbidReadOtherMerchantByIdAlone,
  platformAdminAuditedOnly: true,
  mandatoryIsolationTests: CROSS_TENANT_DENY.mandatoryIsolationTests,
  detailAdr: "ADR-048",
} as const;

/**
 * Secrets pillar — ADR-068.
 */
export const SECRETS_CONTROLS = {
  envOnly: SECRET_POLICY.secretsViaEnvOrSecretManager,
  neverCommit: SECRET_POLICY.neverCommitDotEnv,
  authSecretEnv: AUTH_SECRET_ENV,
  separatePerEnvironment: true,
  noSecretsInLogs: true,
  detailAdr: "ADR-068",
} as const;

/**
 * OTP / token log hygiene — never log OTP codes or raw tokens.
 * Iranian phone auth safety (SMS OTP is primary auth factor).
 */
export const OTP_LOG_HYGIENE = {
  neverLogOtp: true,
  neverLogRawTokens: true,
  neverLogAuthSecret: true,
  storeHashedOtpAtRest: MERCHANT_OTP_POLICY.storeHashedAtRest,
  neverStorePlaintextOtp: MERCHANT_OTP_POLICY.neverStorePlaintext,
  neverReturnOtpInProduction: SECURITY_API_RULES.neverReturnOtpInProduction,
  /** Fields that must be redacted from structured logs / traces. */
  redactedLogFields: [
    "otp",
    "code",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "cookie",
    "AUTH_SECRET",
    "password",
  ] as const,
} as const;

/**
 * HTTPS + secure session cookies (align ADR-033 for Iranian mobile HTTPS).
 */
export const TRANSPORT_COOKIE_CONTROLS = {
  httpsOnlyStagingProd: true,
  cookies: {
    httpOnly: SECURE_COOKIE_RULES.httpOnly,
    secureInProduction: SECURE_COOKIE_RULES.secureInProduction,
    sameSite: SECURE_COOKIE_RULES.sameSite,
    path: SECURE_COOKIE_RULES.path,
    useSecureCookiePrefixInProduction:
      SECURE_COOKIE_RULES.useSecureCookiePrefixInProduction,
  },
  shortJwtTtl: JWT_SESSION_TTL.shortTtlRequired,
  maxAgeSeconds: JWT_SESSION_TTL.maxAgeSeconds,
  cookieContract: "src/infrastructure/auth/contracts/nextauth-jwt",
} as const;

/**
 * Security response headers checklist (applied when Next middleware / ARD-020).
 * Binding stance now; runtime wiring deferred with app shell.
 */
export const SECURITY_HEADERS_CHECKLIST = {
  contentSecurityPolicy: {
    required: true,
    note: "React default escaping + CSP; no unsanitized HTML",
  },
  strictTransportSecurity: {
    requiredInStagingProd: true,
    note: "HSTS when HTTPS terminated at edge / app",
  },
  xContentTypeOptions: {
    value: "nosniff",
    required: true,
  },
  xFrameOptions: {
    value: "DENY",
    required: true,
    note: "Or CSP frame-ancestors 'none'",
  },
  referrerPolicy: {
    value: "strict-origin-when-cross-origin",
    required: true,
  },
  permissionsPolicy: {
    required: true,
    note: "Disable unused powerful APIs (camera/mic/geolocation as needed)",
  },
  crossOriginOpenerPolicy: {
    recommended: true,
    value: "same-origin",
  },
  runtimeWiring: "adr_119_next_middleware_and_headers",
} as const;

/**
 * Validation + data protection baselines.
 * Deepened in ADR-077 (`src/infrastructure/security/contracts/api-protection`).
 */
export const VALIDATION_AND_DATA = {
  zodAtApiBoundary: true,
  zodPackageWhenFirstRouteHandlers: true,
  softDeletedNotListedByDefault: true,
  piiMinimization: true,
  phonePiiTreatAsSensitive: true,
  apiProtectionAdr: "ADR-077",
  apiProtectionPackage: "src/infrastructure/security/contracts/api-protection",
} as const;

/**
 * Audit + monitoring hooks — AuditPort → mos_audit (ADR-058); monitoring ARD-026.
 */
export const AUDIT_MONITORING_HOOKS = {
  sensitiveMutationsAudited: true,
  auditInsertOnly: true,
  auditImplementationAdr: "ADR-058",
  auditImplementationPackage: "src/infrastructure/security/contracts/audit-logging/",
  securityMonitoringArd: "ARD-026",
  nonBlockingEmit: true,
  authzDenyMetric: "authz.deny",
} as const;

/**
 * Security DoD for ARDs (06-security-architecture.md).
 */
export const SECURITY_DOD_FOR_ARDS = {
  authZTests: true,
  rateLimitWhereSpecified: true,
  noSecretsInLogs: true,
  softDeletedNotListedByDefault: true,
  tenantIsolationTestsWhenDataTouched: true,
  penSmoke: "ARD-020",
} as const;

/**
 * Iranian First — OTP/SMS safety + Persian security UX copy.
 * Settings pages RTL when UI lands (uiuxpromax); no pages this ADR.
 */
export const IRANIAN_OTP_SECURITY = {
  smsOtpPrimaryAuthFactor: true,
  threatModelIncludesLocalOtpAbuse: true,
  rateLimitOtpAndAuthRoutes: true,
  phoneFormats: ["09xxxxxxxxx", "+98xxxxxxxxxx"] as const,
  rtlSecuritySettingsWhenUiLands: true,
  mobileFriendlyAuthChallenges: true,
  locale: "fa-IR",
} as const;

/**
 * Persian user-facing security warnings (no English-only scary blocks).
 * Technical codes stay English for operators / telemetry.
 */
export const SECURITY_USER_MESSAGES_FA = {
  sessionExpired: "نشست شما منقضی شده است. دوباره وارد شوید.",
  accessDenied: "اجازه دسترسی به این بخش را ندارید.",
  authChallengeRequired: "برای ادامه باید هویت خود را تأیید کنید.",
  tooManyAttempts:
    "تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
  insecureConnection:
    "اتصال امن برقرار نیست. لطفاً از آدرس HTTPS استفاده کنید.",
  genericSecurityBlock:
    "به دلایل امنیتی امکان ادامه وجود ندارد. در صورت نیاز با پشتیبانی تماس بگیرید.",
} as const;

export type SecurityUserMessageKey = keyof typeof SECURITY_USER_MESSAGES_FA;

export const SECURITY_REQUIREMENTS = {
  defenseInDepth: true,
  httpsSecureCookies: true,
  otpNeverLogged: true,
  tokensNeverLogged: true,
  tenantGuards: true,
  rbacAtAppBoundary: true,
  zodAtBoundary: true,
  parameterizedSql: true,
  csrfXssStance: true,
  securityHeadersChecklist: true,
  persianSecurityMessages: true,
  iranianOtpAbuseThreatModeled: true,
  rateLimitDeferredAdr055: false,
  rateLimitEnforcedAdr055: true,
  auditDeferredAdr058: false,
  auditImplementedAdr058: true,
} as const;

export const SECURITY_ARCHITECTURE = {
  decision: SECURITY_DECISION,
  threatControls: THREAT_CONTROLS,
  authnAuthz: AUTHN_AUTHZ,
  tenantIsolation: TENANT_ISOLATION_CONTROLS,
  secrets: SECRETS_CONTROLS,
  otpLogHygiene: OTP_LOG_HYGIENE,
  transportCookies: TRANSPORT_COOKIE_CONTROLS,
  securityHeaders: SECURITY_HEADERS_CHECKLIST,
  validationAndData: VALIDATION_AND_DATA,
  auditMonitoring: AUDIT_MONITORING_HOOKS,
  dodForArds: SECURITY_DOD_FOR_ARDS,
  iranianOtpSecurity: IRANIAN_OTP_SECURITY,
  userMessagesFa: SECURITY_USER_MESSAGES_FA,
  requirements: SECURITY_REQUIREMENTS,
  docs: {
    architecture: SECURITY_ARCHITECTURE_DOC,
    rules: SECURITY_RULES_DOC,
    monitoring: SECURITY_MONITORING_DOC,
    rbacAlsoReferences: RBAC_SECURITY_DOC,
  },
} as const;

const PERSIAN_SCRIPT = /[\u0600-\u06FF]/;

function normalizeLogHaystack(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Reject log / telemetry payloads that appear to contain OTP codes or raw tokens.
 * Heuristic for contract tests and future log middleware.
 */
export function assertSafeAuthLogPayload(payload: unknown): void {
  const text = normalizeLogHaystack(payload);
  const lower = text.toLowerCase();

  // Explicit redacted-field names with values that look like secrets/codes.
  for (const field of OTP_LOG_HYGIENE.redactedLogFields) {
    const pattern = new RegExp(
      `["']?${field}["']?\\s*[:=]\\s*["']?[^"'\\s,}{]+`,
      "i",
    );
    if (pattern.test(text)) {
      throw new Error(
        `Auth log payload must not include "${field}" values (ADR-076 — never log OTP/tokens).`,
      );
    }
  }

  // Bare 6-digit OTP adjacent to otp/code markers (Iranian SMS OTP length).
  if (
    /\b(otp|code)\b[^0-9]{0,16}\b\d{6}\b/i.test(text) ||
    /\b\d{6}\b[^0-9]{0,16}\b(otp|code)\b/i.test(text)
  ) {
    throw new Error(
      "Auth log payload must not include OTP codes (ADR-076).",
    );
  }

  if (
    lower.includes("bearer ") ||
    /eyj[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+/i.test(text)
  ) {
    throw new Error(
      "Auth log payload must not include raw bearer/JWT tokens (ADR-076).",
    );
  }
}

export function assertHttpsInStagingProd(input: {
  nodeEnv: string;
  requestIsHttps: boolean;
}): void {
  if (
    (input.nodeEnv === "production" || input.nodeEnv === "staging") &&
    !input.requestIsHttps
  ) {
    throw new Error(
      `HTTPS required in ${input.nodeEnv} (ADR-076 / security-rules).`,
    );
  }
}

export function assertSecureCookieOptions(options: {
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  path?: string;
  nodeEnv: string;
}): void {
  if (!options.httpOnly) {
    throw new Error("Session cookie must be httpOnly (ADR-076 / ADR-033).");
  }
  if (options.sameSite !== SECURE_COOKIE_RULES.sameSite) {
    throw new Error(
      `Session cookie sameSite must be "${SECURE_COOKIE_RULES.sameSite}" (ADR-076).`,
    );
  }
  if (
    (options.nodeEnv === "production" || options.nodeEnv === "staging") &&
    !options.secure
  ) {
    throw new Error(
      "Session cookie must be secure in staging/production HTTPS (ADR-076).",
    );
  }
  if (
    options.path !== undefined &&
    options.path !== SECURE_COOKIE_RULES.path
  ) {
    throw new Error(
      `Session cookie path must be "${SECURE_COOKIE_RULES.path}" (ADR-076).`,
    );
  }
}

export function assertSecurityHeadersChecklistComplete(present: {
  contentSecurityPolicy: boolean;
  strictTransportSecurityInStagingProd: boolean;
  xContentTypeOptions: boolean;
  xFrameOptions: boolean;
  referrerPolicy: boolean;
  permissionsPolicy: boolean;
}): void {
  if (!present.contentSecurityPolicy) {
    throw new Error("CSP required on security headers checklist (ADR-076).");
  }
  if (!present.strictTransportSecurityInStagingProd) {
    throw new Error("HSTS required for staging/prod checklist (ADR-076).");
  }
  if (!present.xContentTypeOptions) {
    throw new Error("X-Content-Type-Options nosniff required (ADR-076).");
  }
  if (!present.xFrameOptions) {
    throw new Error("X-Frame-Options / frame-ancestors required (ADR-076).");
  }
  if (!present.referrerPolicy) {
    throw new Error("Referrer-Policy required (ADR-076).");
  }
  if (!present.permissionsPolicy) {
    throw new Error("Permissions-Policy required (ADR-076).");
  }
}

export function assertTenantIsolationControl(input: {
  rowMerchantId: string;
  authMerchantId: string;
}): void {
  assertTenantMatch({
    rowMerchantId: input.rowMerchantId,
    authMerchantId: input.authMerchantId,
  });
}

export function assertPersianSecurityMessage(messageFa: string): void {
  if (!PERSIAN_SCRIPT.test(messageFa)) {
    throw new Error(
      "Security user message must contain Persian script (ADR-076 Iranian First).",
    );
  }
}

export function assertNoOtpInProductionResponse(input: {
  nodeEnv: string;
  responseIncludesOtp: boolean;
}): void {
  if (input.nodeEnv === "production" && input.responseIncludesOtp) {
    throw new Error(
      "Production responses must never include OTP (ADR-076 / ADR-030).",
    );
  }
}

export function listThreatKeys(): ThreatKey[] {
  return Object.keys(THREAT_CONTROLS) as ThreatKey[];
}
