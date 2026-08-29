/**
 * ADR-119 — Edge-safe security runtime helpers (headers, CORS, CSRF).
 * No Node built-ins — safe for Next.js middleware.
 */

export const SECURITY_RUNTIME_ADR = "ADR-119" as const;

export const CSRF_HEADER_NAME = "x-csrf-token" as const;
export const CSRF_COOKIE_BASE_NAME = "mos.csrf" as const;

/** Persian user-facing security runtime messages (Iranian First). */
export const SECURITY_RUNTIME_MESSAGES_FA = {
  csrfMissing:
    "توکن امنیتی یافت نشد. صفحه را تازه کنید و دوباره تلاش کنید.",
  csrfInvalid:
    "توکن امنیتی نامعتبر است. صفحه را تازه کنید و دوباره تلاش کنید.",
  corsDenied: "دسترسی از این مبدأ مجاز نیست.",
  genericBlock:
    "به دلایل امنیتی امکان ادامه وجود ندارد. در صورت نیاز با پشتیبانی تماس بگیرید.",
} as const;

export type SecurityRuntimeMessageKey = keyof typeof SECURITY_RUNTIME_MESSAGES_FA;

export const MUTATING_HTTP_METHODS = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

/**
 * Next-compatible CSP for MVP (tighten with nonces in a later hardening pass).
 * Prefer Next defaults + avoid remote script origins.
 */
export const DEFAULT_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // mqtt.js (ADR-124) spawns blob: workers; barcode/canvas may use blob URLs.
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// POS camera barcode (ADR-096) needs camera; mic/geolocation/payment stay off.
export const DEFAULT_PERMISSIONS_POLICY =
  "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" as const;

export type SecurityHeaderMap = Record<string, string>;

export function resolveDeployEnv(input?: {
  mosEnv?: string | null;
  nodeEnv?: string | null;
}): string {
  const mos = (input?.mosEnv ?? "").trim().toLowerCase();
  if (mos) return mos;
  return (input?.nodeEnv ?? "development").trim().toLowerCase() || "development";
}

export function isHttpsEnforcedEnv(env: string): boolean {
  const normalized = env.trim().toLowerCase();
  return normalized === "staging" || normalized === "production";
}

export function csrfCookieName(secure: boolean): string {
  return secure ? `__Host-${CSRF_COOKIE_BASE_NAME}` : CSRF_COOKIE_BASE_NAME;
}

/** Build Helmet-equivalent response headers. */
export function buildSecurityHeaders(input?: {
  mosEnv?: string | null;
  nodeEnv?: string | null;
  contentSecurityPolicy?: string;
}): SecurityHeaderMap {
  const env = resolveDeployEnv(input);
  const headers: SecurityHeaderMap = {
    "Content-Security-Policy":
      input?.contentSecurityPolicy ?? DEFAULT_CONTENT_SECURITY_POLICY,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": DEFAULT_PERMISSIONS_POLICY,
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
  };

  if (isHttpsEnforcedEnv(env)) {
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

export function defaultCorsAllowedOrigins(): readonly string[] {
  return [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3020",
    "http://127.0.0.1:3020",
  ] as const;
}

/** Resolve CORS allowlist from env (comma-separated) + localhost defaults. */
export function resolveCorsAllowedOrigins(
  envValue?: string | null,
): string[] {
  const fromEnv = (envValue ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const merged = new Set<string>([...defaultCorsAllowedOrigins(), ...fromEnv]);
  return [...merged];
}

export function isOriginAllowed(
  origin: string | null | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (!origin?.trim()) return false;
  return allowedOrigins.includes(origin.trim());
}

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isCsrfExemptPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/api/auth" || path.startsWith("/api/auth/")) {
    return true;
  }
  if (
    path.startsWith("/api/v1/payments/webhooks/") ||
    path === "/api/v1/payments/webhooks"
  ) {
    return true;
  }
  if (
    path === "/api/health" ||
    path.startsWith("/api/health/") ||
    path === "/api/ready" ||
    path.startsWith("/api/ready/")
  ) {
    return true;
  }
  return false;
}

/** Cookie-session mutating `/api/v1` routes require CSRF token (FR-3). */
export function requiresCsrfProtection(input: {
  method: string;
  pathname: string;
}): boolean {
  const method = input.method.toUpperCase();
  if (!MUTATING_HTTP_METHODS.has(method)) {
    return false;
  }
  const path = input.pathname.split("?")[0] ?? input.pathname;
  if (!path.startsWith("/api/v1")) {
    return false;
  }
  return !isCsrfExemptPath(path);
}

export function mintCsrfToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

export function readCookieValue(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== name) continue;
    return decodeURIComponent(trimmed.slice(eq + 1).trim());
  }
  return null;
}

export type CsrfValidationResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "mismatch"; messageFa: string };

export function validateCsrfDoubleSubmit(input: {
  cookieToken: string | null | undefined;
  headerToken: string | null | undefined;
}): CsrfValidationResult {
  const cookie = input.cookieToken?.trim() ?? "";
  const header = input.headerToken?.trim() ?? "";
  if (!cookie || !header) {
    return {
      ok: false,
      reason: "missing",
      messageFa: SECURITY_RUNTIME_MESSAGES_FA.csrfMissing,
    };
  }
  if (cookie.length < 16 || header.length < 16 || cookie !== header) {
    return {
      ok: false,
      reason: "mismatch",
      messageFa: SECURITY_RUNTIME_MESSAGES_FA.csrfInvalid,
    };
  }
  return { ok: true };
}

/** Minimal API error envelope for middleware (edge-safe; matches ADR-030 shape). */
export function createSecurityErrorBody(input: {
  code: string;
  messageFa: string;
  correlationId?: string | null;
}): { error: { code: string; message: string; correlationId: string } } {
  return {
    error: {
      code: input.code,
      message: input.messageFa,
      correlationId:
        input.correlationId?.trim() ||
        (typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `sec-${Date.now()}`),
    },
  };
}

/**
 * Read CSRF token from `document.cookie` (browser).
 * Returns null on server / when cookie absent.
 */
export function readBrowserCsrfToken(secureHint?: boolean): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const tryNames = [
    csrfCookieName(secureHint === true),
    csrfCookieName(false),
    CSRF_COOKIE_BASE_NAME,
    `__Host-${CSRF_COOKIE_BASE_NAME}`,
  ];
  const seen = new Set<string>();
  for (const name of tryNames) {
    if (seen.has(name)) continue;
    seen.add(name);
    const value = readCookieValue(document.cookie, name);
    if (value) return value;
  }
  return null;
}

/** Headers to attach on cookie-authenticated same-origin mutations. */
export function csrfHeadersForBrowserFetch(
  secureHint?: boolean,
): Record<string, string> {
  const hint =
    secureHint ??
    (typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : undefined);
  const token = readBrowserCsrfToken(hint);
  if (!token) {
    return {};
  }
  return { [CSRF_HEADER_NAME]: token };
}
