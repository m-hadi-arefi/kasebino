/**
 * Drizzle StoreMembershipRepository (ADR-093 / ADR-007).
 */

import { and, asc, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import type { DrizzleTransactionScope } from "../../../../infrastructure/persistence/drizzle-transaction-scope.js";
import { storeMemberships } from "../../../../infrastructure/database/schema/memberships.js";
import {
  assertMerchantId,
  assertStoreId,
  notDeleted,
} from "../../../../infrastructure/persistence/helpers.js";
import type {
  MembershipSource,
  MembershipStatus,
} from "../../../../crm-membership/index.js";
import type { ConsentSurface } from "../../../../crm-membership/index.js";
import type { StoreMembershipRepository } from "../../domain/repositories.js";
import type { StoreMembership } from "../../domain/store-membership.js";

type Row = typeof storeMemberships.$inferSelect;

function toMembership(row: Row): StoreMembership {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    customerId: row.customerId,
    phoneNational: row.phoneNational,
    phoneE164: row.phoneE164,
    source: row.source as MembershipSource,
    status: row.status as MembershipStatus,
    consent: {
      surface: row.consentSurface as ConsentSurface,
      version: row.consentVersion,
      consentedAt: row.consentedAt,
    },
    joinedAt: row.joinedAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function toValues(m: StoreMembership) {
  return {
    id: m.id,
    merchantId: m.merchantId,
    storeId: m.storeId,
    customerId: m.customerId,
    phoneNational: m.phoneNational,
    phoneE164: m.phoneE164,
    source: m.source,
    status: m.status,
    consentSurface: m.consent.surface,
    consentVersion: m.consent.version,
    consentedAt: m.consent.consentedAt,
    joinedAt: m.joinedAt,
    createdAt: m.joinedAt,
    updatedAt: m.updatedAt,
    deletedAt: m.deletedAt,
    notes: null as string | null,
  };
}

export class DrizzleStoreMembershipRepository
  implements StoreMembershipRepository
{
  constructor(
    private readonly dbOrScope: DrizzleDb | DrizzleTransactionScope,
  ) {}

  private get db(): DrizzleDb {
    return "executor" in this.dbOrScope
      ? this.dbOrScope.executor
      : this.dbOrScope;
  }

  async save(membership: StoreMembership): Promise<void> {
    await this.db.insert(storeMemberships).values(toValues(membership));
  }

  async update(membership: StoreMembership): Promise<void> {
    await this.db
      .update(storeMemberships)
      .set({
        phoneNational: membership.phoneNational,
        phoneE164: membership.phoneE164,
        source: membership.source,
        status: membership.status,
        consentSurface: membership.consent.surface,
        consentVersion: membership.consent.version,
        consentedAt: membership.consent.consentedAt,
        updatedAt: membership.updatedAt,
        deletedAt: membership.deletedAt,
      })
      .where(eq(storeMemberships.id, membership.id));
  }

  async findById(id: string): Promise<StoreMembership | null> {
    const rows = await this.db
      .select()
      .from(storeMemberships)
      .where(eq(storeMemberships.id, id))
      .limit(1);
    return rows[0] ? toMembership(rows[0]) : null;
  }

  async findByStoreAndPhone(
    storeId: string,
    phoneNational: string,
  ): Promise<StoreMembership | null> {
    assertStoreId(storeId);
    const rows = await this.db
      .select()
      .from(storeMemberships)
      .where(
        and(
          eq(storeMemberships.storeId, storeId),
          eq(storeMemberships.phoneNational, phoneNational),
          notDeleted(storeMemberships.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ? toMembership(rows[0]) : null;
  }

  async listByStoreId(
    storeId: string,
    options?: { merchantId?: string; includeDeleted?: boolean },
  ): Promise<StoreMembership[]> {
    assertStoreId(storeId);
    const includeDeleted = options?.includeDeleted ?? false;
    const conditions = [eq(storeMemberships.storeId, storeId)];
    if (options?.merchantId !== undefined) {
      assertMerchantId(options.merchantId);
      conditions.push(eq(storeMemberships.merchantId, options.merchantId));
    }
    if (!includeDeleted) {
      conditions.push(notDeleted(storeMemberships.deletedAt));
    }
    const rows = await this.db
      .select()
      .from(storeMemberships)
      .where(and(...conditions))
      .orderBy(asc(storeMemberships.joinedAt));
    return rows.map(toMembership);
  }

  async listByMerchantId(
    merchantId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<StoreMembership[]> {
    assertMerchantId(merchantId);
    const includeDeleted = options?.includeDeleted ?? false;
    const conditions = [eq(storeMemberships.merchantId, merchantId)];
    if (!includeDeleted) {
      conditions.push(notDeleted(storeMemberships.deletedAt));
    }
    const rows = await this.db
      .select()
      .from(storeMemberships)
      .where(and(...conditions))
      .orderBy(asc(storeMemberships.joinedAt));
    return rows.map(toMembership);
  }
}
