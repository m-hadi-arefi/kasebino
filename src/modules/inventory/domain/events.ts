import { createDomainEvent } from "../../../shared/ddd/index.js";

export function stockAdjustedEvent(input: {
  stockItemId: string;
  merchantId: string;
  storeId: string;
  productId: string;
  previousQuantity: number;
  nextQuantity: number;
  delta: number;
  reason?: string;
  unitCode?: string;
  referenceType?: string | null;
  referenceId?: string | null;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "StockAdjusted",
    aggregateId: input.stockItemId,
    aggregateType: "StockItem",
    payload: {
      stockItemId: input.stockItemId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      productId: input.productId,
      previousQuantity: input.previousQuantity,
      nextQuantity: input.nextQuantity,
      delta: input.delta,
      /** Alias for accounting consumer (ADR-126). */
      quantityDelta: input.delta,
      unitCode: input.unitCode ?? "piece",
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      reason: input.reason ?? null,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export type InventoryChangeReason =
  | "sale"
  | "pickup_paid"
  | "pickup_restore"
  | "restock"
  | "adjust"
  | "offline_reject";

export function inventoryChangedEvent(input: {
  stockItemId: string;
  merchantId: string;
  storeId: string;
  productId: string;
  delta: number;
  quantityAfter: number;
  reason: InventoryChangeReason;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "InventoryChanged",
    aggregateId: input.stockItemId,
    aggregateType: "StockItem",
    payload: {
      merchantId: input.merchantId,
      storeId: input.storeId,
      productId: input.productId,
      delta: input.delta,
      quantityAfter: input.quantityAfter,
      reason: input.reason,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

/** Wire: InventoryLowDetected (ADR-002 past tense; catalog alias InventoryLow). */
export function inventoryLowDetectedEvent(input: {
  stockItemId: string;
  merchantId: string;
  storeId: string;
  productId: string;
  quantity: number;
  reorderLevel: number;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "InventoryLowDetected",
    aggregateId: input.stockItemId,
    aggregateType: "StockItem",
    payload: {
      merchantId: input.merchantId,
      storeId: input.storeId,
      productId: input.productId,
      quantity: input.quantity,
      reorderLevel: input.reorderLevel,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

/** Wire: InventoryDepleted (ADR-002; catalog alias InventoryOutOfStock). */
export function inventoryDepletedEvent(input: {
  stockItemId: string;
  merchantId: string;
  storeId: string;
  productId: string;
  quantity: number;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "InventoryDepleted",
    aggregateId: input.stockItemId,
    aggregateType: "StockItem",
    payload: {
      merchantId: input.merchantId,
      storeId: input.storeId,
      productId: input.productId,
      quantity: input.quantity,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

/** Alias for readability at call sites. */
export const inventoryLowEvent = inventoryLowDetectedEvent;
/** Alias for readability at call sites. */
export const inventoryOutOfStockEvent = inventoryDepletedEvent;

/**
 * Threshold policy events after a quantity change (ADR-049 / ARD-006).
 * Out-of-stock takes precedence over low when quantity === 0.
 */
export function buildThresholdEvents(input: {
  stockItemId: string;
  merchantId: string;
  storeId: string;
  productId: string;
  previousQuantity: number;
  nextQuantity: number;
  reorderLevel: number;
  occurredAt: Date;
}) {
  const events: Array<
    | ReturnType<typeof inventoryLowDetectedEvent>
    | ReturnType<typeof inventoryDepletedEvent>
  > = [];

  if (input.nextQuantity === 0 && input.previousQuantity > 0) {
    events.push(
      inventoryDepletedEvent({
        stockItemId: input.stockItemId,
        merchantId: input.merchantId,
        storeId: input.storeId,
        productId: input.productId,
        quantity: 0,
        occurredAt: input.occurredAt,
      }),
    );
    return events;
  }

  if (
    input.reorderLevel > 0 &&
    input.nextQuantity > 0 &&
    input.nextQuantity <= input.reorderLevel &&
    input.previousQuantity > input.reorderLevel
  ) {
    events.push(
      inventoryLowDetectedEvent({
        stockItemId: input.stockItemId,
        merchantId: input.merchantId,
        storeId: input.storeId,
        productId: input.productId,
        quantity: input.nextQuantity,
        reorderLevel: input.reorderLevel,
        occurredAt: input.occurredAt,
      }),
    );
  }

  return events;
}
