import { beforeEach, describe, expect, it } from "vitest";

import {
  ensureSystemRoles,
  ensureSystemRolesOnce,
  resetEnsureSystemRolesOnceForTests,
  SYSTEM_ROLE_IDS,
} from "./ensure-system-roles.js";
import { InMemoryRoleRepository } from "../infrastructure/persistence/in-memory-repositories.js";
import type { RoleRepository } from "../domain/repositories.js";
import type { Role, RoleWithPermissions } from "../domain/staff.js";
import type { Permission } from "../../../infrastructure/security/rbac/index.js";
import { CANONICAL_ROLES } from "../../../infrastructure/security/rbac/index.js";

class EmptyRoleRepository implements RoleRepository {
  private readonly byId = new Map<string, RoleWithPermissions>();

  async save(role: Role, permissions: Permission[]): Promise<void> {
    this.byId.set(role.id, { role, permissions });
    if (role.code) this.byId.set(role.code, { role, permissions });
  }

  async update(role: Role, permissions: Permission[]): Promise<void> {
    await this.save(role, permissions);
  }

  async delete(): Promise<void> {}

  async findById(id: string): Promise<RoleWithPermissions | null> {
    return this.byId.get(id) ?? null;
  }

  async findByMerchantId(): Promise<RoleWithPermissions[]> {
    return this.findAllSystemRoles();
  }

  async findAllSystemRoles(): Promise<RoleWithPermissions[]> {
    const out: RoleWithPermissions[] = [];
    const seen = new Set<string>();
    for (const item of this.byId.values()) {
      if (item.role.isSystem && !seen.has(item.role.id)) {
        seen.add(item.role.id);
        out.push(item);
      }
    }
    return out;
  }

  async findRolesWithPermissions(): Promise<RoleWithPermissions[]> {
    return [];
  }
}

describe("ensureSystemRoles", () => {
  beforeEach(() => {
    resetEnsureSystemRolesOnceForTests();
  });

  it("seeds all canonical system roles into an empty repository", async () => {
    const repo = new EmptyRoleRepository();
    await ensureSystemRoles(repo);
    const all = await repo.findAllSystemRoles();
    expect(all).toHaveLength(CANONICAL_ROLES.length);
    for (const code of CANONICAL_ROLES) {
      const found = await repo.findById(code);
      expect(found?.role.code).toBe(code);
      expect(found?.role.id).toBe(SYSTEM_ROLE_IDS[code]);
      expect(found?.role.isSystem).toBe(true);
      expect(found?.permissions.length).toBeGreaterThan(0);
    }
  });

  it("is idempotent when roles already exist", async () => {
    const repo = new InMemoryRoleRepository();
    const before = await repo.findAllSystemRoles();
    await ensureSystemRoles(repo);
    const after = await repo.findAllSystemRoles();
    expect(after).toHaveLength(before.length);
  });

  it("ensureSystemRolesOnce only seeds once", async () => {
    const repo = new EmptyRoleRepository();
    await ensureSystemRolesOnce(repo);
    await ensureSystemRolesOnce(repo);
    expect(await repo.findAllSystemRoles()).toHaveLength(CANONICAL_ROLES.length);
  });
});
