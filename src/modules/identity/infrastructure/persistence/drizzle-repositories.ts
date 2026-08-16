import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray as drizzleInArray, isNull, or } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import {
  authUsers,
  merchantOtpChallenges,
  rolePermissions,
  roles,
  staffMemberships,
  staffRoles,
  staffStoreScopes,
} from "../../../../infrastructure/database/schema/identity.js";
import { notDeleted } from "../../../../infrastructure/persistence/helpers.js";
import type { AuthUser } from "../../domain/auth-user.js";
import type { OtpChallenge } from "../../domain/otp-challenge.js";
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
  StaffStatus,
} from "../../domain/staff.js";
import type { CanonicalRole, Permission } from "../../../../rbac/index.js";

type AuthUserRow = typeof authUsers.$inferSelect;
type OtpRow = typeof merchantOtpChallenges.$inferSelect;

function toAuthUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    phoneNational: row.phoneNational,
    phoneE164: row.phoneE164,
    tokenVersion: row.tokenVersion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toOtpChallenge(row: OtpRow): OtpChallenge {
  return {
    id: row.id,
    phoneNational: row.phoneNational,
    phoneE164: row.phoneE164,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt,
    maxAttempts: row.maxAttempts,
    attempts: row.attempts,
    consumedAt: row.consumedAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleAuthUserRepository implements AuthUserRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findByPhoneE164(phoneE164: string): Promise<AuthUser | null> {
    const rows = await this.db
      .select()
      .from(authUsers)
      .where(
        and(
          eq(authUsers.phoneE164, phoneE164),
          notDeleted(authUsers.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toAuthUser(rows[0]) : null;
  }

  async save(user: AuthUser): Promise<void> {
    await this.db.insert(authUsers).values({
      id: user.id,
      phoneNational: user.phoneNational,
      phoneE164: user.phoneE164,
      tokenVersion: user.tokenVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: null,
    });
  }
}

export class DrizzleOtpChallengeRepository implements OtpChallengeRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(challenge: OtpChallenge): Promise<void> {
    await this.db.insert(merchantOtpChallenges).values({
      id: challenge.id,
      phoneNational: challenge.phoneNational,
      phoneE164: challenge.phoneE164,
      codeHash: challenge.codeHash,
      expiresAt: challenge.expiresAt,
      maxAttempts: challenge.maxAttempts,
      attempts: challenge.attempts,
      consumedAt: challenge.consumedAt,
      createdAt: challenge.createdAt,
    });
  }

  async findLatestUnconsumedByPhoneE164(
    phoneE164: string,
  ): Promise<OtpChallenge | null> {
    const rows = await this.db
      .select()
      .from(merchantOtpChallenges)
      .where(
        and(
          eq(merchantOtpChallenges.phoneE164, phoneE164),
          isNull(merchantOtpChallenges.consumedAt),
        ),
      )
      .orderBy(desc(merchantOtpChallenges.createdAt))
      .limit(1);
    return rows[0] ? toOtpChallenge(rows[0]) : null;
  }

  async update(challenge: OtpChallenge): Promise<void> {
    await this.db
      .update(merchantOtpChallenges)
      .set({
        attempts: challenge.attempts,
        consumedAt: challenge.consumedAt,
      })
      .where(eq(merchantOtpChallenges.id, challenge.id));
  }
}

type RoleRow = typeof roles.$inferSelect;

function toRole(row: RoleRow): Role {
  return {
    id: row.id,
    merchantId: row.merchantId,
    name: row.name,
    code: row.code,
    description: row.description,
    isSystem: row.isSystem,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export class DrizzleRoleRepository implements RoleRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(role: Role, perms: Permission[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(roles).values({
        id: role.id,
        merchantId: role.merchantId,
        name: role.name,
        code: role.code,
        description: role.description,
        isSystem: role.isSystem,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        deletedAt: role.deletedAt,
      });

      if (perms.length > 0) {
        await tx.insert(rolePermissions).values(
          perms.map((p) => ({
            id: randomUUID(),
            roleId: role.id,
            permission: p,
            createdAt: role.createdAt,
          })),
        );
      }
    });
  }

  async update(role: Role, perms: Permission[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(roles)
        .set({
          name: role.name,
          description: role.description,
          updatedAt: role.updatedAt,
          deletedAt: role.deletedAt,
        })
        .where(eq(roles.id, role.id));

      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

      if (perms.length > 0) {
        await tx.insert(rolePermissions).values(
          perms.map((p) => ({
            id: randomUUID(),
            roleId: role.id,
            permission: p,
            createdAt: role.updatedAt,
          })),
        );
      }
    });
  }

  async delete(roleId: string, merchantId: string): Promise<void> {
    await this.db
      .update(roles)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(roles.id, roleId),
          eq(roles.merchantId, merchantId),
          eq(roles.isSystem, false),
        ),
      );
  }

  async findById(id: string): Promise<RoleWithPermissions | null> {
    const rows = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), notDeleted(roles.deletedAt)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      const sysRows = await this.db
        .select()
        .from(roles)
        .where(and(eq(roles.code, id), notDeleted(roles.deletedAt)))
        .limit(1);
      if (!sysRows[0]) return null;
      return this.enrichRoleWithPermissions(sysRows[0]);
    }
    return this.enrichRoleWithPermissions(row);
  }

  private async enrichRoleWithPermissions(row: RoleRow): Promise<RoleWithPermissions> {
    const permRows = await this.db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, row.id));

    return {
      role: toRole(row),
      permissions: permRows.map((p) => p.permission as Permission),
    };
  }

  async findByMerchantId(merchantId: string): Promise<RoleWithPermissions[]> {
    const roleRows = await this.db
      .select()
      .from(roles)
      .where(
        and(
          or(eq(roles.merchantId, merchantId), eq(roles.isSystem, true)),
          notDeleted(roles.deletedAt),
        ),
      );

    if (roleRows.length === 0) return [];

    const roleIds = roleRows.map((r) => r.id);
    const permRows = await this.db
      .select()
      .from(rolePermissions)
      .where(drizzleInArray(rolePermissions.roleId, roleIds));

    return roleRows.map((r) => ({
      role: toRole(r),
      permissions: permRows
        .filter((p) => p.roleId === r.id)
        .map((p) => p.permission as Permission),
    }));
  }

  async findAllSystemRoles(): Promise<RoleWithPermissions[]> {
    const roleRows = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.isSystem, true), notDeleted(roles.deletedAt)));

    if (roleRows.length === 0) return [];

    const roleIds = roleRows.map((r) => r.id);
    const permRows = await this.db
      .select()
      .from(rolePermissions)
      .where(drizzleInArray(rolePermissions.roleId, roleIds));

    return roleRows.map((r) => ({
      role: toRole(r),
      permissions: permRows
        .filter((p) => p.roleId === r.id)
        .map((p) => p.permission as Permission),
    }));
  }

  async findRolesWithPermissions(roleIds: string[]): Promise<RoleWithPermissions[]> {
    if (roleIds.length === 0) return [];
    const roleRows = await this.db
      .select()
      .from(roles)
      .where(
        and(
          or(
            drizzleInArray(roles.id, roleIds),
            drizzleInArray(roles.code, roleIds),
          ),
          notDeleted(roles.deletedAt),
        ),
      );

    if (roleRows.length === 0) return [];

    const ids = roleRows.map((r) => r.id);
    const permRows = await this.db
      .select()
      .from(rolePermissions)
      .where(drizzleInArray(rolePermissions.roleId, ids));

    return roleRows.map((r) => ({
      role: toRole(r),
      permissions: permRows
        .filter((p) => p.roleId === r.id)
        .map((p) => p.permission as Permission),
    }));
  }
}

