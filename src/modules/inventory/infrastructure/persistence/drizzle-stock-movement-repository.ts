/**
 * Drizzle + in-memory stock movement repositories (ADR-126).
 */

import { and, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { stockMovements } from "../../../../infrastructure/database/schema/inventory.js";
import type { DrizzleTransactionScope } from "../../../../infrastructure/persistence/drizzle-transaction-scope.js";
import type { StockMovement } from "../../domain/stock-movement.js";
import type { StockMovementRepository } from "../../domain/stock-movement-repository.js";
import type { StockMovementReason } from "../../domain/stock-movement.js";

type Row = typeof stockMovements.$inferSelect;

function toMovement(row: Row): StockMovement {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    productId: row.productId,
    stockItemId: row.stockItemId,
    quantityDelta: row.quantityDelta,
    unitCode: row.unitCode,
    reason: row.reason as StockMovementReason,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    source: row.source,
    note: row.note,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleStockMovementRepository implements StockMovementRepository {
  constructor(
    private readonly dbOrScope: DrizzleDb | DrizzleTransactionScope,
  ) {}

  private get db(): DrizzleDb {
    return "executor" in this.dbOrScope
      ? this.dbOrScope.executor
      : this.dbOrScope;
  }

  async append(movement: StockMovement): Promise<void> {
    await this.db.insert(stockMovements).values({
      id: movement.id,
      merchantId: movement.merchantId,
      storeId: movement.storeId,
      productId: movement.productId,
      stockItemId: movement.stockItemId,
      quantityDelta: movement.quantityDelta,
      unitCode: movement.unitCode,
      reason: movement.reason,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      source: movement.source,
      note: movement.note,
      occurredAt: movement.occurredAt,
      createdAt: movement.createdAt,
    });
  }

  async listByReference(input: {
    merchantId: string;
    referenceType: string;
    referenceId: string;
  }): Promise<StockMovement[]> {
    const rows = await this.db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.merchantId, input.merchantId),
          eq(stockMovements.referenceType, input.referenceType),
          eq(stockMovements.referenceId, input.referenceId),
        ),
      );
    return rows.map(toMovement);
  }
}

export class InMemoryStockMovementRepository implements StockMovementRepository {
  readonly items: StockMovement[] = [];

  async append(movement: StockMovement): Promise<void> {
    this.items.push({ ...movement });
  }

  async listByReference(input: {
    merchantId: string;
    referenceType: string;
    referenceId: string;
  }): Promise<StockMovement[]> {
    return this.items.filter(
      (m) =>
        m.merchantId === input.merchantId &&
        m.referenceType === input.referenceType &&
        m.referenceId === input.referenceId,
    );
  }
}
