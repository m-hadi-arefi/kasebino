/**
 * Supplier Domain Aggregate & Types (MerchantOS Phase 1).
 */

export type SupplierId = string;

export type Supplier = {
  readonly id: SupplierId;
  readonly merchantId: string;
  readonly name: string;
  readonly contactName?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly city?: string;
  readonly province?: string;
  readonly nationalId?: string;
  readonly taxId?: string;
  /** AP Balance in minor IRR units (positive = we owe supplier). */
  readonly balanceMinor: bigint;
  readonly creditLimitMinor?: bigint;
  readonly tags: readonly string[];
  readonly notes?: string;
  readonly isActive: boolean;
  readonly erpnextSupplierId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type SupplierTransactionType =
  | "purchase_credit"
  | "payment"
  | "return"
  | "advance"
  | "adjustment";

export type SupplierTransaction = {
  readonly id: string;
  readonly merchantId: string;
  readonly supplierId: SupplierId;
  readonly transactionType: SupplierTransactionType;
  readonly amountMinor: bigint;
  readonly balanceAfterMinor: bigint;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly description?: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
};

export type CreateSupplierInput = {
  readonly merchantId: string;
  readonly name: string;
  readonly contactName?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly city?: string;
  readonly province?: string;
  readonly nationalId?: string;
  readonly taxId?: string;
  readonly creditLimitMinor?: bigint;
  readonly tags?: readonly string[];
  readonly notes?: string;
  readonly erpnextSupplierId?: string;
};

export type UpdateSupplierInput = Partial<Omit<CreateSupplierInput, "merchantId">> & {
  readonly isActive?: boolean;
};
