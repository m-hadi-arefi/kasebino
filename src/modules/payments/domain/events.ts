import { createDomainEvent } from "../../../shared/ddd/index.js";
import type { PaymentStatus } from "./payment-intent.js";

export function paymentIntentCreatedEvent(input: {
  paymentId: string;
  merchantId: string;
  storeId: string;
  orderId: string;
  amountMinor: string;
  status: PaymentStatus;
  providerId: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "PaymentIntentCreated",
    aggregateId: input.paymentId,
    aggregateType: "PaymentIntent",
    payload: {
      paymentId: input.paymentId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      orderId: input.orderId,
      amountMinor: input.amountMinor,
      status: input.status,
      providerId: input.providerId,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function paymentSucceededEvent(input: {
  paymentId: string;
  merchantId: string;
  storeId: string;
  orderId: string;
  amountMinor: string;
  providerRef: string | null;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "PaymentSucceeded",
    aggregateId: input.paymentId,
    aggregateType: "PaymentIntent",
    payload: {
      paymentId: input.paymentId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      orderId: input.orderId,
      amountMinor: input.amountMinor,
      providerRef: input.providerRef,
      status: "succeeded" as const,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function paymentFailedEvent(input: {
  paymentId: string;
  merchantId: string;
  storeId: string;
  orderId: string;
  failureCode: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "PaymentFailed",
    aggregateId: input.paymentId,
    aggregateType: "PaymentIntent",
    payload: {
      paymentId: input.paymentId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      orderId: input.orderId,
      failureCode: input.failureCode,
      status: "failed" as const,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

export function paymentRefundedEvent(input: {
  paymentId: string;
  merchantId: string;
  storeId: string;
  orderId: string;
  amountMinor: string;
  occurredAt?: Date;
}) {
  return createDomainEvent({
    eventName: "PaymentRefunded",
    aggregateId: input.paymentId,
    aggregateType: "PaymentIntent",
    payload: {
      paymentId: input.paymentId,
      merchantId: input.merchantId,
      storeId: input.storeId,
      orderId: input.orderId,
      amountMinor: input.amountMinor,
      status: "refunded" as const,
    },
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}