type StaffMembershipRow = typeof staffMemberships.$inferSelect;
type StaffStoreScopeRow = typeof staffStoreScopes.$inferSelect;

function toStaffMembership(row: StaffMembershipRow): StaffMembership {
  return {
    id: row.id,
    merchantId: row.merchantId,
    authUserId: row.authUserId,
    role: row.role as CanonicalRole,
    status: row.status as StaffStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function toStaffStoreScope(row: StaffStoreScopeRow): StaffStoreScope {
  return {
    staffMembershipId: row.staffMembershipId,
    storeId: row.storeId,
    createdAt: row.createdAt,
  };
}

export class DrizzleStaffMembershipRepository implements StaffMembershipRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(
    membership: StaffMembership,
    storeScopes: StaffStoreScope[],
    roleIds: string[] = [],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(staffMemberships).values({
        id: membership.id,
        merchantId: membership.merchantId,
        authUserId: membership.authUserId,
        role: membership.role,
        status: membership.status,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
        deletedAt: membership.deletedAt,
      });

      if (storeScopes.length > 0) {
        await tx.insert(staffStoreScopes).values(
          storeScopes.map((scope) => ({
            staffMembershipId: scope.staffMembershipId,
            storeId: scope.storeId,
            createdAt: scope.createdAt,
          })),
        );
      }

      const assignedRoleIds = roleIds.length > 0 ? roleIds : (membership.role ? [membership.role] : []);
      if (assignedRoleIds.length > 0) {
        await tx.insert(staffRoles).values(
          assignedRoleIds.map((rId) => ({
            staffMembershipId: membership.id,
            roleId: rId,
            createdAt: membership.createdAt,
          })),
        );
      }
    });
  }

  async update(
    membership: StaffMembership,
    storeScopes: StaffStoreScope[],
    roleIds?: string[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(staffMemberships)
        .set({
          role: membership.role,
          status: membership.status,
          updatedAt: membership.updatedAt,
          deletedAt: membership.deletedAt,
        })
        .where(eq(staffMemberships.id, membership.id));

      await tx.delete(staffStoreScopes).where(eq(staffStoreScopes.staffMembershipId, membership.id));

      if (storeScopes.length > 0) {
        await tx.insert(staffStoreScopes).values(
          storeScopes.map((scope) => ({
            staffMembershipId: scope.staffMembershipId,
            storeId: scope.storeId,
            createdAt: scope.createdAt,
          })),
        );
      }

      if (roleIds !== undefined) {
        await tx.delete(staffRoles).where(eq(staffRoles.staffMembershipId, membership.id));
        const assignedRoleIds = roleIds.length > 0 ? roleIds : (membership.role ? [membership.role] : []);
        if (assignedRoleIds.length > 0) {
          await tx.insert(staffRoles).values(
            assignedRoleIds.map((rId) => ({
              staffMembershipId: membership.id,
              roleId: rId,
              createdAt: membership.updatedAt,
            })),
          );
        }
      }
    });
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
    const rows = await this.db
      .select()
      .from(staffMemberships)
      .where(
        and(
          eq(staffMemberships.merchantId, merchantId),
          notDeleted(staffMemberships.deletedAt),
        ),
      );

    if (rows.length === 0) return [];

    const membershipIds = rows.map((r) => r.id);
    const scopes = await this.db
      .select()
      .from(staffStoreScopes)
      .where(drizzleInArray(staffStoreScopes.staffMembershipId, membershipIds));

    const roleRows = await this.db
      .select()
      .from(staffRoles)
      .where(drizzleInArray(staffRoles.staffMembershipId, membershipIds));

    return rows.map((r) => {
      const assignedRoleIds = roleRows
        .filter((sr) => sr.staffMembershipId === r.id)
        .map((sr) => sr.roleId);
      return {
        membership: toStaffMembership(r),
        roleIds: assignedRoleIds.length > 0 ? assignedRoleIds : [r.role],
        storeScopes: scopes.filter((s) => s.staffMembershipId === r.id).map(toStaffStoreScope),
      };
    });
  }

  async findById(
    id: string,
  ): Promise<{
    membership: StaffMembership;
    roleIds: string[];
    storeScopes: StaffStoreScope[];
  } | null> {
    const rows = await this.db
      .select()
      .from(staffMemberships)
      .where(
        and(
          eq(staffMemberships.id, id),
          notDeleted(staffMemberships.deletedAt),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const scopes = await this.db
      .select()
      .from(staffStoreScopes)
      .where(eq(staffStoreScopes.staffMembershipId, id));

    const roleRows = await this.db
      .select()
      .from(staffRoles)
      .where(eq(staffRoles.staffMembershipId, id));

    const assignedRoleIds = roleRows.map((sr) => sr.roleId);

    return {
      membership: toStaffMembership(row),
      roleIds: assignedRoleIds.length > 0 ? assignedRoleIds : [row.role],
      storeScopes: scopes.map(toStaffStoreScope),
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
    const rows = await this.db
      .select()
      .from(staffMemberships)
      .where(
        and(
          eq(staffMemberships.authUserId, authUserId),
          notDeleted(staffMemberships.deletedAt),
        ),
      );

    if (rows.length === 0) return [];

    const membershipIds = rows.map((r) => r.id);
    const scopes = await this.db
      .select()
      .from(staffStoreScopes)
      .where(drizzleInArray(staffStoreScopes.staffMembershipId, membershipIds));

    const roleRows = await this.db
      .select()
      .from(staffRoles)
      .where(drizzleInArray(staffRoles.staffMembershipId, membershipIds));

    return rows.map((r) => {
      const assignedRoleIds = roleRows
        .filter((sr) => sr.staffMembershipId === r.id)
        .map((sr) => sr.roleId);
      return {
        membership: toStaffMembership(r),
        roleIds: assignedRoleIds.length > 0 ? assignedRoleIds : [r.role],
        storeScopes: scopes.filter((s) => s.staffMembershipId === r.id).map(toStaffStoreScope),
      };
    });
  }
}

