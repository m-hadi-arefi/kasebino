/**
 * Provider-agnostic integration mappers (ADR-126 / ADR-130 / ADR-131).
 * These produce AccountingProvider DTOs — never ERPNext DocType shapes.
 */

import type {
  RecordPaymentInput,
  RecordSaleInput,
  SyncCustomerInput,
  SyncProductInput,
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
