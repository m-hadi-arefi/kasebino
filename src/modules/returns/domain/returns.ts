/**
 * Returns & Cost Reversal Domain Types (MerchantOS Phase 5).
 */

export type ReturnId = string;

export type ReturnItem = {
  readonly id: string;
  readonly merchantId: string;
  readonly returnId: ReturnId;
  readonly productId: string;
  readonly quantity: number;
  readonly unitCostMinor: bigint;
  readonly unitPriceMinor: bigint;
  readonly totalMinor: bigint;
  readonly costLayerId?: string;
};

export type ReturnRecord = {
  readonly id: ReturnId;
  readonly merchantId: string;
  readonly storeId: string;
  readonly returnType: "customer" | "supplier";
  readonly returnNumber: string;
  readonly originalReferenceType?: "sale" | "order" | "purchase";
  readonly originalReferenceId?: string;
  readonly customerId?: string;
  readonly supplierId?: string;
  readonly totalMinor: bigint;
  readonly refundMethod?: string;
  readonly refundAccountId?: string;
  readonly status: "completed" | "cancelled";
  readonly reason?: string;
  readonly notes?: string;
  readonly items: readonly ReturnItem[];
  readonly createdBy?: string;
  readonly createdAt: Date;
};

export type ProcessCustomerReturnInput = {
  readonly merchantId: string;
  readonly storeId: string;
  readonly returnNumber: string;
  readonly saleId: string;
  readonly customerId?: string;
  readonly refundMethod?: "cash" | "bank" | "credit";
  readonly refundAccountId?: string;
  readonly items: readonly {
    readonly productId: string;
    readonly quantity: number;
    readonly unitPriceMinor: bigint;
    readonly unitCostMinor: bigint;
    readonly costLayerId?: string;
  }[];
  readonly reason?: string;
  readonly createdBy?: string;
};
