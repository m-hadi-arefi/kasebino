import {
  CANONICAL_ROLES,
  ROLE_PERMISSION_MATRIX,
  type CanonicalRole,
  type Permission,
} from "../../../../rbac/index.js";
import type { AuthUser } from "../../domain/auth-user.js";
import {
  isOtpChallengeConsumed,
  type OtpChallenge,
} from "../../domain/otp-challenge.js";
import type {
  AuthUserRepository,
  OtpChallengeRepository,
  RoleRepository,
  StaffMembershipRepository,
} from "../../domain/repositories.js";
import type {
  Role,
  RoleWithPermissions,
  StaffMembership,
  StaffStoreScope,
} from "../../domain/staff.js";

export class InMemoryOtpChallengeRepository implements OtpChallengeRepository {
  private readonly rows: OtpChallenge[] = [];

  async save(challenge: OtpChallenge): Promise<void> {
    this.rows.push(challenge);
  }

  async findLatestUnconsumedByPhoneE164(
    phoneE164: string,
  ): Promise<OtpChallenge | null> {
    const candidates = this.rows
      .filter((c) => c.phoneE164 === phoneE164)
      .filter((c) => !isOtpChallengeConsumed(c))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return candidates[0] ?? null;
  }

  async update(challenge: OtpChallenge): Promise<void> {
    const idx = this.rows.findIndex((c) => c.id === challenge.id);
    if (idx >= 0) {
      this.rows[idx] = challenge;
    }
  }
}

export class InMemoryAuthUserRepository implements AuthUserRepository {
  private readonly byPhone = new Map<string, AuthUser>();

  async findByPhoneE164(phoneE164: string): Promise<AuthUser | null> {
    return this.byPhone.get(phoneE164) ?? null;
  }

  async save(user: AuthUser): Promise<void> {
    this.byPhone.set(user.phoneE164, user);
  }
}

