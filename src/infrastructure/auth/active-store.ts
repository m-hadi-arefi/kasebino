/**
 * ADR-121 — Active store cookie for multi-store merchant context.
 * Cookie is httpOnly; clients switch via /api/v1/stores/active.
 */

export const ACTIVE_STORE_COOKIE = "mos-active-store-id" as const;

export const ACTIVE_STORE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAgeSeconds: 60 * 60 * 24 * 180,
};

export function parseActiveStoreCookie(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    if (name !== ACTIVE_STORE_COOKIE) continue;
    const value = decodeURIComponent(trimmed.slice(eq + 1).trim());
    return value.length > 0 ? value : null;
  }
  return null;
}

export function activeStoreSetCookieHeader(
  storeId: string,
  secure: boolean,
): string {
  const maxAge = ACTIVE_STORE_COOKIE_OPTIONS.maxAgeSeconds;
  const secureFlag = secure ? "; Secure" : "";
  return `${ACTIVE_STORE_COOKIE}=${encodeURIComponent(storeId)}; Path=${ACTIVE_STORE_COOKIE_OPTIONS.path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureFlag}`;
}

export function activeStoreClearCookieHeader(secure: boolean): string {
  const secureFlag = secure ? "; Secure" : "";
  return `${ACTIVE_STORE_COOKIE}=; Path=${ACTIVE_STORE_COOKIE_OPTIONS.path}; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`;
}
