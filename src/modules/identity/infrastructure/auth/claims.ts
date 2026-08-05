/**
 * Edge-safe merchant JWT claim mappers (no Credentials / Node SMS).
 */

import {
  buildMerchantJwtClaims,
  type MerchantJwtClaims,
} from "../../../../nextauth-jwt/index.js";

export type MerchantAuthUser = {
  id: string;
  merchantId: string | null;
  roles: string[];
  tokenVersion: number;
};

export function applyMerchantClaimsToToken(
  token: Record<string, unknown>,
  user: MerchantAuthUser,
): Record<string, unknown> {
  const claims = buildMerchantJwtClaims({
    authUserId: user.id,
    tokenVersion: user.tokenVersion,
    merchantId: user.merchantId,
    roles: user.roles,
  });
  return {
    ...token,
    sub: claims.sub,
    merchantId: claims.merchantId,
    roles: [...claims.roles],
    tokenVersion: claims.tokenVersion,
    audience: "merchant",
    role: undefined,
    storeId: undefined,
  };
}

export function applyMerchantClaimsToSession(
  session: { user?: Record<string, unknown> } & Record<string, unknown>,
  token: Record<string, unknown>,
): Record<string, unknown> {
  const claims: MerchantJwtClaims = buildMerchantJwtClaims({
    authUserId: String(token.sub ?? ""),
    tokenVersion:
      typeof token.tokenVersion === "number" ? token.tokenVersion : 0,
    merchantId:
      token.merchantId === null || typeof token.merchantId === "string"
        ? (token.merchantId as string | null)
        : null,
    roles: Array.isArray(token.roles) ? (token.roles as string[]) : [],
  });

  const user = {
    ...(session.user ?? {}),
    id: claims.sub,
    merchantId: claims.merchantId,
    roles: [...claims.roles],
    tokenVersion: claims.tokenVersion,
    audience: "merchant" as const,
  };

  return {
    ...session,
    user,
    audience: "merchant",
    merchantId: claims.merchantId,
    roles: [...claims.roles],
    tokenVersion: claims.tokenVersion,
  };
}
