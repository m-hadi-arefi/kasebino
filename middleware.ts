import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * ADR-017 — coarse route-audience classification (Edge-safe; keep aligned with
 * `src/app-router-structure` `classifyRouteAudience` / `ROUTE_AUDIENCE_HEADER`).
 * Fine-grained authZ stays in the application layer (ADR-034).
 */
const ROUTE_AUDIENCE_HEADER = "x-mos-route-audience";

function classifyRouteAudience(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/api/v1" || path.startsWith("/api/v1/") || path.startsWith("/api/")) {
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
    path === "/staff" ||
    path.startsWith("/staff/")
  ) {
    return "merchant";
  }
  if (path === "/" || path === "") {
    return "marketing";
  }
  return "unknown";
}

export function middleware(request: NextRequest) {
  const audience = classifyRouteAudience(request.nextUrl.pathname);
  const response = NextResponse.next();
  response.headers.set(ROUTE_AUDIENCE_HEADER, audience);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
