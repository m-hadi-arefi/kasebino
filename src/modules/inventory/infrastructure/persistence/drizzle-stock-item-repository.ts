/**
 * Drizzle StockItemRepository (ADR-093 / ADR-008 / ADR-049).
 */

import { and, eq } from "drizzle-orm";

import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import { stockItems } from "../../../../infrastructure/database/schema/inventory.js";
import {
  assertMerchantId,
  assertStoreId,
} from "../../../../infrastructure/persistence/helpers.js";
import type { StockItemRepository } from "../../domain/repositories.js";
import type { StockItem } from "../../domain/stock-item.js";

type Row = typeof stockItems.$inferSelect;

function toItem(row: Row): StockItem {
  return {
    id: row.id,
    merchantId: row.merchantId,
    storeId: row.storeId,
    productId: row.productId,
    quantity: row.quantity,
    reorderLevel: row.reorderLevel,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toValues(item: StockItem) {
  return {
    id: item.id,
    merchantId: item.merchantId,
    storeId: item.storeId,
    productId: item.productId,
    quantity: item.quantity,
    reorderLevel: item.reorderLevel,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export class DrizzleStockItemRepository implements StockItemRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(item: StockItem): Promise<void> {
    await this.db.insert(stockItems).values(toValues(item));
  }

  async findById(id: string): Promise<StockItem | null> {
    const rows = await this.db
      .select()
      .from(stockItems)
      .where(eq(stockItems.id, id))
      .limit(1);
    return rows[0] ? toItem(rows[0]) : null;
  }

  async findByStoreProduct(
    merchantId: string,
    storeId: string,
    productId: string,
  ): Promise<StockItem | null> {
    assertMerchantId(merchantId);
    assertStoreId(storeId);
    const rows = await this.db
      .select()
      .from(stockItems)
      .where(
        and(
          eq(stockItems.merchantId, merchantId),
          eq(stockItems.storeId, storeId),
          eq(stockItems.productId, productId),
        ),
      )
      .limit(1);
    return rows[0] ? toItem(rows[0]) : null;
  }

  async listByStore(
    merchantId: string,
    storeId: string,
  ): Promise<StockItem[]> {
    assertMerchantId(merchantId);
    assertStoreId(storeId);
    const rows = await this.db
      .select()
      .from(stockItems)
      .where(
        and(
          eq(stockItems.merchantId, merchantId),
          eq(stockItems.storeId, storeId),
        ),
      );
    return rows.map(toItem);
  }

  async update(item: StockItem): Promise<void> {
    await this.db
      .update(stockItems)
      .set({
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        version: item.version,
        updatedAt: item.updatedAt,
      })
      .where(
        and(
          eq(stockItems.id, item.id),
          eq(stockItems.merchantId, item.merchantId),
          eq(stockItems.storeId, item.storeId),
        ),
      );
  }

  async updateWithOptimisticLock(
    item: StockItem,
    expectedVersion: number,
  ): Promise<boolean> {
    const result = await this.db
      .update(stockItems)
      .set({
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        version: item.version,
        updatedAt: item.updatedAt,
      })
      .where(
        and(
          eq(stockItems.id, item.id),
          eq(stockItems.merchantId, item.merchantId),
          eq(stockItems.storeId, item.storeId),
          eq(stockItems.version, expectedVersion),
        ),
      )
      .returning({ id: stockItems.id });
    return result.length > 0;
  }
}
