/**
 * ADR-094 / ADR-095 / ADR-113 — session + permission guards for HTTP handlers.
 * Never trust body merchantId alone for tenant scope. Deny by default.
 */

import {
  authContextFromJwtClaims,
  isAuthorizationError,
  requirePermission,
  type IdentityAuthContext,
  type Permission,
} from "../../modules/identity/application/authorization.js";
import {
  isCustomerSession,
  isMerchantSession,
  merchantIdFromSession,
  type AuthSessionSnapshot,
} from "../auth/session-guard.js";
import type { MerchantRepository } from "../../modules/merchant/domain/repositories.js";
import { fail } from "./envelopes.js";
import type {
  AuthenticatedAdmin,
  AuthenticatedCustomer,
  AuthenticatedMerchant,
  HttpHandlerResult,
} from "./types.js";

export type SessionLoader = () => Promise<AuthSessionSnapshot>;

/**
 * ADR-121 / AUTH-06 — when JWT still has null merchantId after create-merchant,
 * hydrate from ownerUserId so subsequent store APIs work without re-login.
 */
export async function hydrateMerchantSessionClaims(
  session: AuthSessionSnapshot,
  merchants: MerchantRepository,
): Promise<AuthSessionSnapshot> {
  if (!session || !isMerchantSession(session)) {
    return session;
  }
  if (merchantIdFromSession(session)) {
    return session;
  }
  const userId = userIdOf(session);
  if (!userId) {
    return session;
  }
  const merchant = await merchants.findByOwnerUserId(userId);
  if (!merchant) {
    return session;
  }
  const roles =
    rolesOf(session).length > 0 ? rolesOf(session) : ["merchant_owner"];
  return {
    ...session,
    merchantId: merchant.id,
    roles,
    user: {
      ...(session.user ?? {}),
      id: userId,
      merchantId: merchant.id,
      roles,
      audience: "merchant",
    },
    audience: "merchant",
  };
}

function rolesOf(session: AuthSessionSnapshot): string[] {
  const fromRoot = session?.roles;
  const fromUser = session?.user?.roles;
  if (Array.isArray(fromRoot) && fromRoot.length > 0) {
    return fromRoot.filter((r): r is string => typeof r === "string");
  }
  if (Array.isArray(fromUser) && fromUser.length > 0) {
    return fromUser.filter((r): r is string => typeof r === "string");
  }
  const single = session?.role ?? session?.user?.role;
  if (typeof single === "string" && single.length > 0) {
    return [single];
  }
  return [];
}

function userIdOf(session: AuthSessionSnapshot): string | null {
  const id = session?.user?.id;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
}

function authzFail(
  correlationId: string,
  error: unknown,
): HttpHandlerResult {
  if (isAuthorizationError(error)) {
    const status = error.code === "UNAUTHENTICATED" ? 401 : 403;
    const code =
      error.code === "UNAUTHENTICATED"
        ? "UNAUTHORIZED"
        : error.code === "CROSS_TENANT"
          ? "FORBIDDEN"
          : error.code === "STORE_SCOPE_DENIED"
            ? "FORBIDDEN"
            : error.code === "CUSTOMER_STAFF_BOUNDARY"
              ? "FORBIDDEN"
              : error.code === "FORBIDDEN"
                ? "FORBIDDEN"
                : "FORBIDDEN";
    return fail({
      code,
      correlationId,
      status,
      messageFa: error.messageFa,
    });
  }
  return fail({
    code: "FORBIDDEN",
    correlationId,
    status: 403,
  });
}

