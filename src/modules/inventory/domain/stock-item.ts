/**
 * StockItem aggregate (ADR-008 Inventory).
 * Store-scoped quantity under merchant (ADR-091). Catalog owns Product.
 */

export type StockItem = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  readonly productId: string;
  /** On-hand quantity — MVP never negative. */
  quantity: number;
  reorderLevel: number;
  /** Optimistic concurrency version (schema stub alignment). */
  version: number;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CreateStockItemAggregateInput = {
  id: string;
  merchantId: string;
  storeId: string;
  productId: string;
  quantity?: number;
  reorderLevel?: number;
  now?: Date;
};

export function createStockItemAggregate(
  input: CreateStockItemAggregateInput,
): StockItem {
  const now = input.now ?? new Date();
  const quantity = input.quantity ?? 0;
  if (quantity < 0) {
    throw new Error("StockItem quantity must be >= 0 (ADR-008 MVP)");
  }
  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId,
    productId: input.productId,
    quantity,
    reorderLevel: input.reorderLevel ?? 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Apply delta to stock. Returns previous quantity.
 * Caller must ensure result >= 0 for MVP.
 */
export function applyStockDelta(
  item: StockItem,
  delta: number,
  at: Date = new Date(),
): { previousQuantity: number; nextQuantity: number } {
  const previousQuantity = item.quantity;
  const nextQuantity = previousQuantity + delta;
  item.quantity = nextQuantity;
  item.version += 1;
  item.updatedAt = at;
  return { previousQuantity, nextQuantity };
}