const SYSTEM_ROLE_LABELS: Record<CanonicalRole, { name: string; description: string }> = {
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

export class InMemoryRoleRepository implements RoleRepository {
  private readonly roles = new Map<string, RoleWithPermissions>();

  constructor() {
    this.seedSystemRoles();
  }

  private seedSystemRoles() {
    const epoch = new Date("2025-01-01T00:00:00.000Z");
    for (const code of CANONICAL_ROLES) {
      const meta = SYSTEM_ROLE_LABELS[code];
      const perms = [...ROLE_PERMISSION_MATRIX[code]];
      const role: Role = {
        id: `sys-${code}`,
        merchantId: null,
        name: meta ? meta.name : code,
        code,
        description: meta ? meta.description : null,
        isSystem: true,
        createdAt: epoch,
        updatedAt: epoch,
        deletedAt: null,
      };
      this.roles.set(role.id, { role, permissions: perms });
      this.roles.set(code, { role, permissions: perms });
    }
  }

  async save(role: Role, permissions: Permission[]): Promise<void> {
    this.roles.set(role.id, { role, permissions });
    if (role.code) {
      this.roles.set(role.code, { role, permissions });
    }
  }

  async update(role: Role, permissions: Permission[]): Promise<void> {
    this.roles.set(role.id, { role, permissions });
    if (role.code) {
      this.roles.set(role.code, { role, permissions });
    }
  }

  async delete(roleId: string, merchantId: string): Promise<void> {
    const existing = this.roles.get(roleId);
    if (!existing || existing.role.isSystem || existing.role.merchantId !== merchantId) {
      return;
    }
    const updated: Role = {
      ...existing.role,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };
    this.roles.set(roleId, { role: updated, permissions: existing.permissions });
    if (updated.code) {
      this.roles.set(updated.code, { role: updated, permissions: existing.permissions });
    }
  }

  async findById(id: string): Promise<RoleWithPermissions | null> {
    const item = this.roles.get(id);
    if (!item || item.role.deletedAt) return null;
    return item;
  }

  async findByMerchantId(merchantId: string): Promise<RoleWithPermissions[]> {
    const system = await this.findAllSystemRoles();
    const custom: RoleWithPermissions[] = [];
    const seen = new Set<string>();
    for (const item of this.roles.values()) {
      if (
        !item.role.isSystem &&
        item.role.merchantId === merchantId &&
        !item.role.deletedAt &&
        !seen.has(item.role.id)
      ) {
        seen.add(item.role.id);
        custom.push(item);
      }
    }
    return [...system, ...custom];
  }

  async findAllSystemRoles(): Promise<RoleWithPermissions[]> {
    const out: RoleWithPermissions[] = [];
    const seen = new Set<string>();
    for (const item of this.roles.values()) {
      if (item.role.isSystem && !seen.has(item.role.id)) {
        seen.add(item.role.id);
        out.push(item);
      }
    }
    return out;
  }

  async findRolesWithPermissions(roleIds: string[]): Promise<RoleWithPermissions[]> {
    const out: RoleWithPermissions[] = [];
    const seen = new Set<string>();
    for (const id of roleIds) {
      const item = this.roles.get(id);
      if (item && !item.role.deletedAt && !seen.has(item.role.id)) {
        seen.add(item.role.id);
        out.push(item);
      }
    }
    return out;
  }
}

export class InMemoryStaffMembershipRepository implements StaffMembershipRepository {
  private readonly memberships = new Map<string, StaffMembership>();
  private readonly scopes = new Map<string, StaffStoreScope[]>();
  private readonly roles = new Map<string, string[]>();

  async save(
    membership: StaffMembership,
    storeScopes: StaffStoreScope[],
    roleIds: string[] = [],
  ): Promise<void> {
    this.memberships.set(membership.id, membership);
    this.scopes.set(membership.id, storeScopes);
    const assignedRoles = roleIds.length > 0 ? roleIds : [membership.role];
    this.roles.set(membership.id, assignedRoles);
  }

  async update(
    membership: StaffMembership,
    storeScopes: StaffStoreScope[],
    roleIds?: string[],
  ): Promise<void> {
    this.memberships.set(membership.id, membership);
    this.scopes.set(membership.id, storeScopes);
    if (roleIds !== undefined) {
      const assignedRoles = roleIds.length > 0 ? roleIds : [membership.role];
      this.roles.set(membership.id, assignedRoles);
    }
  }

  async findByMerchantId(
    merchantId: string,
  ): Promise<
    Array<{
      membership: StaffMembership;
      roleIds: string[];
      storeScopes: StaffStoreScope[];
    }>
  > {
    const res: Array<{
      membership: StaffMembership;
      roleIds: string[];
      storeScopes: StaffStoreScope[];
    }> = [];
    for (const m of this.memberships.values()) {
      if (m.merchantId === merchantId && !m.deletedAt) {
        const assignedRoleIds = this.roles.get(m.id) ?? (m.role ? [m.role] : []);
        res.push({
          membership: m,
          roleIds: assignedRoleIds,
          storeScopes: this.scopes.get(m.id) ?? [],
        });
      }
    }
    return res;
  }

  async findById(
    id: string,
  ): Promise<{
    membership: StaffMembership;
    roleIds: string[];
    storeScopes: StaffStoreScope[];
  } | null> {
    const m = this.memberships.get(id);
    if (!m || m.deletedAt) return null;
    const assignedRoleIds = this.roles.get(id) ?? (m.role ? [m.role] : []);
    return {
      membership: m,
      roleIds: assignedRoleIds,
      storeScopes: this.scopes.get(id) ?? [],
    };
  }

  async findByAuthUserId(
    authUserId: string,
  ): Promise<
    Array<{
      membership: StaffMembership;
      roleIds: string[];
      storeScopes: StaffStoreScope[];
    }>
  > {
    const res: Array<{
      membership: StaffMembership;
      roleIds: string[];
      storeScopes: StaffStoreScope[];
    }> = [];
    for (const m of this.memberships.values()) {
      if (m.authUserId === authUserId && !m.deletedAt) {
        const assignedRoleIds = this.roles.get(m.id) ?? (m.role ? [m.role] : []);
        res.push({
          membership: m,
          roleIds: assignedRoleIds,
          storeScopes: this.scopes.get(m.id) ?? [],
        });
      }
    }
    return res;
  }
}

