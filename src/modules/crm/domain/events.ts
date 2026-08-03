import { createDomainEvent } from "../../../shared/ddd/index.js";
import type {
  ConsentSurface,
  MembershipSource,
} from "../../../crm-membership/index.js";

export function membershipCreatedEvent(input: {
  membershipId: string;
  merchantId: string;
  storeId: string;
  customerId: string;
  phoneNational: string;
  source: MembershipSource;
  consentSurface: ConsentSurface;
  consentVersion: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "MembershipCreated",
    aggregateId: input.membershipId,
    aggregateType: "StoreMembership",
    payload: {
      membershipId: input.membershipId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      customerId: input.customerId,
      phoneNational: input.phoneNational,
      source: input.source,
      consentSurface: input.consentSurface,
      consentVersion: input.consentVersion,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function membershipUpdatedEvent(input: {
  membershipId: string;
  merchantId: string;
  storeId: string;
  customerId: string;
  changedFields: string[];
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "MembershipUpdated",
    aggregateId: input.membershipId,
    aggregateType: "StoreMembership",
    payload: {
      membershipId: input.membershipId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      customerId: input.customerId,
      changedFields: input.changedFields,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
