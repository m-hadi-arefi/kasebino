import { createDomainEvent } from "../../../shared/ddd/index.js";
import type { OrderStatus } from "./order.js";

export function orderCreatedEvent(input: {
  orderId: string;
  merchantId: string;
  storeId: string;
  membershipId: string | null;
  customerId: string | null;
  totalAmountMinor: string;
  status: OrderStatus;
  fulfillmentMode: "pickup";
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "OrderCreated",
    aggregateId: input.orderId,
    aggregateType: "Order",
    payload: {
      orderId: input.orderId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      membershipId: input.membershipId,
      customerId: input.customerId,
      totalAmountMinor: input.totalAmountMinor,
      status: input.status,
      fulfillmentMode: input.fulfillmentMode,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export type OrderPaidLinePayload = {
  productId: string;
  productName: string;
  quantity: number;
  unitCode: string;
  unitPriceMinor: string;
  lineTotalMinor: string;
};

export function orderPaidEvent(input: {
  orderId: string;
  merchantId: string;
  storeId: string;
  membershipId?: string | null;
  customerId?: string | null;
  totalAmountMinor: string;
  paymentId?: string;
  /** ADR-137 — required for Sales Invoice line projection. */
  lines?: readonly OrderPaidLinePayload[];
  idempotencyKey?: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "OrderPaid",
    aggregateId: input.orderId,
    aggregateType: "Order",
    payload: {
      orderId: input.orderId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      ...(input.membershipId !== undefined ? { membershipId: input.membershipId } : {}),
      ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
      totalAmountMinor: input.totalAmountMinor,
      status: "paid" as const,
      ...(input.paymentId !== undefined ? { paymentId: input.paymentId } : {}),
      ...(input.lines !== undefined ? { lines: input.lines } : {}),
      ...(input.idempotencyKey !== undefined
        ? { idempotencyKey: input.idempotencyKey }
        : {}),
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function orderPreparingEvent(input: {
  orderId: string;
  merchantId: string;
  storeId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "OrderPreparing",
    aggregateId: input.orderId,
    aggregateType: "Order",
    payload: {
      orderId: input.orderId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      status: "preparing" as const,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function orderReadyForPickupEvent(input: {
  orderId: string;
  merchantId: string;
  storeId: string;
  membershipId?: string | null;
  customerId?: string | null;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "OrderReadyForPickup",
    aggregateId: input.orderId,
    aggregateType: "Order",
    payload: {
      orderId: input.orderId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      status: "ready_for_pickup" as const,
      membershipId: input.membershipId ?? null,
      customerId: input.customerId ?? null,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function orderPickedUpEvent(input: {
  orderId: string;
  merchantId: string;
  storeId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "OrderPickedUp",
    aggregateId: input.orderId,
    aggregateType: "Order",
    payload: {
      orderId: input.orderId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      status: "picked_up" as const,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function orderCompletedEvent(input: {
  orderId: string;
  merchantId: string;
  storeId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "OrderCompleted",
    aggregateId: input.orderId,
    aggregateType: "Order",
    payload: {
      orderId: input.orderId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      status: "completed" as const,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function orderCanceledEvent(input: {
  orderId: string;
  merchantId: string;
  storeId: string;
  previousStatus: OrderStatus;
  reason: string | null;
  auto: boolean;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "OrderCanceled",
    aggregateId: input.orderId,
    aggregateType: "Order",
    payload: {
      orderId: input.orderId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      previousStatus: input.previousStatus,
      reason: input.reason,
      auto: input.auto,
      status: "cancelled" as const,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function orderRefundedEvent(input: {
  orderId: string;
  merchantId: string;
  storeId: string;
  totalAmountMinor: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "OrderRefunded",
    aggregateId: input.orderId,
    aggregateType: "Order",
    payload: {
      orderId: input.orderId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      totalAmountMinor: input.totalAmountMinor,
      status: "refunded" as const,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
