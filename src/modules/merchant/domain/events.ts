import { createDomainEvent } from "../../../shared/ddd/index.js";

export function merchantCreatedEvent(input: {
  merchantId: string;
  name: string;
  slug: string;
  ownerUserId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "MerchantCreated",
    aggregateId: input.merchantId,
    aggregateType: "Merchant",
    payload: {
      merchantId: input.merchantId,
      name: input.name,
      slug: input.slug,
      ownerUserId: input.ownerUserId,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function merchantActivatedEvent(input: {
  merchantId: string;
  activatedAt: Date;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "MerchantActivated",
    aggregateId: input.merchantId,
    aggregateType: "Merchant",
    payload: {
      merchantId: input.merchantId,
      activatedAt: input.activatedAt.toISOString(),
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function merchantUpdatedEvent(input: {
  merchantId: string;
  changedFields: string[];
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "MerchantUpdated",
    aggregateId: input.merchantId,
    aggregateType: "Merchant",
    payload: {
      merchantId: input.merchantId,
      changedFields: input.changedFields,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function merchantSuspendedEvent(input: {
  merchantId: string;
  suspendedAt: Date;
  reason?: string | null;
  actorAdminUserId?: string | null;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "MerchantSuspended",
    aggregateId: input.merchantId,
    aggregateType: "Merchant",
    payload: {
      merchantId: input.merchantId,
      suspendedAt: input.suspendedAt.toISOString(),
      reason: input.reason ?? null,
      actorAdminUserId: input.actorAdminUserId ?? null,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
