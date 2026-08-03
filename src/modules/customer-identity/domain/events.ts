import { createDomainEvent } from "../../../shared/ddd/index.js";

export function customerLoggedInEvent(input: {
  customerIdentityId: string;
  phoneE164: string;
  storeId?: string | null;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "CustomerLoggedIn",
    aggregateId: input.customerIdentityId,
    aggregateType: "CustomerIdentity",
    payload: {
      customerIdentityId: input.customerIdentityId,
      phoneE164: input.phoneE164,
      role: "customer" as const,
      storeId: input.storeId ?? null,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function customerLoggedOutEvent(input: {
  customerIdentityId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "CustomerLoggedOut",
    aggregateId: input.customerIdentityId,
    aggregateType: "CustomerIdentity",
    payload: {
      customerIdentityId: input.customerIdentityId,
      role: "customer" as const,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
