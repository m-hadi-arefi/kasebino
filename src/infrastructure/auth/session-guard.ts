/**
 * ADR-095 — Session audience helpers for route protection & realtime auth.
 * No Next.js imports — safe for unit tests and edge-adjacent checks.
 */

export type SessionAudience = "merchant" | "customer";

export type AuthSessionSnapshot = {
  user?: {
    id?: string | null;
    merchantId?: string | null;
    roles?: string[] | null;
    role?: string | null;
    tokenVersion?: number | null;
    storeId?: string | null;
    audience?: string | null;
  } | null;
  audience?: string | null;
  merchantId?: string | null;
  roles?: string[] | null;
  role?: string | null;
  tokenVersion?: number | null;
  storeId?: string | null;
} | null;

export function sessionAudience(
  session: AuthSessionSnapshot,
): SessionAudience | null {
  if (!session) {
    return null;
  }
  const explicit =
    session.audience ?? session.user?.audience ?? null;
  if (
    explicit === "customer" ||
    session.role === "customer" ||
    session.user?.role === "customer"
  ) {
    return "customer";
  }
  if (explicit === "merchant") {
    return "merchant";
  }
  // Merchant JWT may lack audience on older tokens; treat staff user ids as merchant.
  if (typeof session.user?.id === "string" && session.user.id.length > 0) {
    return "merchant";
  }
  return null;
}

export function isMerchantSession(session: AuthSessionSnapshot): boolean {
  return sessionAudience(session) === "merchant";
}

export function isCustomerSession(session: AuthSessionSnapshot): boolean {
  return sessionAudience(session) === "customer";
}

export function merchantIdFromSession(
  session: AuthSessionSnapshot,
): string | null {
  if (!isMerchantSession(session)) {
    return null;
  }
  const id = session?.merchantId ?? session?.user?.merchantId ?? null;
  if (typeof id === "string" && id.trim().length > 0) {
    return id.trim();
  }
  return null;
}

/** Paths that require a merchant (or admin staff) JWT. */
export function isMerchantProtectedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/login" || path.startsWith("/login/")) {
    return false;
  }
  return (
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
    path === "/admin" ||
    path.startsWith("/admin/")
  );
}

/** Storefront customer portal under /s/:slug/dashboard. */
export function isCustomerDashboardPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return /^\/s\/[^/]+\/dashboard(?:\/|$)/.test(path);
}

export function isCustomerLoginPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return /^\/s\/[^/]+\/login(?:\/|$)/.test(path);
}

export function extractStoreSlug(pathname: string): string | null {
  const path = pathname.split("?")[0] ?? pathname;
  const match = /^\/s\/([^/]+)/.exec(path);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function merchantLoginPath(callbackUrl?: string): string {
  if (!callbackUrl) {
    return "/login";
  }
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export function customerLoginPath(
  storeSlug: string,
  callbackUrl?: string,
): string {
  const base = `/s/${encodeURIComponent(storeSlug)}/login`;
  if (!callbackUrl) {
    return base;
  }
  return `${base}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
