/**
 * In-memory + Drizzle sync record repositories (ADR-141).
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { erpnextSyncRecords } from "../../../../infrastructure/database/schema/integrations.js";
import type * as schema from "../../../../infrastructure/database/schema/index.js";
import type {
  ErpNextSyncRecord,
  ErpNextSyncRecordRepository,
  ErpNextSyncStatus,
} from "../../domain/sync-record.js";

export class InMemoryErpNextSyncRecordRepository
  implements ErpNextSyncRecordRepository
{
  private readonly byKey = new Map<string, ErpNextSyncRecord>();

  private key(merchantId: string, entityType: string, entityId: string) {
    return `${merchantId}:${entityType}:${entityId}`;
  }

  async upsert(record: ErpNextSyncRecord): Promise<void> {
    this.byKey.set(
      this.key(record.merchantId, record.entityType, record.entityId),
      { ...record },
    );
  }

  async findByInternal(input: {
    merchantId: string;
    entityType: string;
    entityId: string;
  }): Promise<ErpNextSyncRecord | null> {
    return (
      this.byKey.get(
        this.key(input.merchantId, input.entityType, input.entityId),
      ) ?? null
    );
  }

  async listByMerchant(input: {
    merchantId: string;
    status?: ErpNextSyncStatus;
    limit?: number;
  }): Promise<ErpNextSyncRecord[]> {
    const limit = input.limit ?? 50;
    return [...this.byKey.values()]
      .filter((r) => r.merchantId === input.merchantId)
      .filter((r) => (input.status ? r.status === input.status : true))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }
}

function toDomain(
  row: typeof erpnextSyncRecords.$inferSelect,
): ErpNextSyncRecord {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    entityType: row.entityType,
    entityId: row.entityId,
    eventId: row.eventId,
    erpnextType: row.erpnextType,
    erpnextId: row.erpnextId,
    status: row.status as ErpNextSyncStatus,
    lastSyncAt: row.lastSyncAt,
    errorMessageFa: row.errorMessageFa,
    attemptCount: row.attemptCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleErpNextSyncRecordRepository
  implements ErpNextSyncRecordRepository
{
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async upsert(record: ErpNextSyncRecord): Promise<void> {
    await this.db
      .insert(erpnextSyncRecords)
      .values({
        id: record.id,
        merchantId: record.merchantId,
        storeId: record.storeId,
        entityType: record.entityType,
        entityId: record.entityId,
        eventId: record.eventId,
        erpnextType: record.erpnextType,
        erpnextId: record.erpnextId,
        status: record.status,
        lastSyncAt: record.lastSyncAt,
        errorMessageFa: record.errorMessageFa,
        attemptCount: record.attemptCount,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })
      .onConflictDoUpdate({
        target: [
          erpnextSyncRecords.merchantId,
          erpnextSyncRecords.entityType,
          erpnextSyncRecords.entityId,
        ],
        set: {
          eventId: record.eventId,
          erpnextType: record.erpnextType,
          erpnextId: record.erpnextId,
          status: record.status,
          lastSyncAt: record.lastSyncAt,
          errorMessageFa: record.errorMessageFa,
          attemptCount: record.attemptCount,
          updatedAt: record.updatedAt,
          storeId: record.storeId,
        },
      });
  }

  async findByInternal(input: {
    merchantId: string;
    entityType: string;
    entityId: string;
  }): Promise<ErpNextSyncRecord | null> {
    const rows = await this.db
      .select()
      .from(erpnextSyncRecords)
      .where(
        and(
          eq(erpnextSyncRecords.merchantId, input.merchantId),
          eq(erpnextSyncRecords.entityType, input.entityType),
          eq(erpnextSyncRecords.entityId, input.entityId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async listByMerchant(input: {
    merchantId: string;
    status?: ErpNextSyncStatus;
    limit?: number;
  }): Promise<ErpNextSyncRecord[]> {
    const limit = input.limit ?? 50;
    const conds = [eq(erpnextSyncRecords.merchantId, input.merchantId)];
    if (input.status) {
      conds.push(eq(erpnextSyncRecords.status, input.status));
    }
    const rows = await this.db
      .select()
      .from(erpnextSyncRecords)
      .where(and(...conds))
      .orderBy(desc(erpnextSyncRecords.updatedAt))
      .limit(limit);
    return rows.map(toDomain);
  }
}
