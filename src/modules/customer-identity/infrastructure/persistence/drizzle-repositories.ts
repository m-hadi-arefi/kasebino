/**
 * Drizzle customer-identity repositories (ADR-093 / ADR-032).
 */

import { and, desc, eq, isNull } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import {
  customerIdentities,
  customerOtpChallenges,
} from "../../../../infrastructure/database/schema/identity.js";
import { notDeleted } from "../../../../infrastructure/persistence/helpers.js";
import type { CustomerIdentity } from "../../domain/customer-identity.js";
import type { CustomerOtpChallenge } from "../../domain/otp-challenge.js";
import type {
  CustomerIdentityRepository,
  CustomerOtpChallengeRepository,
} from "../../domain/repositories.js";

type IdentityRow = typeof customerIdentities.$inferSelect;
type OtpRow = typeof customerOtpChallenges.$inferSelect;

function toIdentity(row: IdentityRow): CustomerIdentity {
  return {
    id: row.id,
    phoneNational: row.phoneNational,
    phoneE164: row.phoneE164,
    role: "customer",
    tokenVersion: row.tokenVersion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toOtp(row: OtpRow): CustomerOtpChallenge {
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
    audience: "customer",
  };
}

export class DrizzleCustomerIdentityRepository
  implements CustomerIdentityRepository
{
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: string): Promise<CustomerIdentity | null> {
    const rows = await this.db
      .select()
      .from(customerIdentities)
      .where(
        and(eq(customerIdentities.id, id), notDeleted(customerIdentities.deletedAt)),
      )
      .limit(1);
    return rows[0] ? toIdentity(rows[0]) : null;
  }

  async findByPhoneE164(
    phoneE164: string,
  ): Promise<CustomerIdentity | null> {
    const rows = await this.db
      .select()
      .from(customerIdentities)
      .where(
        and(
          eq(customerIdentities.phoneE164, phoneE164),
          notDeleted(customerIdentities.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toIdentity(rows[0]) : null;
  }

  async save(identity: CustomerIdentity): Promise<void> {
    await this.db.insert(customerIdentities).values({
      id: identity.id,
      phoneNational: identity.phoneNational,
      phoneE164: identity.phoneE164,
      role: "customer",
      tokenVersion: identity.tokenVersion,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
      deletedAt: null,
    });
  }
}

export class DrizzleCustomerOtpChallengeRepository
  implements CustomerOtpChallengeRepository
{
  constructor(private readonly db: DrizzleDb) {}

  async save(challenge: CustomerOtpChallenge): Promise<void> {
    await this.db.insert(customerOtpChallenges).values({
      id: challenge.id,
      phoneNational: challenge.phoneNational,
      phoneE164: challenge.phoneE164,
      codeHash: challenge.codeHash,
      expiresAt: challenge.expiresAt,
      maxAttempts: challenge.maxAttempts,
      attempts: challenge.attempts,
      consumedAt: challenge.consumedAt,
      audience: "customer",
      createdAt: challenge.createdAt,
    });
  }

  async findLatestUnconsumedByPhoneE164(
    phoneE164: string,
  ): Promise<CustomerOtpChallenge | null> {
    const rows = await this.db
      .select()
      .from(customerOtpChallenges)
      .where(
        and(
          eq(customerOtpChallenges.phoneE164, phoneE164),
          isNull(customerOtpChallenges.consumedAt),
        ),
      )
      .orderBy(desc(customerOtpChallenges.createdAt))
      .limit(1);
    return rows[0] ? toOtp(rows[0]) : null;
  }

  async update(challenge: CustomerOtpChallenge): Promise<void> {
    await this.db
      .update(customerOtpChallenges)
      .set({
        attempts: challenge.attempts,
        consumedAt: challenge.consumedAt,
      })
      .where(eq(customerOtpChallenges.id, challenge.id));
  }
}
