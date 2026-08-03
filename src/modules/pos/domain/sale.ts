/**
 * Sale aggregate + SaleLine (ADR-009 POS/Sales).
 * Tender recorded per ADR-091; money IRR minor units.
 */

import type { PosTenderType } from "../../../pos-sales/index.js";

export const SALE_STATUSES = ["completed", "canceled"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export type SaleLine = {
  readonly id: string;
  readonly productId: string;
  /** Snapshot Persian product name at sale time. */
  readonly productName: string;
  readonly quantity: number;
  /** Unit price IRR minor units (rial). */
  readonly unitPriceMinor: bigint;
  readonly lineTotalMinor: bigint;
};

export type Sale = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  membershipId: string | null;
  customerId: string | null;
  /** Iranian national mobile captured at checkout. */
  readonly phoneNational: string;
  readonly tenderType: PosTenderType;
  readonly lines: readonly SaleLine[];
  readonly totalAmountMinor: bigint;
  status: SaleStatus;
  readonly idempotencyKey: string;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateSaleLineInput = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: bigint;
};

export type CreateCompletedSaleInput = {
  id: string;
  merchantId: string;
  storeId: string;
  membershipId: string | null;
  customerId: string | null;
  phoneNational: string;
  tenderType: PosTenderType;
  lines: CreateSaleLineInput[];
  idempotencyKey: string;
  now?: Date;
};

export function buildSaleLine(input: CreateSaleLineInput): SaleLine {
  const lineTotalMinor =
    input.unitPriceMinor * BigInt(input.quantity);
  return {
    id: input.id,
    productId: input.productId,
    productName: input.productName,
    quantity: input.quantity,
    unitPriceMinor: input.unitPriceMinor,
    lineTotalMinor,
  };
}

export function createCompletedSaleAggregate(
  input: CreateCompletedSaleInput,
): Sale {
  const now = input.now ?? new Date();
  const lines = input.lines.map(buildSaleLine);
  const totalAmountMinor = lines.reduce(
    (sum, line) => sum + line.lineTotalMinor,
    0n,
  );

  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId,
    membershipId: input.membershipId,
    customerId: input.customerId,
    phoneNational: input.phoneNational,
    tenderType: input.tenderType,
    lines,
    totalAmountMinor,
    status: "completed",
    idempotencyKey: input.idempotencyKey,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function cancelSale(sale: Sale, at: Date = new Date()): void {
  sale.status = "canceled";
  sale.updatedAt = at;
}
