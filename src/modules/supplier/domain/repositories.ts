/**
 * Supplier Repository Port (MerchantOS Phase 1).
 */

import {
  CreateSupplierInput,
  Supplier,
  SupplierId,
  SupplierTransaction,
  SupplierTransactionType,
  UpdateSupplierInput,
} from "./supplier.js";

export type ListSuppliersFilter = {
  readonly merchantId: string;
  readonly search?: string;
  readonly isActive?: boolean;
  readonly hasBalanceOnly?: boolean;
  readonly limit?: number;
  readonly offset?: number;
};

export type RecordSupplierTransactionInput = {
  readonly merchantId: string;
  readonly supplierId: SupplierId;
  readonly transactionType: SupplierTransactionType;
  readonly amountMinor: bigint;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly description?: string;
  readonly createdBy?: string;
};

export interface SupplierRepository {
  findById(merchantId: string, id: SupplierId): Promise<Supplier | null>;
  findByPhone(merchantId: string, phone: string): Promise<Supplier | null>;
  list(filter: ListSuppliersFilter): Promise<{ items: Supplier[]; total: number }>;
  create(input: CreateSupplierInput): Promise<Supplier>;
  update(merchantId: string, id: SupplierId, input: UpdateSupplierInput): Promise<Supplier>;
  recordTransaction(input: RecordSupplierTransactionInput): Promise<SupplierTransaction>;
  getTransactions(
    merchantId: string,
    supplierId: SupplierId,
    limit?: number,
    offset?: number,
  ): Promise<SupplierTransaction[]>;
}
