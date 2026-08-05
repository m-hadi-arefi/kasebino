/**
 * ADR-119 — Security Hardening Runtime
 *
 * Edge middleware: Helmet-equivalent headers, strict CORS for `/api/*`,
 * CSRF double-submit for cookie-session mutating `/api/v1/*`.
 * Session gates from ADR-095.
 */

import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";

import { authConfig } from "@/auth.config";
import {
  customerLoginPath,
  extractStoreSlug,
  isCustomerDashboardPath,
  isCustomerLoginPath,
  isCustomerSession,
  isMerchantProtectedPath,
  isMerchantSession,
  merchantLoginPath,
} from "@/infrastructure/auth/session-guard";
import {
  CSRF_HEADER_NAME,
  SECURITY_RUNTIME_MESSAGES_FA,
  buildSecurityHeaders,
  createSecurityErrorBody,
  csrfCookieName,
  isApiPath,
  isHttpsEnforcedEnv,
  isOriginAllowed,
  mintCsrfToken,
  readCookieValue,
  requiresCsrfProtection,
  resolveCorsAllowedOrigins,
  resolveDeployEnv,
  validateCsrfDoubleSubmit,
} from "@/infrastructure/security";

const ROUTE_AUDIENCE_HEADER = "x-mos-route-audience";

const { auth } = NextAuth(authConfig);

function classifyRouteAudience(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;
  if (
    path === "/api/v1" ||
    path.startsWith("/api/v1/") ||
    path.startsWith("/api/")
  ) {
    return "api";
  }
  if (path === "/admin" || path.startsWith("/admin/")) {
    return "admin";
  }
  if (path === "/s" || path.startsWith("/s/")) {
    return "storefront";
  }
  if (
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path === "/pos" ||
    path.startsWith("/pos/") ||
    path === "/products" ||
    path.startsWith("/products/") ||
    path === "/inventory" ||
    path.startsWith("/inventory/") ||
    path === "/customers" ||
    path.startsWith("/customers/") ||
    path === "/loyalty" ||
    path.startsWith("/loyalty/") ||
    path === "/orders" ||
    path.startsWith("/orders/") ||
    path === "/stores" ||
    path.startsWith("/stores/") ||
    path === "/onboarding" ||
    path.startsWith("/onboarding/") ||
    path === "/notifications" ||
    path.startsWith("/notifications/") ||
    path === "/staff" ||
    path.startsWith("/staff/") ||
    path === "/login" ||
    path.startsWith("/login/")
  ) {
    return "merchant";
  }
  if (path === "/" || path === "") {
    return "marketing";
  }
  return "unknown";
}

function deployEnv(): string {
  return resolveDeployEnv({
    mosEnv: process.env.MOS_ENV,
    nodeEnv: process.env.NODE_ENV,
  });
}

function secureCookies(): boolean {
  // Use Secure / `__Host-` CSRF cookies only when the deploy env requires HTTPS.
  // Local Docker runs `NODE_ENV=production` over `http://localhost` — browsers
  // reject Secure cookies on HTTP, so CSRF double-submit breaks (ADR-119).
  return isHttpsEnforcedEnv(deployEnv());
}

function applySecurityHeaders(response: NextResponse): void {
  const headers = buildSecurityHeaders({
    mosEnv: process.env.MOS_ENV,
    nodeEnv: process.env.NODE_ENV,
  });
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
}

function ensureCsrfCookie(request: NextRequest, response: NextResponse): string {
  const name = csrfCookieName(secureCookies());
  const existing = readCookieValue(request.headers.get("cookie"), name);
  if (existing && existing.length >= 16) {
    return existing;
  }
  const token = mintCsrfToken();
  response.cookies.set({
    name,
    value: token,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: secureCookies(),
  });
  return token;
}

function applyCors(request: NextRequest, response: NextResponse): boolean {
  if (!isApiPath(request.nextUrl.pathname)) {
    return true;
  }

  const origin = request.headers.get("origin");
  const allowed = resolveCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

  if (!origin) {
    return true;
  }

  if (!isOriginAllowed(origin, allowed)) {
    return false;
  }

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Headers",
    `Content-Type, Authorization, X-Correlation-Id, Idempotency-Key, ${CSRF_HEADER_NAME}`,
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  response.headers.set("Vary", "Origin");
  return true;
}

function csrfForbidden(request: NextRequest, messageFa: string): NextResponse {
  const correlationId =
    request.headers.get("x-correlation-id") ??
    request.headers.get("X-Correlation-Id");
  const body = createSecurityErrorBody({
    code: "CSRF_REJECTED",
    messageFa,
    correlationId,
  });
  const response = NextResponse.json(body, { status: 403 });
  applySecurityHeaders(response);
  ensureCsrfCookie(request, response);
  applyCors(request, response);
  response.headers.set(
    ROUTE_AUDIENCE_HEADER,
    classifyRouteAudience(request.nextUrl.pathname),
  );
  return response;
}

function corsForbidden(request: NextRequest): NextResponse {
  const correlationId =
    request.headers.get("x-correlation-id") ??
    request.headers.get("X-Correlation-Id");
  const body = createSecurityErrorBody({
    code: "CORS_REJECTED",
    messageFa: SECURITY_RUNTIME_MESSAGES_FA.corsDenied,
    correlationId,
  });
  const response = NextResponse.json(body, { status: 403 });
  applySecurityHeaders(response);
  response.headers.set(
    ROUTE_AUDIENCE_HEADER,
    classifyRouteAudience(request.nextUrl.pathname),
  );
  return response;
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const audience = classifyRouteAudience(pathname);
  const session = request.auth;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS" && isApiPath(pathname)) {
    const response = new NextResponse(null, { status: 204 });
    applySecurityHeaders(response);
    if (!applyCors(request, response)) {
      return corsForbidden(request);
    }
    ensureCsrfCookie(request, response);
    response.headers.set(ROUTE_AUDIENCE_HEADER, audience);
    return response;
  }

  if (requiresCsrfProtection({ method, pathname })) {
    const name = csrfCookieName(secureCookies());
    const cookieToken = readCookieValue(request.headers.get("cookie"), name);
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    const check = validateCsrfDoubleSubmit({ cookieToken, headerToken });
    if (!check.ok) {
      return csrfForbidden(request, check.messageFa);
    }
  }

  if (isMerchantProtectedPath(pathname) && !isMerchantSession(session)) {
    const url = new URL(
      merchantLoginPath(`${pathname}${request.nextUrl.search}`),
      request.nextUrl.origin,
    );
    const response = NextResponse.redirect(url);
    applySecurityHeaders(response);
    ensureCsrfCookie(request, response);
    response.headers.set(ROUTE_AUDIENCE_HEADER, audience);
    return response;
  }

  if (
    isCustomerDashboardPath(pathname) &&
    !isCustomerLoginPath(pathname) &&
    !isCustomerSession(session)
  ) {
    const storeSlug = extractStoreSlug(pathname) ?? "store";
    const url = new URL(
      customerLoginPath(
        storeSlug,
        `${pathname}${request.nextUrl.search}`,
      ),
      request.nextUrl.origin,
    );
    const response = NextResponse.redirect(url);
    applySecurityHeaders(response);
    ensureCsrfCookie(request, response);
    response.headers.set(ROUTE_AUDIENCE_HEADER, audience);
    return response;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  if (!applyCors(request, response)) {
    return corsForbidden(request);
  }
  ensureCsrfCookie(request, response);
  response.headers.set(ROUTE_AUDIENCE_HEADER, audience);
  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
