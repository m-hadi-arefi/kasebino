/**
 * In-memory StockItemRepository for unit tests / local wiring until Drizzle.
 */

import type { StockItem } from "../../domain/stock-item.js";
import type {
  InventorySyncIdempotencyPort,
  StockItemRepository,
} from "../../domain/repositories.js";

function scopeKey(
  merchantId: string,
  storeId: string,
  productId: string,
): string {
  return `${merchantId}\0${storeId}\0${productId}`;
}

function cloneItem(item: StockItem): StockItem {
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

export class InMemoryStockItemRepository implements StockItemRepository {
  private readonly byId = new Map<string, StockItem>();
  private readonly byScope = new Map<string, string>();

  async save(item: StockItem): Promise<void> {
    this.byId.set(item.id, cloneItem(item));
    this.byScope.set(
      scopeKey(item.merchantId, item.storeId, item.productId),
      item.id,
    );
  }

  async findById(id: string): Promise<StockItem | null> {
    const found = this.byId.get(id);
    return found ? cloneItem(found) : null;
  }

  async findByStoreProduct(
    merchantId: string,
    storeId: string,
    productId: string,
  ): Promise<StockItem | null> {
    const id = this.byScope.get(scopeKey(merchantId, storeId, productId));
    if (!id) return null;
    const found = this.byId.get(id);
    return found ? cloneItem(found) : null;
  }

  async listByStore(
    merchantId: string,
    storeId: string,
  ): Promise<StockItem[]> {
    return [...this.byId.values()]
      .filter((i) => i.merchantId === merchantId && i.storeId === storeId)
      .map(cloneItem);
  }

  async update(item: StockItem): Promise<void> {
    this.byId.set(item.id, cloneItem(item));
    this.byScope.set(
      scopeKey(item.merchantId, item.storeId, item.productId),
      item.id,
    );
  }

  async updateWithOptimisticLock(
    item: StockItem,
    expectedVersion: number,
  ): Promise<boolean> {
    const current = this.byId.get(item.id);
    if (!current || current.version !== expectedVersion) {
      return false;
    }
    this.byId.set(item.id, cloneItem(item));
    this.byScope.set(
      scopeKey(item.merchantId, item.storeId, item.productId),
      item.id,
    );
    return true;
  }
}

export class InMemoryInventorySyncIdempotency
  implements InventorySyncIdempotencyPort
{
  private readonly applied = new Set<string>();

  async hasApplied(syncKey: string): Promise<boolean> {
    return this.applied.has(syncKey);
  }

  async markApplied(syncKey: string): Promise<void> {
    this.applied.add(syncKey);
  }
}
