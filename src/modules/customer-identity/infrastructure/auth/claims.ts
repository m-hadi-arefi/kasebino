/**
 * Edge-safe customer JWT claim mappers (no Credentials / Node SMS).
 */

import {
  CUSTOMER_AUTH_DECISION,
  CUSTOMER_JWT_CLAIMS_CONTRACT,
  assertCustomerJwtRole,
} from "../../../../customer-auth/index.js";

export type CustomerAuthUser = {
  id: string;
  role: "customer";
  tokenVersion: number;
  storeId: string | null;
  audience: "customer";
};

export type CustomerJwtClaims = {
  sub: string;
  role: "customer";
  tokenVersion: number;
  storeId: string | null;
  audience: "customer";
};

export function buildCustomerJwtClaims(input: {
  customerIdentityId: string;
  tokenVersion: number;
  storeId?: string | null;
}): CustomerJwtClaims {
  assertCustomerJwtRole(CUSTOMER_AUTH_DECISION.jwtRole);
  if (
    typeof input.tokenVersion !== "number" ||
    !Number.isInteger(input.tokenVersion) ||
    input.tokenVersion < 0
  ) {
    throw new Error(
      'Customer JWT claim "tokenVersion" must be a non-negative integer (ADR-032).',
    );
  }
  if (
    typeof input.customerIdentityId !== "string" ||
    input.customerIdentityId.length === 0
  ) {
    throw new Error('Customer JWT claim "sub" must be non-empty (ADR-032).');
  }
  return {
    sub: input.customerIdentityId,
    role: CUSTOMER_JWT_CLAIMS_CONTRACT.role,
    tokenVersion: input.tokenVersion,
    storeId: input.storeId ?? null,
    audience: CUSTOMER_AUTH_DECISION.audience,
  };
}

export function applyCustomerClaimsToToken(
  token: Record<string, unknown>,
  user: CustomerAuthUser,
): Record<string, unknown> {
  const claims = buildCustomerJwtClaims({
    customerIdentityId: user.id,
    tokenVersion: user.tokenVersion,
    storeId: user.storeId,
  });
  return {
    ...token,
    sub: claims.sub,
    role: claims.role,
    tokenVersion: claims.tokenVersion,
    storeId: claims.storeId,
    audience: claims.audience,
    merchantId: undefined,
    roles: undefined,
  };
}

export function applyCustomerClaimsToSession(
  session: { user?: Record<string, unknown> } & Record<string, unknown>,
  token: Record<string, unknown>,
): Record<string, unknown> {
  const claims = buildCustomerJwtClaims({
    customerIdentityId: String(token.sub ?? ""),
    tokenVersion:
      typeof token.tokenVersion === "number" ? token.tokenVersion : 0,
    storeId:
      token.storeId === null || typeof token.storeId === "string"
        ? (token.storeId as string | null)
        : null,
  });

  const user = {
    ...(session.user ?? {}),
    id: claims.sub,
    role: claims.role,
    tokenVersion: claims.tokenVersion,
    storeId: claims.storeId,
    audience: claims.audience,
  };

  return {
    ...session,
    user,
    audience: claims.audience,
    role: claims.role,
    tokenVersion: claims.tokenVersion,
    storeId: claims.storeId,
  };
}
