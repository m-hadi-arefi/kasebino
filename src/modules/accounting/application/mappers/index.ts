/**
 * Provider-agnostic integration mappers (ADR-126 / ADR-130 / ADR-131).
 * These produce AccountingProvider DTOs — never ERPNext DocType shapes.
 */

import type {
  RecordExpenseInput,
  RecordPaymentInput,
  RecordPurchaseInput,
  RecordReturnInput,
  RecordSaleInput,
  RecordTransferInput,
  SyncCustomerInput,
  SyncProductInput,
  SyncSupplierInput,
} from "../ports/accounting-provider.js";

export function mapProductToAccountingSync(input: {
  eventId: string;
  merchantId: string;
  storeId?: string | null;
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  unitCode?: string;
  priceAmountMinor: bigint | string;
  disabled?: boolean;
}): SyncProductInput {
  return {
    eventId: input.eventId,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    entityType: "product",
    entityId: input.productId,
    sku: input.sku,
    barcode: input.barcode,
    name: input.name,
    unitCode: input.unitCode ?? "piece",
    priceAmountMinor: String(input.priceAmountMinor),
    ...(input.disabled !== undefined ? { disabled: input.disabled } : {}),
  };
}

export function mapCustomerToAccountingSync(input: {
  eventId: string;
  merchantId: string;
  storeId?: string | null;
  customerId: string;
  phoneNational?: string | null;
  displayName?: string | null;
}): SyncCustomerInput {
  return {
    eventId: input.eventId,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    entityType: "customer",
    entityId: input.customerId,
    phoneNational: input.phoneNational ?? null,
    displayName: input.displayName ?? null,
  };
}

export function mapSaleToAccountingRecord(input: {
  eventId: string;
  merchantId: string;
  storeId: string;
  saleId: string;
  idempotencyKey: string;
  channel?: "pos" | "online";
  tenderType?: string | null;
  totalAmountMinor: bigint | string;
  occurredAt: Date | string;
  lines: readonly {
    productId: string;
    quantity: number;
    unitCode?: string;
    unitPriceMinor: bigint | string;
    lineTotalMinor: bigint | string;
  }[];
}): RecordSaleInput {
  return {
    eventId: input.eventId,
    merchantId: input.merchantId,
    storeId: input.storeId,
    entityType: "sale",
    entityId: input.saleId,
    saleId: input.saleId,
    idempotencyKey: input.idempotencyKey,
    channel: input.channel ?? "pos",
    tenderType: input.tenderType ?? null,
    totalAmountMinor: String(input.totalAmountMinor),
    currency: "IRR",
    occurredAt:
      typeof input.occurredAt === "string"
        ? input.occurredAt
        : input.occurredAt.toISOString(),
    lines: input.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitCode: line.unitCode ?? "piece",
      unitPriceMinor: String(line.unitPriceMinor),
      lineTotalMinor: String(line.lineTotalMinor),
    })),
  };
}

/**
 * Payment gateway confirms money; this mapper projects the accounting consequence only.
 * Never includes gateway secrets or raw webhook bodies.
 */
export function mapPaymentToAccountingRecord(input: {
  eventId: string;
  merchantId: string;
  storeId?: string | null;
  paymentId: string;
  orderId: string;
  amountMinor: bigint | string;
  providerRef?: string | null;
  occurredAt: Date | string;
}): RecordPaymentInput {
  return {
    eventId: input.eventId,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    entityType: "payment",
    entityId: input.paymentId,
    paymentId: input.paymentId,
    orderId: input.orderId,
    amountMinor: String(input.amountMinor),
    currency: "IRR",
    providerRef: input.providerRef ?? null,
    occurredAt:
      typeof input.occurredAt === "string"
        ? input.occurredAt
        : input.occurredAt.toISOString(),
  };
}

export function mapStoreToWarehouseProjection(input: {
  merchantId: string;
  storeId: string;
  displayName: string;
}) {
  return {
    entityType: "store_warehouse" as const,
    merchantId: input.merchantId,
    entityId: input.storeId,
    label: input.displayName,
  };
}

/** Canonical movement kinds for future ERP projection (MOS local reasons stay lowercase). */
export const ACCOUNTING_MOVEMENT_TYPES = [
  "SALE",
  "PURCHASE",
  "RETURN",
  "ADJUSTMENT",
  "TRANSFER",
] as const;

export type AccountingMovementType = (typeof ACCOUNTING_MOVEMENT_TYPES)[number];

export function mapStockReasonToAccountingMovementType(
  reason: string,
): AccountingMovementType {
  switch (reason) {
    case "sale":
    case "pickup_paid":
      return "SALE";
    case "purchase":
    case "receipt":
      return "PURCHASE";
    case "return":
    case "pickup_restore":
      return "RETURN";
    case "transfer":
      return "TRANSFER";
    default:
      return "ADJUSTMENT";
  }
}

export function mapSupplierToAccountingSync(input: {
  eventId: string;
  merchantId: string;
  storeId?: string | null;
  supplierId: string;
  name: string;
  phone?: string | null;
  taxId?: string | null;
  supplierGroup?: string | null;
  address?: string | null;
}): SyncSupplierInput {
  return {
    eventId: input.eventId,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    entityType: "supplier",
    entityId: input.supplierId,
    name: input.name,
    phone: input.phone ?? null,
    taxId: input.taxId ?? null,
    supplierGroup: input.supplierGroup ?? null,
    address: input.address ?? null,
  };
}

