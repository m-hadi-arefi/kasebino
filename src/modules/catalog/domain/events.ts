import { createDomainEvent } from "../../../shared/ddd/index.js";

export function productCreatedEvent(input: {
  productId: string;
  merchantId: string;
  name: string;
  sku: string;
  barcode: string;
  priceAmountMinor: string;
  categoryId: string | null;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "ProductCreated",
    aggregateId: input.productId,
    aggregateType: "Product",
    payload: {
      productId: input.productId,
      merchantId: input.merchantId,
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      priceAmountMinor: input.priceAmountMinor,
      categoryId: input.categoryId,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function productUpdatedEvent(input: {
  productId: string;
  merchantId: string;
  name: string;
  sku: string;
  barcode: string;
  priceAmountMinor: string;
  categoryId: string | null;
  previousBarcode?: string | null;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "ProductUpdated",
    aggregateId: input.productId,
    aggregateType: "Product",
    payload: {
      productId: input.productId,
      merchantId: input.merchantId,
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      priceAmountMinor: input.priceAmountMinor,
      categoryId: input.categoryId,
      previousBarcode: input.previousBarcode ?? null,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function productDeletedEvent(input: {
  productId: string;
  merchantId: string;
  barcode?: string | null;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "ProductDeleted",
    aggregateId: input.productId,
    aggregateType: "Product",
    payload: {
      productId: input.productId,
      merchantId: input.merchantId,
      barcode: input.barcode ?? null,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
