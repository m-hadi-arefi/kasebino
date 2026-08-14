/**
 * Purchase & Procurement Domain Aggregate (MerchantOS Phase 2).
 */

export type PurchaseId = string;

export type PurchaseStatus = "draft" | "confirmed" | "partial_received" | "received" | "cancelled";
export type PurchasePaymentStatus = "unpaid" | "partial" | "paid";

export type PurchaseItem = {
  readonly id: string;
  readonly merchantId: string;
  readonly purchaseId: PurchaseId;
  readonly productId: string;
  readonly quantity: number;
  readonly unitCode: string;
  readonly unitCostMinor: bigint;
  readonly discountAmountMinor: bigint;
  readonly taxAmountMinor: bigint;
  readonly totalMinor: bigint;
  readonly receivedQuantity: number;
  readonly notes?: string;
};

export type PurchasePayment = {
  readonly id: string;
  readonly merchantId: string;
  readonly purchaseId: PurchaseId;
  readonly amountMinor: bigint;
  readonly paymentMethod: "cash" | "bank_transfer" | "cheque";
  readonly accountId?: string;
  readonly reference?: string;
  readonly paymentDate: string;
  readonly notes?: string;
};

export type Purchase = {
  readonly id: PurchaseId;
  readonly merchantId: string;
  readonly supplierId?: string;
  readonly storeId: string;
  readonly purchaseNumber: string;
  readonly status: PurchaseStatus;
  readonly purchaseDate: string;
  readonly invoiceNumber?: string;
  readonly subtotalMinor: bigint;
  readonly discountAmountMinor: bigint;
  readonly taxAmountMinor: bigint;
  readonly shippingAmountMinor: bigint;
  readonly additionalCostsMinor: bigint;
  readonly totalMinor: bigint;
  readonly paidAmountMinor: bigint;
  readonly paymentStatus: PurchasePaymentStatus;
  readonly items: readonly PurchaseItem[];
  readonly payments: readonly PurchasePayment[];
  readonly notes?: string;
  readonly erpnextPurchaseId?: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreatePurchaseInput = {
  readonly merchantId: string;
  readonly storeId: string;
  readonly supplierId?: string;
  readonly purchaseNumber: string;
  readonly purchaseDate: string;
  readonly invoiceNumber?: string;
  readonly discountAmountMinor?: bigint;
  readonly taxAmountMinor?: bigint;
  readonly shippingAmountMinor?: bigint;
  readonly additionalCostsMinor?: bigint;
  readonly items: readonly {
    readonly productId: string;
    readonly quantity: number;
    readonly unitCode?: string;
    readonly unitCostMinor: bigint;
    readonly discountAmountMinor?: bigint;
    readonly taxAmountMinor?: bigint;
    readonly notes?: string;
  }[];
  readonly notes?: string;
  readonly createdBy?: string;
};
