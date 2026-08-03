import type { StockItem } from "./stock-item.js";

/**
 * Domain port — Drizzle adapter follows schema stub (ARD-006 migrations).
 * Optimistic updates: WHERE id AND version = expected (ADR-049).
 */
export type StockItemRepository = {
  save(item: StockItem): Promise<void>;
  findById(id: string): Promise<StockItem | null>;
  findByStoreProduct(
    merchantId: string,
    storeId: string,
    productId: string,
  ): Promise<StockItem | null>;
  listByStore(merchantId: string, storeId: string): Promise<StockItem[]>;
  update(item: StockItem): Promise<void>;
  /**
   * Persist only when current row version equals expectedVersion.
   * @returns true when updated; false on version conflict.
   */
  updateWithOptimisticLock(
    item: StockItem,
    expectedVersion: number,
  ): Promise<boolean>;
};

/**
 * Idempotent sync keys for pickup/offline stock mutations (ADR-049 / ADR-091).
 */
export type InventorySyncIdempotencyPort = {
  hasApplied(syncKey: string): Promise<boolean>;
  markApplied(syncKey: string): Promise<void>;
};
