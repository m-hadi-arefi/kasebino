/**
 * Drizzle identity repositories (ADR-093 / ADR-031).
 */

import { and, desc, eq, isNull } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import {
  authUsers,
  merchantOtpChallenges,
} from "../../../../infrastructure/database/schema/identity.js";
import { notDeleted } from "../../../../infrastructure/persistence/helpers.js";
import type { AuthUser } from "../../domain/auth-user.js";
import type { OtpChallenge } from "../../domain/otp-challenge.js";
import type {
  AuthUserRepository,
  OtpChallengeRepository,
} from "../../domain/repositories.js";

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
