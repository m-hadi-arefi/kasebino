/**
 * Stock movement domain types (ADR-126).
 */

export const STOCK_MOVEMENT_REASONS = [
  "sale",
  "return",
  "adjustment",
  "transfer",
  "receipt",
  "damage",
  "purchase",
  "pickup_paid",
  "pickup_restore",
] as const;

export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number];

export type StockMovement = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly stockItemId: string;
  readonly quantityDelta: number;
  readonly unitCode: string;
  readonly reason: StockMovementReason;
  readonly referenceType: string | null;
  readonly referenceId: string | null;
  readonly source: string;
  readonly note: string | null;
  readonly occurredAt: Date;
  readonly createdAt: Date;
};

export type CreateStockMovementInput = {
  id: string;
  merchantId: string;
  storeId: string;
  productId: string;
  stockItemId: string;
  quantityDelta: number;
  unitCode?: string;
  reason: StockMovementReason;
  referenceType?: string | null;
  referenceId?: string | null;
  source: string;
  note?: string | null;
  now?: Date;
};

export function createStockMovement(
  input: CreateStockMovementInput,
): StockMovement {
  if (!Number.isInteger(input.quantityDelta) || input.quantityDelta === 0) {
    throw new Error("StockMovement quantityDelta must be a non-zero integer");
  }
  const now = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId,
    productId: input.productId,
    stockItemId: input.stockItemId,
    quantityDelta: input.quantityDelta,
    unitCode: input.unitCode ?? "piece",
    reason: input.reason,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    source: input.source,
    note: input.note ?? null,
    occurredAt: now,
    createdAt: now,
  };
}
