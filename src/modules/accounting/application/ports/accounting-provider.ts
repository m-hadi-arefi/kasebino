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

/**
 * Outbound accounting/ERP port. Implementations must be idempotent by eventId.
 */
export type AccountingProvider = {
  readonly providerId: string;
  syncProduct(input: SyncProductInput): Promise<AccountingSyncResult>;
  syncCustomer(input: SyncCustomerInput): Promise<AccountingSyncResult>;
  recordSale(input: RecordSaleInput): Promise<AccountingSyncResult>;
  recordPayment(input: RecordPaymentInput): Promise<AccountingSyncResult>;
  recordInventoryAdjustment(
    input: RecordInventoryAdjustmentInput,
  ): Promise<AccountingSyncResult>;
  recordPurchase(input: AccountingEntityRef & { eventId: string }): Promise<AccountingSyncResult>;
  recordReturn(input: AccountingEntityRef & { eventId: string }): Promise<AccountingSyncResult>;
};
