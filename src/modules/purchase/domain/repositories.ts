/**
 * Purchase Repository Interface (MerchantOS Phase 2).
 */

import { CreatePurchaseInput, Purchase, PurchaseId, PurchasePayment } from "./purchase.js";

export type ListPurchasesFilter = {
  readonly merchantId: string;
  readonly storeId?: string;
  readonly supplierId?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly offset?: number;
};

export interface PurchaseRepository {
  findById(merchantId: string, id: PurchaseId): Promise<Purchase | null>;
  findByNumber(merchantId: string, purchaseNumber: string): Promise<Purchase | null>;
  list(filter: ListPurchasesFilter): Promise<{ items: Purchase[]; total: number }>;
  createDraft(input: CreatePurchaseInput): Promise<Purchase>;
  updateStatus(merchantId: string, id: PurchaseId, status: string): Promise<Purchase>;
  addPayment(input: {
    merchantId: string;
    purchaseId: PurchaseId;
    amountMinor: bigint;
    paymentMethod: "cash" | "bank_transfer" | "cheque";
    accountId?: string;
    reference?: string;
    paymentDate: string;
    notes?: string;
  }): Promise<PurchasePayment>;
}
