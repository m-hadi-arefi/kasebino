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

export function productDeletedEvent(input: {
  productId: string;
  merchantId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "ProductDeleted",
    aggregateId: input.productId,
    aggregateType: "Product",
    payload: {
      productId: input.productId,
      merchantId: input.merchantId,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
