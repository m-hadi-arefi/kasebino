/**
 * Inventory Cost Layer Aggregate & Valuation Types (MerchantOS Phase 2).
 */

export type CostLayerId = string;
export type ValuationMethod = "fifo" | "lifo" | "weighted_average";

export type CostLayer = {
  readonly id: CostLayerId;
  readonly merchantId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly purchaseId?: string;
  readonly supplierId?: string;
  readonly layerDate: string;
  readonly originalQuantity: number;
  readonly remainingQuantity: number;
  readonly unitCostMinor: bigint;
  readonly unitCode: string;
  readonly batchNumber?: string;
  readonly expiryDate?: string;
  readonly isDepleted: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CostLayerConsumption = {
  readonly id: string;
  readonly merchantId: string;
  readonly costLayerId: CostLayerId;
  readonly referenceType: "sale" | "return_reversal" | "waste" | "transfer";
  readonly referenceId: string;
  readonly quantityConsumed: number;
  readonly unitCostMinor: bigint;
  readonly totalCostMinor: bigint;
  readonly consumedAt: Date;
};

export type AllocationResult = {
  readonly totalCogsMinor: bigint;
  readonly consumptions: readonly {
    readonly layerId: CostLayerId;
    readonly quantityConsumed: number;
    readonly unitCostMinor: bigint;
    readonly totalCostMinor: bigint;
  }[];
};
