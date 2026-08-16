/**
 * Inventory Operations Application Use-Cases & Repository Interface (MerchantOS Phase 6).
 */

import type {
  StockCountRecord,
  StockTransferRecord,
  WasteReason,
  WasteRecordDomain,
} from "../domain/stock-ops.js";

export interface StockOperationsRepository {
  createStockCount(input: {
    merchantId: string;
    storeId: string;
    countNumber: string;
    countDate: string;
    items: readonly { productId: string; expectedQuantity: number }[];
    countedBy?: string;
  }): Promise<StockCountRecord>;

  completeStockCount(input: {
    merchantId: string;
    countId: string;
    itemCounts: readonly { productId: string; actualQuantity: number; varianceReason?: string }[];
    approvedBy?: string;
  }): Promise<StockCountRecord>;

  recordWaste(input: {
    merchantId: string;
    storeId: string;
    productId: string;
    quantity: number;
    unitCostMinor: bigint;
    reason: WasteReason;
    costLayerId?: string;
    notes?: string;
    recordedBy?: string;
  }): Promise<WasteRecordDomain>;

  createStockTransfer(input: {
    merchantId: string;
    fromStoreId: string;
    toStoreId: string;
    transferNumber: string;
    items: readonly { productId: string; quantity: number; costLayerId?: string; unitCostMinor?: bigint }[];
    notes?: string;
    createdBy?: string;
  }): Promise<StockTransferRecord>;
}

export class ProcessWasteUseCase {
  constructor(private readonly repo: StockOperationsRepository) {}

  async execute(input: {
    merchantId: string;
    storeId: string;
    productId: string;
    quantity: number;
    unitCostMinor: bigint;
    reason: WasteReason;
    costLayerId?: string;
    notes?: string;
    recordedBy?: string;
  }): Promise<WasteRecordDomain> {
    if (input.quantity <= 0) {
      throw new Error("Waste quantity must be greater than zero");
    }
    return this.repo.recordWaste(input);
  }
}