export function requireMerchantAuth(
  session: AuthSessionSnapshot,
  correlationId: string,
):
  | { ok: true; actor: AuthenticatedMerchant; auth: IdentityAuthContext }
  | { ok: false; result: HttpHandlerResult } {
  if (!isMerchantSession(session)) {
    return {
      ok: false,
      result: fail({
        code: "UNAUTHORIZED",
        correlationId,
        status: 401,
      }),
    };
  }
  const merchantId = merchantIdFromSession(session);
  const userId = userIdOf(session);
  if (!merchantId || !userId) {
    return {
      ok: false,
      result: fail({
        code: "UNAUTHORIZED",
        correlationId,
        status: 401,
        messageFa: "نشست فروشنده ناقص است. دوباره وارد شوید.",
      }),
    };
  }
  const roles = rolesOf(session);
  const tokenVersion =
    session?.tokenVersion ?? session?.user?.tokenVersion ?? null;
  const storeId = session?.storeId ?? session?.user?.storeId ?? null;
  const actor: AuthenticatedMerchant = {
    userId,
    merchantId,
    roles: roles.length > 0 ? roles : ["merchant_owner"],
    storeId: typeof storeId === "string" ? storeId : null,
    tokenVersion: typeof tokenVersion === "number" ? tokenVersion : null,
  };
  const auth = authContextFromJwtClaims({
    sub: actor.userId,
    merchantId: actor.merchantId,
    roles: actor.roles,
    tokenVersion: actor.tokenVersion ?? 0,
    ...(actor.storeId ? { storeIds: [actor.storeId] } : {}),
  });
  return { ok: true, actor, auth };
}

/**
 * Authenticate merchant session, resolve tenant from JWT/session (never body alone),
 * then requirePermission — deny by default (ADR-113).
 * Prefer `requireMerchantPermissionResolved` when AUTH-06 claim upgrade may be pending.
 */
export function requireMerchantPermission(
  session: AuthSessionSnapshot,
  correlationId: string,
  input: {
    permission: Permission;
    bodyMerchantId?: string | null | undefined;
    resourceStoreId?: string | null | undefined;
    auditedCrossTenantAction?: boolean;
  },
):
  | { ok: true; actor: AuthenticatedMerchant; auth: IdentityAuthContext }
  | { ok: false; result: HttpHandlerResult } {
  const authed = requireMerchantAuth(session, correlationId);
  if (!authed.ok) return authed;

  const tenant = resolveTenantMerchantId({
    sessionMerchantId: authed.actor.merchantId,
    bodyMerchantId: input.bodyMerchantId,
    correlationId,
  });
  if (!tenant.ok) return tenant;

  try {
    requirePermission(authed.auth, input.permission, {
      resourceMerchantId: tenant.merchantId,
      ...(input.resourceStoreId !== undefined
        ? { resourceStoreId: input.resourceStoreId }
        : {}),
      ...(input.auditedCrossTenantAction !== undefined
        ? { auditedCrossTenantAction: input.auditedCrossTenantAction }
        : {}),
    });
  } catch (error) {
    return { ok: false, result: authzFail(correlationId, error) };
  }

  return authed;
}

/** ADR-121 — same as requireMerchantPermission after owner→merchant claim hydrate. */
export async function requireMerchantPermissionResolved(
  session: AuthSessionSnapshot,
  correlationId: string,
  merchants: MerchantRepository,
  input: {
    permission: Permission;
    bodyMerchantId?: string | null | undefined;
    resourceStoreId?: string | null | undefined;
    auditedCrossTenantAction?: boolean;
  },
): Promise<
  | { ok: true; actor: AuthenticatedMerchant; auth: IdentityAuthContext }
  | { ok: false; result: HttpHandlerResult }
> {
  const hydrated = await hydrateMerchantSessionClaims(session, merchants);
  return requireMerchantPermission(hydrated, correlationId, input);
}

/**
 * Merchant permission gate + active merchant tenant check (ADR-106).
 * Suspended / draft merchants are denied on the next authZ check.
 */
export async function requireActiveMerchantPermission(
  session: AuthSessionSnapshot,
  correlationId: string,
  merchants: MerchantRepository,
  input: {
    permission: Permission;
    bodyMerchantId?: string | null | undefined;
    resourceStoreId?: string | null | undefined;
    auditedCrossTenantAction?: boolean;
  },
):
  Promise<
    | { ok: true; actor: AuthenticatedMerchant; auth: IdentityAuthContext }
    | { ok: false; result: HttpHandlerResult }
  > {
  const hydrated = await hydrateMerchantSessionClaims(session, merchants);
  const authed = requireMerchantPermission(hydrated, correlationId, input);
  if (!authed.ok) return authed;

  const merchant = await merchants.findById(authed.actor.merchantId);
  if (!merchant || merchant.status !== "active") {
    return {
      ok: false,
      result: fail({
        code: "FORBIDDEN",
        correlationId,
        status: 403,
        messageFa:
          merchant?.status === "suspended"
            ? "حساب فروشنده تعلیق شده است. با پشتیبانی کاسبینو تماس بگیرید."
            : "حساب فروشنده فعال نیست. دسترسی مجاز نیست.",
      }),
    };
  }
  return authed;
}

