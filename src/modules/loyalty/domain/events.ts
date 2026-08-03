import { createDomainEvent } from "../../../shared/ddd/index.js";

export function pointsEarnedEvent(input: {
  walletId: string;
  merchantId: string;
  storeId: string;
  storeMembershipId: string;
  customerId: string;
  points: number;
  balanceAfter: number;
  saleId?: string;
  orderId?: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "PointsEarned",
    aggregateId: input.walletId,
    aggregateType: "Wallet",
    payload: {
      walletId: input.walletId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      storeMembershipId: input.storeMembershipId,
      customerId: input.customerId,
      points: input.points,
      balanceAfter: input.balanceAfter,
      ...(input.saleId !== undefined ? { saleId: input.saleId } : {}),
      ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function pointsRedeemedEvent(input: {
  walletId: string;
  merchantId: string;
  storeId: string;
  storeMembershipId: string;
  customerId: string;
  points: number;
  balanceAfter: number;
  referenceId?: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "PointsRedeemed",
    aggregateId: input.walletId,
    aggregateType: "Wallet",
    payload: {
      walletId: input.walletId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      storeMembershipId: input.storeMembershipId,
      customerId: input.customerId,
      points: input.points,
      balanceAfter: input.balanceAfter,
      ...(input.referenceId !== undefined
        ? { referenceId: input.referenceId }
        : {}),
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function pointsExpiredEvent(input: {
  walletId: string;
  merchantId: string;
  storeId: string;
  storeMembershipId: string;
  customerId: string;
  points: number;
  balanceAfter: number;
  lastEarnAt: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "PointsExpired",
    aggregateId: input.walletId,
    aggregateType: "Wallet",
    payload: {
      walletId: input.walletId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      storeMembershipId: input.storeMembershipId,
      customerId: input.customerId,
      points: input.points,
      balanceAfter: input.balanceAfter,
      lastEarnAt: input.lastEarnAt,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
