/**
 * In-Memory Return Repository Implementation (MerchantOS Phase 5).
 */

import { ReturnRepository } from "../application/return-use-cases.js";
import { ProcessCustomerReturnInput, ReturnItem, ReturnRecord } from "../domain/returns.js";

export class InMemoryReturnRepository implements ReturnRepository {
  private returns = new Map<string, ReturnRecord>();

  private getKey(merchantId: string, id: string): string {
    return `${merchantId}:${id}`;
  }

  async findById(merchantId: string, id: string): Promise<ReturnRecord | null> {
    return this.returns.get(this.getKey(merchantId, id)) ?? null;
  }

  async findByNumber(merchantId: string, returnNumber: string): Promise<ReturnRecord | null> {
    for (const r of this.returns.values()) {
      if (r.merchantId === merchantId && r.returnNumber === returnNumber) {
        return r;
      }
    }
    return null;
  }

  async createCustomerReturn(input: ProcessCustomerReturnInput): Promise<ReturnRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    let totalMinor = 0n;

    const items: ReturnItem[] = input.items.map((item) => {
      const lineTotal = item.unitPriceMinor * BigInt(Math.round(item.quantity));
      totalMinor += lineTotal;
      return {
        id: crypto.randomUUID(),
        merchantId: input.merchantId,
        returnId: id,
        productId: item.productId,
        quantity: item.quantity,
        unitCostMinor: item.unitCostMinor,
        unitPriceMinor: item.unitPriceMinor,
        totalMinor: lineTotal,
        costLayerId: item.costLayerId,
      };
    });

    const record: ReturnRecord = {
      id,
      merchantId: input.merchantId,
      storeId: input.storeId,
      returnType: "customer",
      returnNumber: input.returnNumber,
      originalReferenceType: "sale",
      originalReferenceId: input.saleId,
      customerId: input.customerId,
      totalMinor,
      refundMethod: input.refundMethod ?? "cash",
      refundAccountId: input.refundAccountId,
      status: "completed",
      reason: input.reason,
      items,
      createdBy: input.createdBy,
      createdAt: now,
    };

    this.returns.set(this.getKey(input.merchantId, id), record);
    return record;
  }
}
