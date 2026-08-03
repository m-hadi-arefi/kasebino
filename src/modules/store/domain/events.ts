import { createDomainEvent } from "../../../shared/ddd/index.js";

export function storeCreatedEvent(input: {
  storeId: string;
  merchantId: string;
  slug: string;
  displayName: string;
  latitude: number;
  longitude: number;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "StoreCreated",
    aggregateId: input.storeId,
    aggregateType: "Store",
    payload: {
      storeId: input.storeId,
      merchantId: input.merchantId,
      slug: input.slug,
      displayName: input.displayName,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function storeUpdatedEvent(input: {
  storeId: string;
  merchantId: string;
  changedFields: string[];
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "StoreUpdated",
    aggregateId: input.storeId,
    aggregateType: "Store",
    payload: {
      storeId: input.storeId,
      merchantId: input.merchantId,
      changedFields: input.changedFields,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
