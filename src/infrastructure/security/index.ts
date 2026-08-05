/**
 * ADR-119 — Security Hardening Runtime (headers / CORS / CSRF).
 */

export {
  CSRF_COOKIE_BASE_NAME,
  CSRF_HEADER_NAME,
  DEFAULT_CONTENT_SECURITY_POLICY,
  DEFAULT_PERMISSIONS_POLICY,
  MUTATING_HTTP_METHODS,
  SECURITY_RUNTIME_ADR,
  SECURITY_RUNTIME_MESSAGES_FA,
  buildSecurityHeaders,
  createSecurityErrorBody,
  csrfCookieName,
  csrfHeadersForBrowserFetch,
  defaultCorsAllowedOrigins,
  isApiPath,
  isCsrfExemptPath,
  isHttpsEnforcedEnv,
  isOriginAllowed,
  mintCsrfToken,
  readBrowserCsrfToken,
  readCookieValue,
  requiresCsrfProtection,
  resolveCorsAllowedOrigins,
  resolveDeployEnv,
  validateCsrfDoubleSubmit,
  type CsrfValidationResult,
  type SecurityHeaderMap,
  type SecurityRuntimeMessageKey,
} from "./runtime.js";
