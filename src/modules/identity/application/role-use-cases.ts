import { randomUUID } from "node:crypto";
import {
  ROLE_PERMISSION_MATRIX,
  assertAssignablePermissions,
  normalizeRole,
  type Permission,
} from "../../../infrastructure/security/rbac/index.js";
import type { RoleRepository } from "../domain/repositories.js";
import type { Role, RoleWithPermissions } from "../domain/staff.js";
import { ensureSystemRolesOnce } from "./ensure-system-roles.js";

export type RoleUseCaseDeps = {
  roles: RoleRepository;
  now?: () => Date;
  idFactory?: () => string;
};

export type CreateCustomRoleInput = {
  merchantId: string;
  name: string;
  description?: string | null;
  permissions: Permission[];
  actorRoles: readonly string[];
};

export type UpdateCustomRoleInput = {
  merchantId: string;
  roleId: string;
  name: string;
  description?: string | null;
  permissions: Permission[];
  actorRoles: readonly string[];
};

export type DeleteCustomRoleInput = {
  merchantId: string;
  roleId: string;
  actorRoles: readonly string[];
};

export function createRoleUseCases(deps: RoleUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  async function listRoles(merchantId: string): Promise<RoleWithPermissions[]> {
    await ensureSystemRolesOnce(deps.roles);
    return deps.roles.findByMerchantId(merchantId);
  }

  async function getRole(
    merchantId: string,
    roleId: string,
  ): Promise<RoleWithPermissions> {
    await ensureSystemRolesOnce(deps.roles);
    const item = await deps.roles.findById(roleId);
    if (!item) {
      throw new Error("ROLE_NOT_FOUND");
    }
    if (!item.role.isSystem && item.role.merchantId !== merchantId) {
      throw new Error("ROLE_NOT_FOUND");
    }
    return item;
  }

  async function createCustomRole(
    input: CreateCustomRoleInput,
  ): Promise<RoleWithPermissions> {
    if (!input.name || input.name.trim() === "") {
      throw new Error("ROLE_NAME_REQUIRED");
    }

    assertAssignablePermissions(input.actorRoles, input.permissions);

    const at = now();
    const role: Role = {
      id: idFactory(),
      merchantId: input.merchantId,
      name: input.name.trim(),
      code: null,
      description: input.description?.trim() || null,
      isSystem: false,
      createdAt: at,
      updatedAt: at,
      deletedAt: null,
    };

    await deps.roles.save(role, input.permissions);
    return { role, permissions: input.permissions };
  }

  async function updateCustomRole(
    input: UpdateCustomRoleInput,
  ): Promise<RoleWithPermissions> {
    if (!input.name || input.name.trim() === "") {
      throw new Error("ROLE_NAME_REQUIRED");
    }

    const existing = await deps.roles.findById(input.roleId);
    if (!existing || (!existing.role.isSystem && existing.role.merchantId !== input.merchantId)) {
      throw new Error("ROLE_NOT_FOUND");
    }

    if (existing.role.isSystem) {
      throw new Error("CANNOT_MODIFY_SYSTEM_ROLE");
    }

    assertAssignablePermissions(input.actorRoles, input.permissions);

    const at = now();
    const updatedRole: Role = {
      ...existing.role,
      name: input.name.trim(),
      description: input.description !== undefined ? input.description?.trim() || null : existing.role.description,
      updatedAt: at,
    };

    await deps.roles.update(updatedRole, input.permissions);
    return { role: updatedRole, permissions: input.permissions };
  }

  async function deleteCustomRole(
    input: DeleteCustomRoleInput,
  ): Promise<void> {
    const existing = await deps.roles.findById(input.roleId);
    if (!existing || (!existing.role.isSystem && existing.role.merchantId !== input.merchantId)) {
      throw new Error("ROLE_NOT_FOUND");
    }

    if (existing.role.isSystem) {
      throw new Error("CANNOT_DELETE_SYSTEM_ROLE");
    }

    await deps.roles.delete(input.roleId, input.merchantId);
  }

  async function resolveEffectivePermissions(
    roleIdentifiers: readonly string[],
  ): Promise<Set<Permission>> {
    const effective = new Set<Permission>();
    const customRoleIds: string[] = [];

    for (const id of roleIdentifiers) {
      const canonical = normalizeRole(id);
      if (canonical && ROLE_PERMISSION_MATRIX[canonical]) {
        for (const p of ROLE_PERMISSION_MATRIX[canonical]) {
          effective.add(p);
        }
      } else {
        customRoleIds.push(id);
      }
    }

    if (customRoleIds.length > 0) {
      const resolvedRoles = await deps.roles.findRolesWithPermissions(customRoleIds);
      for (const r of resolvedRoles) {
        for (const p of r.permissions) {
          effective.add(p);
        }
      }
    }

    return effective;
  }

  return {
    listRoles,
    getRole,
    createCustomRole,
    updateCustomRole,
    deleteCustomRole,
    resolveEffectivePermissions,
  };
}

export type RoleUseCases = ReturnType<typeof createRoleUseCases>;
