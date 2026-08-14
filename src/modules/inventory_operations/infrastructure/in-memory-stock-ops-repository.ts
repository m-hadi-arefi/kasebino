/**
 * In-Memory Stock Operations Repository Implementation (MerchantOS Phase 6).
 */

import { StockOperationsRepository } from "../application/stock-ops-use-cases.js";
import {
  StockCountRecord,
  StockTransferRecord,
  WasteReason,
  WasteRecordDomain,
} from "../domain/stock-ops.js";

export class InMemoryStockOperationsRepository implements StockOperationsRepository {
  private stockCounts = new Map<string, StockCountRecord>();
  private wasteRecords: WasteRecordDomain[] = [];
  private stockTransfers = new Map<string, StockTransferRecord>();

  private getKey(merchantId: string, id: string): string {
    return `${merchantId}:${id}`;
  }

  async createStockCount(input: {
    merchantId: string;
    storeId: string;
    countNumber: string;
    countDate: string;
    items: readonly { productId: string; expectedQuantity: number }[];
    countedBy?: string;
  }): Promise<StockCountRecord> {
    const id = crypto.randomUUID();
    const record: StockCountRecord = {
      id,
      merchantId: input.merchantId,
      storeId: input.storeId,
      countNumber: input.countNumber,
      status: "in_progress",
      countDate: input.countDate,
      items: input.items.map((i) => ({
        productId: i.productId,
        expectedQuantity: i.expectedQuantity,
      })),
      countedBy: input.countedBy,
      createdAt: new Date(),
    };
    this.stockCounts.set(this.getKey(input.merchantId, id), record);
    return record;
  }

  async completeStockCount(input: {
    merchantId: string;
    countId: string;
    itemCounts: readonly { productId: string; actualQuantity: number; varianceReason?: string }[];
    approvedBy?: string;
  }): Promise<StockCountRecord> {
    const existing = this.stockCounts.get(this.getKey(input.merchantId, input.countId));
    if (!existing) {
      throw new Error(`Stock count ${input.countId} not found`);
    }

    const updatedItems = existing.items.map((item) => {
      const match = input.itemCounts.find((c) => c.productId === item.productId);
      if (!match) return item;
      const variance = match.actualQuantity - item.expectedQuantity;
      return {
        ...item,
        actualQuantity: match.actualQuantity,
        variance,
        varianceReason: match.varianceReason,
      };
    });

    const completed: StockCountRecord = {
      ...existing,
      status: "completed",
      items: updatedItems,
      approvedBy: input.approvedBy,
      completedAt: new Date(),
    };

    this.stockCounts.set(this.getKey(input.merchantId, input.countId), completed);
    return completed;
  }

  async recordWaste(input: {
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
    const id = crypto.randomUUID();
    const now = new Date();
    const totalValueMinor = input.unitCostMinor * BigInt(Math.round(input.quantity));

    const waste: WasteRecordDomain = {
      id,
      merchantId: input.merchantId,
      storeId: input.storeId,
      productId: input.productId,
      quantity: input.quantity,
      unitCostMinor: input.unitCostMinor,
      totalValueMinor,
      reason: input.reason,
      costLayerId: input.costLayerId,
      notes: input.notes,
      recordedBy: input.recordedBy,
      recordedAt: now,
    };

    this.wasteRecords.push(waste);
    return waste;
  }

  async createStockTransfer(input: {
    merchantId: string;
    fromStoreId: string;
    toStoreId: string;
    transferNumber: string;
    items: readonly { productId: string; quantity: number; costLayerId?: string; unitCostMinor?: bigint }[];
    notes?: string;
    createdBy?: string;
  }): Promise<StockTransferRecord> {
    const id = crypto.randomUUID();
    const record: StockTransferRecord = {
      id,
      merchantId: input.merchantId,
      fromStoreId: input.fromStoreId,
      toStoreId: input.toStoreId,
      transferNumber: input.transferNumber,
      status: "in_transit",
      items: input.items,
      notes: input.notes,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };
    this.stockTransfers.set(this.getKey(input.merchantId, id), record);
    return record;
  }
}
