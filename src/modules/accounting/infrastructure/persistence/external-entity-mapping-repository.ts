/**
 * Drizzle external entity mapping repository (ADR-126).
 */

import { and, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { externalEntityMappings } from "../../../../infrastructure/database/schema/integrations.js";
import type {
  ExternalEntityMapping,
  ExternalEntityMappingRepository,
} from "../../domain/external-entity-mapping.js";
import type { DrizzleTransactionScope } from "../../../../infrastructure/persistence/drizzle-transaction-scope.js";

type Row = typeof externalEntityMappings.$inferSelect;

function toMapping(row: Row): ExternalEntityMapping {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    entityType: row.entityType,
    entityId: row.entityId,
    provider: row.provider,
    externalId: row.externalId,
    externalSecondaryId: row.externalSecondaryId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleExternalEntityMappingRepository
  implements ExternalEntityMappingRepository
{
  constructor(
    private readonly dbOrScope: DrizzleDb | DrizzleTransactionScope,
  ) {}

  private get db(): DrizzleDb {
    return "executor" in this.dbOrScope
      ? this.dbOrScope.executor
      : this.dbOrScope;
  }

  async upsert(mapping: ExternalEntityMapping): Promise<void> {
    const existing = await this.findByInternal({
      merchantId: mapping.merchantId,
      provider: mapping.provider,
      entityType: mapping.entityType,
      entityId: mapping.entityId,
    });
    if (existing) {
      await this.db
        .update(externalEntityMappings)
        .set({
          externalId: mapping.externalId,
          externalSecondaryId: mapping.externalSecondaryId,
          storeId: mapping.storeId,
          updatedAt: mapping.updatedAt,
        })
        .where(eq(externalEntityMappings.id, existing.id));
      return;
    }
    await this.db.insert(externalEntityMappings).values({
      id: mapping.id,
      merchantId: mapping.merchantId,
      storeId: mapping.storeId,
      entityType: mapping.entityType,
      entityId: mapping.entityId,
      provider: mapping.provider,
      externalId: mapping.externalId,
      externalSecondaryId: mapping.externalSecondaryId,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    });
  }

  async findByInternal(input: {
    merchantId: string;
    provider: string;
    entityType: string;
    entityId: string;
  }): Promise<ExternalEntityMapping | null> {
    const rows = await this.db
      .select()
      .from(externalEntityMappings)
      .where(
        and(
          eq(externalEntityMappings.merchantId, input.merchantId),
          eq(externalEntityMappings.provider, input.provider),
          eq(externalEntityMappings.entityType, input.entityType),
          eq(externalEntityMappings.entityId, input.entityId),
        ),
      )
      .limit(1);
    return rows[0] ? toMapping(rows[0]) : null;
  }

  async findByExternal(input: {
    merchantId: string;
    provider: string;
    entityType: string;
    externalId: string;
  }): Promise<ExternalEntityMapping | null> {
    const rows = await this.db
      .select()
      .from(externalEntityMappings)
      .where(
        and(
          eq(externalEntityMappings.merchantId, input.merchantId),
          eq(externalEntityMappings.provider, input.provider),
          eq(externalEntityMappings.entityType, input.entityType),
          eq(externalEntityMappings.externalId, input.externalId),
        ),
      )
      .limit(1);
    return rows[0] ? toMapping(rows[0]) : null;
  }
}

export class InMemoryExternalEntityMappingRepository
  implements ExternalEntityMappingRepository
{
  private readonly rows = new Map<string, ExternalEntityMapping>();

  private key(input: {
    merchantId: string;
    provider: string;
    entityType: string;
    entityId: string;
  }): string {
    return `${input.merchantId}:${input.provider}:${input.entityType}:${input.entityId}`;
  }

  async upsert(mapping: ExternalEntityMapping): Promise<void> {
    this.rows.set(this.key(mapping), { ...mapping });
  }

  async findByInternal(input: {
    merchantId: string;
    provider: string;
    entityType: string;
    entityId: string;
  }): Promise<ExternalEntityMapping | null> {
    return this.rows.get(this.key(input)) ?? null;
  }

  async findByExternal(input: {
    merchantId: string;
    provider: string;
    entityType: string;
    externalId: string;
  }): Promise<ExternalEntityMapping | null> {
    for (const row of this.rows.values()) {
      if (
        row.merchantId === input.merchantId &&
        row.provider === input.provider &&
        row.entityType === input.entityType &&
        row.externalId === input.externalId
      ) {
        return row;
      }
    }
    return null;
  }
}
