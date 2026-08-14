/**
 * Inventory Operations Domain Types (MerchantOS Phase 6).
 */

export type WasteReason = "spoilage" | "expiry" | "damage" | "theft" | "loss" | "production";

export type StockCountRecord = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  readonly countNumber: string;
  readonly status: "in_progress" | "completed" | "cancelled";
  readonly countDate: string;
  readonly items: readonly {
    readonly productId: string;
    readonly expectedQuantity: number;
    readonly actualQuantity?: number;
    readonly variance?: number;
    readonly varianceReason?: string;
  }[];
  readonly countedBy?: string;
  readonly approvedBy?: string;
  readonly completedAt?: Date;
  readonly createdAt: Date;
};

export type WasteRecordDomain = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly quantity: number;
  readonly unitCostMinor: bigint;
  readonly totalValueMinor: bigint;
  readonly reason: WasteReason;
  readonly costLayerId?: string;
  readonly notes?: string;
  readonly recordedBy?: string;
  readonly recordedAt: Date;
};

export type StockTransferRecord = {
  readonly id: string;
  readonly merchantId: string;
  readonly fromStoreId: string;
  readonly toStoreId: string;
  readonly transferNumber: string;
  readonly status: "pending" | "in_transit" | "received" | "cancelled";
  readonly items: readonly {
    readonly productId: string;
    readonly quantity: number;
    readonly unitCostMinor?: bigint;
    readonly costLayerId?: string;
  }[];
  readonly notes?: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
};
