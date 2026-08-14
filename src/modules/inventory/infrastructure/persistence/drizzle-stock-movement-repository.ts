/**
 * Drizzle + in-memory stock movement repositories (ADR-126).
 */

import { and, desc, eq, lt } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { stockMovements } from "../../../../infrastructure/database/schema/inventory.js";
import type { DrizzleTransactionScope } from "../../../../infrastructure/persistence/drizzle-transaction-scope.js";
import type { StockMovement } from "../../domain/stock-movement.js";
import type {
  ListStockMovementsQueryOptions,
  StockMovementRepository,
} from "../../domain/stock-movement-repository.js";
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

  async listMovements(input: ListStockMovementsQueryOptions): Promise<{
    movements: StockMovement[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const conditions = [
      eq(stockMovements.merchantId, input.merchantId),
      eq(stockMovements.storeId, input.storeId),
    ];
    if (input.productId) {
      conditions.push(eq(stockMovements.productId, input.productId));
    }
    if (input.cursor) {
      const cursorDate = new Date(input.cursor);
      if (!isNaN(cursorDate.getTime())) {
        conditions.push(lt(stockMovements.createdAt, cursorDate));
      }
    }

    const rows = await this.db
      .select()
      .from(stockMovements)
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const resultRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && resultRows.length > 0
        ? resultRows[resultRows.length - 1]!.createdAt.toISOString()
        : null;

    return {
      movements: resultRows.map(toMovement),
      nextCursor,
    };
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

  async listMovements(input: ListStockMovementsQueryOptions): Promise<{
    movements: StockMovement[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    let filtered = this.items.filter(
      (m) =>
        m.merchantId === input.merchantId &&
        m.storeId === input.storeId &&
        (!input.productId || m.productId === input.productId),
    );
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (input.cursor) {
      const cursorTime = new Date(input.cursor).getTime();
      if (!isNaN(cursorTime)) {
        filtered = filtered.filter((m) => m.createdAt.getTime() < cursorTime);
      }
    }

    const hasMore = filtered.length > limit;
    const resultItems = hasMore ? filtered.slice(0, limit) : filtered;
    const nextCursor =
      hasMore && resultItems.length > 0
        ? resultItems[resultItems.length - 1]!.createdAt.toISOString()
        : null;

    return {
      movements: resultItems,
      nextCursor,
    };
  }
}