export function mapPurchaseToAccountingRecord(input: {
  eventId: string;
  merchantId: string;
  storeId?: string | null | undefined;
  purchaseId: string;
  supplierName: string;
  supplierId?: string | null | undefined;
  idempotencyKey?: string | undefined;
  invoiceNumber?: string | null | undefined;
  postingDate: Date | string;
  dueDate?: Date | string | null | undefined;
  totalAmountMinor: bigint | string;
  currency?: "IRR" | undefined;
  remarks?: string | undefined;
  lines: readonly {
    productId: string;
    quantity: number;
    unitCode?: string | undefined;
    unitCostMinor: bigint | string;
    lineTotalMinor: bigint | string;
    itemCode?: string | undefined;
  }[];
}): RecordPurchaseInput {
  return {
    eventId: input.eventId,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    entityType: "purchase",
    entityId: input.purchaseId,
    purchaseId: input.purchaseId,
    supplierName: input.supplierName,
    supplierId: input.supplierId ?? null,
    idempotencyKey: input.idempotencyKey ?? input.purchaseId,
    invoiceNumber: input.invoiceNumber ?? null,
    postingDate:
      typeof input.postingDate === "string"
        ? input.postingDate
        : input.postingDate.toISOString(),
    dueDate: input.dueDate
      ? typeof input.dueDate === "string"
        ? input.dueDate
        : input.dueDate.toISOString()
      : null,
    totalAmountMinor: String(input.totalAmountMinor),
    currency: input.currency ?? "IRR",
    ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
    lines: input.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitCode: line.unitCode ?? "piece",
      unitCostMinor: String(line.unitCostMinor),
      lineTotalMinor: String(line.lineTotalMinor),
      ...(line.itemCode !== undefined ? { itemCode: line.itemCode } : {}),
    })),
  };
}

export function mapReturnToAccountingRecord(input: {
  eventId: string;
  merchantId: string;
  storeId?: string | null | undefined;
  returnId: string;
  originalSaleOrOrderId: string;
  idempotencyKey?: string | undefined;
  returnNumber?: string | undefined;
  customerName?: string | undefined;
  customerId?: string | null | undefined;
  totalAmountMinor: bigint | string;
  currency?: "IRR" | undefined;
  reason?: string | undefined;
  occurredAt: Date | string;
  lines: readonly {
    productId: string;
    quantity: number;
    unitCode?: string | undefined;
    unitPriceMinor: bigint | string;
    lineTotalMinor: bigint | string;
    itemCode?: string | undefined;
  }[];
}): RecordReturnInput {
  return {
    eventId: input.eventId,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    entityType: "return",
    entityId: input.returnId,
    returnId: input.returnId,
    originalSaleOrOrderId: input.originalSaleOrOrderId,
    idempotencyKey: input.idempotencyKey ?? input.returnId,
    ...(input.returnNumber !== undefined ? { returnNumber: input.returnNumber } : {}),
    ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
    customerId: input.customerId ?? null,
    totalAmountMinor: String(input.totalAmountMinor),
    currency: input.currency ?? "IRR",
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    occurredAt:
      typeof input.occurredAt === "string"
        ? input.occurredAt
        : input.occurredAt.toISOString(),
    lines: input.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitCode: line.unitCode ?? "piece",
      unitPriceMinor: String(line.unitPriceMinor),
      lineTotalMinor: String(line.lineTotalMinor),
      ...(line.itemCode !== undefined ? { itemCode: line.itemCode } : {}),
    })),
  };
}

export function mapExpenseToAccountingRecord(input: {
  eventId: string;
  merchantId: string;
  storeId?: string | null | undefined;
  expenseId: string;
  categoryId?: string | null | undefined;
  categoryName?: string | null | undefined;
  amountMinor: bigint | string;
  currency?: "IRR" | undefined;
  paymentMethod?: "cash" | "bank" | string | undefined;
  expenseDate: Date | string;
  description?: string | null | undefined;
  accountId?: string | null | undefined;
}): RecordExpenseInput {
  return {
    eventId: input.eventId,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    entityType: "expense",
    entityId: input.expenseId,
    expenseId: input.expenseId,
    categoryId: input.categoryId ?? null,
    categoryName: input.categoryName ?? null,
    amountMinor: String(input.amountMinor),
    currency: input.currency ?? "IRR",
    paymentMethod: input.paymentMethod ?? "cash",
    expenseDate:
      typeof input.expenseDate === "string"
        ? input.expenseDate
        : input.expenseDate.toISOString(),
    description: input.description ?? null,
    accountId: input.accountId ?? null,
  };
}

export function mapTransferToAccountingRecord(input: {
  eventId: string;
  merchantId: string;
  fromStoreId: string;
  toStoreId: string;
  transferId: string;
  occurredAt: Date | string;
  remarks?: string | undefined;
  lines: readonly {
    productId: string;
    quantity: number;
    unitCode?: string | undefined;
    itemCode?: string | undefined;
  }[];
}): RecordTransferInput {
  return {
    eventId: input.eventId,
    merchantId: input.merchantId,
    storeId: input.fromStoreId,
    entityType: "stock_transfer",
    entityId: input.transferId,
    transferId: input.transferId,
    fromStoreId: input.fromStoreId,
    toStoreId: input.toStoreId,
    occurredAt:
      typeof input.occurredAt === "string"
        ? input.occurredAt
        : input.occurredAt.toISOString(),
    ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
    lines: input.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitCode: line.unitCode ?? "piece",
      ...(line.itemCode !== undefined ? { itemCode: line.itemCode } : {}),
    })),
  };
}
