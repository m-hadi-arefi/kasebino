/**
 * Drizzle identity repositories (ADR-093 / ADR-031).
 */

import { and, desc, eq, inArray as drizzleInArray, isNull } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import {
  authUsers,
  merchantOtpChallenges,
  staffMemberships,
  staffStoreScopes,
} from "../../../../infrastructure/database/schema/identity.js";
import { notDeleted } from "../../../../infrastructure/persistence/helpers.js";
import type { AuthUser } from "../../domain/auth-user.js";
import type { OtpChallenge } from "../../domain/otp-challenge.js";
import type {
  AuthUserRepository,
  OtpChallengeRepository,
  StaffMembershipRepository,
} from "../../domain/repositories.js";
import type { StaffMembership, StaffStoreScope, StaffStatus } from "../../domain/staff.js";
import type { CanonicalRole } from "../../../../rbac/index.js";

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

  async save(membership: StaffMembership, storeScopes: StaffStoreScope[]): Promise<void> {
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
          }))
        );
      }
    });
  }

  async update(membership: StaffMembership, storeScopes: StaffStoreScope[]): Promise<void> {
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
          }))
        );
      }
    });
  }

  async findByMerchantId(merchantId: string): Promise<Array<{ membership: StaffMembership; storeScopes: StaffStoreScope[] }>> {
    const rows = await this.db
      .select()
      .from(staffMemberships)
      .where(
        and(
          eq(staffMemberships.merchantId, merchantId),
          notDeleted(staffMemberships.deletedAt)
        )
      );

    if (rows.length === 0) return [];

    const membershipIds = rows.map((r) => r.id);
    const scopes = await this.db.select().from(staffStoreScopes).where(drizzleInArray(staffStoreScopes.staffMembershipId, membershipIds));

    return rows.map((r) => ({
      membership: toStaffMembership(r),
      storeScopes: scopes.filter((s) => s.staffMembershipId === r.id).map(toStaffStoreScope),
    }));
  }

  async findById(id: string): Promise<{ membership: StaffMembership; storeScopes: StaffStoreScope[] } | null> {
    const rows = await this.db
      .select()
      .from(staffMemberships)
      .where(
        and(
          eq(staffMemberships.id, id),
          notDeleted(staffMemberships.deletedAt)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const scopes = await this.db
      .select()
      .from(staffStoreScopes)
      .where(eq(staffStoreScopes.staffMembershipId, id));

    return {
      membership: toStaffMembership(row),
      storeScopes: scopes.map(toStaffStoreScope),
    };
  }

  async findByAuthUserId(authUserId: string): Promise<Array<{ membership: StaffMembership; storeScopes: StaffStoreScope[] }>> {
    const rows = await this.db
      .select()
      .from(staffMemberships)
      .where(
        and(
          eq(staffMemberships.authUserId, authUserId),
          notDeleted(staffMemberships.deletedAt)
        )
      );

    if (rows.length === 0) return [];

    const membershipIds = rows.map((r) => r.id);
    const scopes = await this.db.select().from(staffStoreScopes).where(drizzleInArray(staffStoreScopes.staffMembershipId, membershipIds));

    return rows.map((r) => ({
      membership: toStaffMembership(r),
      storeScopes: scopes.filter((s) => s.staffMembershipId === r.id).map(toStaffStoreScope),
    }));
  }
}
