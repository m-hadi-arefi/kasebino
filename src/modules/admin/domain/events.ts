import { createDomainEvent } from "../../../shared/ddd/index.js";
import type { AdminActionType } from "./admin-action.js";

export function adminActionRecordedEvent(input: {
  actionId: string;
  adminUserId: string;
  action: AdminActionType;
  merchantId: string | null;
  result: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "AdminActionRecorded",
    aggregateId: input.actionId,
    aggregateType: "AdminAction",
    payload: {
      actionId: input.actionId,
      adminUserId: input.adminUserId,
      action: input.action,
      merchantId: input.merchantId,
      result: input.result,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function adminMerchantActivatedEvent(input: {
  merchantId: string;
  adminUserId: string;
  previousStatus: string;
  activatedAt: Date;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "AdminMerchantActivated",
    aggregateId: input.merchantId,
    aggregateType: "Merchant",
    payload: {
      merchantId: input.merchantId,
      adminUserId: input.adminUserId,
      previousStatus: input.previousStatus,
      activatedAt: input.activatedAt.toISOString(),
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function adminMerchantSuspendedEvent(input: {
  merchantId: string;
  adminUserId: string;
  previousStatus: string;
  reason: string | null;
  suspendedAt: Date;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "AdminMerchantSuspended",
    aggregateId: input.merchantId,
    aggregateType: "Merchant",
    payload: {
      merchantId: input.merchantId,
      adminUserId: input.adminUserId,
      previousStatus: input.previousStatus,
      reason: input.reason,
      suspendedAt: input.suspendedAt.toISOString(),
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
