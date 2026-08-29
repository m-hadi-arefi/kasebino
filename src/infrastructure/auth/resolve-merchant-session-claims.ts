/**
 * ADR-156 — Shared merchant session claim resolution (OTP sign-in + JWT refresh).
 * Owners use ROLE_PERMISSION_MATRIX; staff use membership roles + resolveEffectivePermissions.
 */

import type { Permission } from "../security/rbac/index.js";
import { ROLE_PERMISSION_MATRIX } from "../security/rbac/index.js";

export type MerchantSessionClaims = {
  merchantId: string | null;
  roles: string[];
  permissions: string[];
  storeIds: string[];
};

export type AdminUserLookup = {
  findById: (id: string) => Promise<{
    id: string;
    login: string;
    displayName: string;
    status: string;
    role: string;
  } | null>;
  findByLogin: (login: string) => Promise<{
    id: string;
    login: string;
    displayName: string;
    status: string;
    role: string;
  } | null>;
  save: (user: {
    id: string;
    login: string;
    displayName: string;
    status: "active";
    role: "platform_admin";
    createdAt: Date;
    updatedAt: Date;
  }) => Promise<void>;
};

export type ResolveMerchantSessionClaimsDeps = {
  merchants: {
    findByOwnerUserId: (authUserId: string) => Promise<{ id: string } | null>;
  };
  adminUsers?: AdminUserLookup;
  staffMemberships?: {
    findByAuthUserId: (authUserId: string) => Promise<
      Array<{
        membership: {
          merchantId: string;
          status: string;
          role: string;
        };
        roleIds: string[];
        storeScopes: Array<{ storeId: string }>;
      }>
    >;
  };
  resolveEffectivePermissions: (
    roleIds: readonly string[],
  ) => Promise<Iterable<Permission>>;
  /** OTP-time only — used to match platform admin by phone login. */
  adminLookupPhones?: {
    national?: string;
    e164?: string;
  };
};

const EMPTY_CLAIMS: MerchantSessionClaims = {
  merchantId: null,
  roles: [],
  permissions: [],
  storeIds: [],
};

/**
 * Resolve effective merchant (or platform admin) claims for an auth user id.
 * Pre-merchant OTP returns empty roles so onboarding stays allowed.
 */
export async function resolveMerchantSessionClaims(
  authUserId: string,
  deps: ResolveMerchantSessionClaimsDeps,
): Promise<MerchantSessionClaims> {
  if (deps.adminUsers) {
    const phones = deps.adminLookupPhones;
    const admin =
      (await deps.adminUsers.findById(authUserId)) ??
      (phones?.national
        ? await deps.adminUsers.findByLogin(phones.national)
        : null) ??
      (phones?.e164 ? await deps.adminUsers.findByLogin(phones.e164) : null);

    if (admin && admin.status === "active") {
      if (admin.id !== authUserId) {
        const existingForSub = await deps.adminUsers.findById(authUserId);
        if (!existingForSub) {
          await deps.adminUsers.save({
            id: authUserId,
            login: `${admin.login}_${authUserId.slice(0, 8)}`,
            displayName: admin.displayName,
            status: "active",
            role: "platform_admin",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      return {
        merchantId: null,
        roles: ["platform_admin"],
        permissions: [...ROLE_PERMISSION_MATRIX.platform_admin],
        storeIds: [],
      };
    }
  }

  const merchant = await deps.merchants.findByOwnerUserId(authUserId);
  if (merchant) {
    return {
      merchantId: merchant.id,
      roles: ["merchant_owner"],
      permissions: [...ROLE_PERMISSION_MATRIX.merchant_owner],
      storeIds: [],
    };
  }

  if (deps.staffMemberships) {
    const staffMemberships =
      await deps.staffMemberships.findByAuthUserId(authUserId);
    if (staffMemberships.length > 0) {
      const active =
        staffMemberships.find((m) => m.membership.status === "active") ??
        staffMemberships[0];
      if (active && active.membership.status === "active") {
        const roleIds =
          active.roleIds && active.roleIds.length > 0
            ? active.roleIds
            : [active.membership.role];
        const effectivePermissions =
          await deps.resolveEffectivePermissions(roleIds);

        return {
          merchantId: active.membership.merchantId,
          roles: roleIds,
          permissions: Array.from(effectivePermissions),
          storeIds: active.storeScopes.map((s) => s.storeId),
        };
      }
    }
  }

  return { ...EMPTY_CLAIMS };
}

/**
 * Incomplete merchant JWT: empty roles (pre-onboarding), or non-admin without merchantId.
 * platform_admin may keep null merchantId with non-empty roles.
 */
export function merchantClaimsNeedRefresh(token: {
  merchantId?: unknown;
  roles?: unknown;
}): boolean {
  const roles = Array.isArray(token.roles)
    ? token.roles.filter((r): r is string => typeof r === "string")
    : [];
  if (roles.length === 0) {
    return true;
  }
  if (roles.includes("platform_admin")) {
    return false;
  }
  const merchantId =
    typeof token.merchantId === "string" ? token.merchantId.trim() : "";
  return merchantId.length === 0;
}