export function requireCustomerAuth(
  session: AuthSessionSnapshot,
  correlationId: string,
):
  | { ok: true; actor: AuthenticatedCustomer }
  | { ok: false; result: HttpHandlerResult } {
  if (!isCustomerSession(session)) {
    return {
      ok: false,
      result: fail({
        code: "UNAUTHORIZED",
        correlationId,
        status: 401,
      }),
    };
  }
  const userId = userIdOf(session);
  if (!userId) {
    return {
      ok: false,
      result: fail({
        code: "UNAUTHORIZED",
        correlationId,
        status: 401,
      }),
    };
  }
  const storeId = session?.storeId ?? session?.user?.storeId ?? null;
  return {
    ok: true,
    actor: {
      userId,
      storeId: typeof storeId === "string" ? storeId : null,
      roles: rolesOf(session),
    },
  };
}

export function requirePlatformAdmin(
  session: AuthSessionSnapshot,
  correlationId: string,
):
  | { ok: true; actor: AuthenticatedAdmin; auth: IdentityAuthContext }
  | { ok: false; result: HttpHandlerResult } {
  const userId = userIdOf(session);
  const roles = rolesOf(session);
  if (!userId) {
    return {
      ok: false,
      result: fail({
        code: "UNAUTHORIZED",
        correlationId,
        status: 401,
      }),
    };
  }
  if (!roles.includes("platform_admin")) {
    return {
      ok: false,
      result: fail({
        code: "FORBIDDEN",
        correlationId,
        status: 403,
      }),
    };
  }
  const tokenVersion =
    session?.tokenVersion ?? session?.user?.tokenVersion ?? null;
  const actor: AuthenticatedAdmin = {
    userId,
    roles,
    tokenVersion: typeof tokenVersion === "number" ? tokenVersion : null,
  };
  const auth = authContextFromJwtClaims({
    sub: actor.userId,
    merchantId: null,
    roles: actor.roles,
    tokenVersion: actor.tokenVersion ?? 0,
  });
  return { ok: true, actor, auth };
}

/**
 * Platform admin gate + requirePermission(admin.platform) (ADR-113).
 */
export function requireAdminPermission(
  session: AuthSessionSnapshot,
  correlationId: string,
  options?: {
    resourceMerchantId?: string | null;
  },
):
  | { ok: true; actor: AuthenticatedAdmin; auth: IdentityAuthContext }
  | { ok: false; result: HttpHandlerResult } {
  const admin = requirePlatformAdmin(session, correlationId);
  if (!admin.ok) return admin;

  try {
    requirePermission(admin.auth, "admin.platform", {
      ...(options?.resourceMerchantId !== undefined
        ? { resourceMerchantId: options.resourceMerchantId }
        : {}),
      auditedCrossTenantAction: true,
    });
  } catch (error) {
    return { ok: false, result: authzFail(correlationId, error) };
  }

  return admin;
}

/**
 * Prefer session merchantId; reject body merchantId mismatch.
 */
export function resolveTenantMerchantId(input: {
  sessionMerchantId: string;
  bodyMerchantId?: string | null | undefined;
  correlationId: string;
}): { ok: true; merchantId: string } | { ok: false; result: HttpHandlerResult } {
  const body = input.bodyMerchantId?.trim();
  if (body && body !== input.sessionMerchantId) {
    return {
      ok: false,
      result: fail({
        code: "FORBIDDEN",
        correlationId: input.correlationId,
        status: 403,
        messageFa: "شناسه کسب‌وکار با نشست شما هم‌خوانی ندارد.",
      }),
    };
  }
  return { ok: true, merchantId: input.sessionMerchantId };
}

