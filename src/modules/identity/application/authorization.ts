/**
 * Identity application AuthZ helpers (ADR-034).
 *
 * Bridges ADR-033 JWT claims → RBAC AuthContext and application authorize.
 * Role assignment persistence remains Merchant-domain (ADR-005+).
 */

import {
  AuthorizationError,
  authorize,
  buildAuthzDenyMetricLabels,
  hasPermission,
  isAuthorizationError,
  normalizeRoles,
  requirePermission,
  type AuthContext,
  type AuthorizeInput,
  type CanonicalRole,
  type Permission,
} from "../../../infrastructure/security/rbac/index.js";
import type { MerchantJwtClaims } from "../../../infrastructure/auth/contracts/nextauth-jwt/index.js";

export type IdentityAuthContext = AuthContext & {
  rolesCanonical: readonly CanonicalRole[];
};

export type JwtAuthClaimsInput = Pick<
  MerchantJwtClaims,
  "sub" | "merchantId" | "roles" | "tokenVersion"
> & {
  permissions?: readonly string[];
  storeIds?: readonly string[];
};

/**
 * Build application AuthContext from JWT claims (+ optional store memberships).
 */
export function authContextFromJwtClaims(
  claims: JwtAuthClaimsInput,
): IdentityAuthContext {
  const rolesCanonical = normalizeRoles(claims.roles);
  const ctx: IdentityAuthContext = {
    sub: claims.sub,
    merchantId: claims.merchantId,
    roles: claims.roles,
    rolesCanonical,
    tokenVersion: claims.tokenVersion,
  };
  if (claims.permissions !== undefined) {
    ctx.permissions = claims.permissions as readonly Permission[];
  }
  if (claims.storeIds !== undefined) {
    ctx.storeIds = claims.storeIds;
  }
  return ctx;
}


/**
 * Authorize a mutation/query from JWT claims at the application boundary.
 */
export function authorizeFromJwtClaims(
  claims: JwtAuthClaimsInput,
  input: AuthorizeInput,
): IdentityAuthContext {
  const ctx = authContextFromJwtClaims(claims);
  authorize(ctx, input);
  return ctx;
}

/**
 * Deny-by-default permission gate from JWT claims (ADR-113).
 */
export function requirePermissionFromJwtClaims(
  claims: JwtAuthClaimsInput,
  permission: Permission,
  scope?: Omit<AuthorizeInput, "permission">,
): IdentityAuthContext {
  const ctx = authContextFromJwtClaims(claims);
  requirePermission(ctx, permission, scope);
  return ctx;
}

export function assertStaffPermissionFromJwt(
  claims: JwtAuthClaimsInput,
  permission: Permission,
  scope: {
    resourceMerchantId: string;
    resourceStoreId?: string | null;
  },
): IdentityAuthContext {
  return authorizeFromJwtClaims(claims, {
    permission,
    resourceMerchantId: scope.resourceMerchantId,
    ...(scope.resourceStoreId !== undefined
      ? { resourceStoreId: scope.resourceStoreId }
      : {}),
  });
}

export function jwtHasPermission(
  claims: JwtAuthClaimsInput,
  permission: Permission,
): boolean {
  return hasPermission(authContextFromJwtClaims(claims), permission);
}

export function captureAuthzDenyMetricFromError(
  error: unknown,
  roles: readonly string[],
): Record<"reason" | "permission" | "role", string> | null {
  if (!isAuthorizationError(error)) {
    return null;
  }
  return buildAuthzDenyMetricLabels({ error, roles });
}

export {
  AuthorizationError,
  authorize,
  hasPermission,
  isAuthorizationError,
  normalizeRoles,
  requirePermission,
  type AuthContext,
  type AuthorizeInput,
  type CanonicalRole,
  type Permission,
};
