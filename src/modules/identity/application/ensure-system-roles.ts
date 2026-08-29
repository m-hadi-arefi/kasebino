/**
 * ADR-156 — Idempotent seed of canonical system roles for staff UI listing.
 * Owner AuthZ remains ROLE_PERMISSION_MATRIX-backed; this only fills `roles` /
 * `role_permissions` for list/display and custom-role workflows.
 */

import { randomUUID } from "node:crypto";

import {
  CANONICAL_ROLES,
  ROLE_PERMISSION_MATRIX,
  type CanonicalRole,
  type Permission,
} from "../../../infrastructure/security/rbac/index.js";
import type { RoleRepository } from "../domain/repositories.js";
import type { Role } from "../domain/staff.js";

export const SYSTEM_ROLE_LABELS: Record<
  CanonicalRole,
  { name: string; description: string }
> = {
  merchant_owner: {
    name: "صاحب کسب‌وکار",
    description: "دسترسی کامل مدیریتی، مالی و تنظیمات فروشگاه",
  },
  store_manager: {
    name: "مدیر فروشگاه",
    description: "مدیریت عملیات، پرسنل، انبار و امور مالی فروشگاه",
  },
  store_employee: {
    name: "صندوقدار / کارمند",
    description: "دسترسی به صندوق فروش، مشتریان و انبار",
  },
  customer: {
    name: "مشتری",
    description: "دسترسی سطح مشتری فروشگاه",
  },
  platform_admin: {
    name: "مدیر کل پلتفرم",
    description: "دسترسی ارشد به کل سامانه کاسبینو",
  },
};

/** Deterministic UUIDs so PG re-seeds stay stable across boots. */
export const SYSTEM_ROLE_IDS: Record<CanonicalRole, string> = {
  merchant_owner: "a0000000-0000-4000-8000-000000000001",
  store_manager: "a0000000-0000-4000-8000-000000000002",
  store_employee: "a0000000-0000-4000-8000-000000000003",
  customer: "a0000000-0000-4000-8000-000000000004",
  platform_admin: "a0000000-0000-4000-8000-000000000005",
};

export async function ensureSystemRoles(
  roles: RoleRepository,
  options?: { now?: () => Date; idFactory?: () => string },
): Promise<void> {
  const now = options?.now ?? (() => new Date());
  const idFactory = options?.idFactory ?? (() => randomUUID());
  const at = now();

  for (const code of CANONICAL_ROLES) {
    const existing = await roles.findById(code);
    if (existing?.role.isSystem) {
      continue;
    }
    const meta = SYSTEM_ROLE_LABELS[code];
    const permissions: Permission[] = [...ROLE_PERMISSION_MATRIX[code]];
    const role: Role = {
      id: SYSTEM_ROLE_IDS[code] ?? idFactory(),
      merchantId: null,
      name: meta.name,
      code,
      description: meta.description,
      isSystem: true,
      createdAt: at,
      updatedAt: at,
      deletedAt: null,
    };
    try {
      await roles.save(role, permissions);
    } catch {
      // Concurrent seed or unique race — re-check by code.
      const again = await roles.findById(code);
      if (!again?.role.isSystem) {
        throw new Error(`Failed to seed system role: ${code}`);
      }
    }
  }
}

let ensureOnce: Promise<void> | null = null;

/** Process-wide once (resets on failure so next call can retry). */
export function ensureSystemRolesOnce(roles: RoleRepository): Promise<void> {
  if (!ensureOnce) {
    ensureOnce = ensureSystemRoles(roles).catch((err) => {
      ensureOnce = null;
      throw err;
    });
  }
  return ensureOnce;
}

/** Test helper — clear the once-guard between suites. */
export function resetEnsureSystemRolesOnceForTests(): void {
  ensureOnce = null;
}
