import { createDomainEvent } from "../../../shared/ddd/index.js";
import type { PosTenderType } from "../../../pos-sales/index.js";

export function saleCreatedEvent(input: {
  saleId: string;
  merchantId: string;
  storeId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "SaleCreated",
    aggregateId: input.saleId,
    aggregateType: "Sale",
    payload: {
      saleId: input.saleId,
      merchantId: input.merchantId,
      storeId: input.storeId,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function saleCompletedEvent(input: {
  saleId: string;
  merchantId: string;
  storeId: string;
  membershipId: string | null;
  customerId: string | null;
  phoneNational: string;
  tenderType: PosTenderType;
  totalAmountMinor: string;
  lineCount: number;
  idempotencyKey: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "SaleCompleted",
    aggregateId: input.saleId,
    aggregateType: "Sale",
    payload: {
      saleId: input.saleId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      membershipId: input.membershipId,
      customerId: input.customerId,
      phoneNational: input.phoneNational,
      tenderType: input.tenderType,
      totalAmountMinor: input.totalAmountMinor,
      lineCount: input.lineCount,
      idempotencyKey: input.idempotencyKey,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function saleCanceledEvent(input: {
  saleId: string;
  merchantId: string;
  storeId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "SaleCanceled",
    aggregateId: input.saleId,
    aggregateType: "Sale",
    payload: {
      saleId: input.saleId,
      merchantId: input.merchantId,
      storeId: input.storeId,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
