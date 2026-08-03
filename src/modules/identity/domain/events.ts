import { createDomainEvent } from "../../../shared/ddd/index.js";

export function merchantLoggedInEvent(input: {
  authUserId: string;
  phoneE164: string;
  merchantId?: string | null;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "MerchantLoggedIn",
    aggregateId: input.authUserId,
    aggregateType: "AuthUser",
    payload: {
      authUserId: input.authUserId,
      phoneE164: input.phoneE164,
      merchantId: input.merchantId ?? null,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function merchantLoggedOutEvent(input: {
  authUserId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "MerchantLoggedOut",
    aggregateId: input.authUserId,
    aggregateType: "AuthUser",
    payload: { authUserId: input.authUserId },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
