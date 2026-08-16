/**
 * Accounting integration port (ADR-126).
 * Core domain depends on this port — never ERPNext SDKs or Doctypes.
 */

export type AccountingSyncResult = {
  readonly ok: boolean;
  readonly externalId: string | null;
  readonly alreadyApplied: boolean;
  readonly message?: string;
};

export type AccountingEntityRef = {
  merchantId: string;
  storeId?: string | null;
  entityType: string;
  entityId: string;
};

export type SyncProductInput = AccountingEntityRef & {
  eventId: string;
  sku: string;
  barcode: string;
  name: string;
  unitCode: string;
  priceAmountMinor: string;
  /** Soft-delete / archive in ERP (Item.disabled). */
  disabled?: boolean;
};

export type SyncCustomerInput = AccountingEntityRef & {
  eventId: string;
  phoneNational?: string | null;
  displayName?: string | null;
};

export type RecordSaleLineInput = {
  productId: string;
  quantity: number;
  unitCode: string;
  unitPriceMinor: string;
  lineTotalMinor: string;
};

export type RecordSaleInput = AccountingEntityRef & {
  eventId: string;
  saleId: string;
  idempotencyKey: string;
  channel: "pos" | "online";
  tenderType?: string | null;
  totalAmountMinor: string;
  currency: "IRR";
  lines: readonly RecordSaleLineInput[];
  occurredAt: string;
};

export type RecordPaymentInput = AccountingEntityRef & {
  eventId: string;
  paymentId: string;
  orderId: string;
  amountMinor: string;
  currency: "IRR";
  providerRef?: string | null;
  occurredAt: string;
};

export type RecordInventoryAdjustmentInput = AccountingEntityRef & {
  eventId: string;
  productId: string;
  quantityDelta: number;
  unitCode: string;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  occurredAt: string;
};

export type SyncSupplierInput = AccountingEntityRef & {
  eventId: string;
  name: string;
  phone?: string | null;
  taxId?: string | null;
  supplierGroup?: string | null;
  address?: string | null;
};

export type RecordPurchaseLineInput = {
  productId: string;
  quantity: number;
  unitCode?: string | undefined;
  unitCostMinor: string;
  lineTotalMinor: string;
  itemCode?: string | undefined;
};

export type RecordPurchaseInput = AccountingEntityRef & {
  eventId: string;
  purchaseId: string;
  supplierName: string;
  supplierId?: string | null | undefined;
  idempotencyKey?: string | undefined;
  invoiceNumber?: string | null | undefined;
  postingDate: string;
  dueDate?: string | null | undefined;
  totalAmountMinor: string;
  currency: "IRR";
  lines: readonly RecordPurchaseLineInput[];
  remarks?: string | undefined;
};

export type RecordReturnLineInput = {
  productId: string;
  quantity: number;
  unitCode?: string | undefined;
  unitPriceMinor: string;
  lineTotalMinor: string;
  itemCode?: string | undefined;
};

export type RecordReturnInput = AccountingEntityRef & {
  eventId: string;
  returnId: string;
  originalSaleOrOrderId: string;
  idempotencyKey?: string | undefined;
  returnNumber?: string | undefined;
  customerName?: string | undefined;
  customerId?: string | null | undefined;
  totalAmountMinor: string;
  currency: "IRR";
  lines: readonly RecordReturnLineInput[];
  reason?: string | undefined;
  occurredAt: string;
};

export type RecordExpenseInput = AccountingEntityRef & {
  eventId: string;
  expenseId: string;
  categoryId?: string | null | undefined;
  categoryName?: string | null | undefined;
  amountMinor: string;
  currency: "IRR";
  paymentMethod?: "cash" | "bank" | string | undefined;
  expenseDate: string;
  description?: string | null | undefined;
  accountId?: string | null | undefined;
};

export type RecordTransferLineInput = {
  productId: string;
  quantity: number;
  unitCode?: string | undefined;
  itemCode?: string | undefined;
};

export type RecordTransferInput = AccountingEntityRef & {
  eventId: string;
  transferId: string;
  fromStoreId: string;
  toStoreId: string;
  occurredAt: string;
  lines: readonly RecordTransferLineInput[];
  remarks?: string | undefined;
};

/**
 * Outbound accounting/ERP port. Implementations must be idempotent by eventId.
 */
export type AccountingProvider = {
  readonly providerId: string;
  syncProduct(input: SyncProductInput): Promise<AccountingSyncResult>;
  syncCustomer(input: SyncCustomerInput): Promise<AccountingSyncResult>;
  syncSupplier(input: SyncSupplierInput): Promise<AccountingSyncResult>;
  recordSale(input: RecordSaleInput): Promise<AccountingSyncResult>;
  recordPayment(input: RecordPaymentInput): Promise<AccountingSyncResult>;
  recordInventoryAdjustment(
    input: RecordInventoryAdjustmentInput,
  ): Promise<AccountingSyncResult>;
  recordPurchase(input: RecordPurchaseInput): Promise<AccountingSyncResult>;
  recordReturn(input: RecordReturnInput): Promise<AccountingSyncResult>;
  recordExpense(input: RecordExpenseInput): Promise<AccountingSyncResult>;
  recordTransfer(input: RecordTransferInput): Promise<AccountingSyncResult>;
};
